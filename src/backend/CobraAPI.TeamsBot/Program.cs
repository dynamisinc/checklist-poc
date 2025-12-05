using Azure.Monitor.OpenTelemetry.AspNetCore;
using CobraAPI.TeamsBot.Bots;
using CobraAPI.TeamsBot.Middleware;
using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Storage;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Service name for telemetry
const string serviceName = "CobraTeamsBot";
var serviceVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0";

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "COBRA Teams Bot API", Version = "v1" });
});

// Configure OpenTelemetry (Microsoft recommended for Agents SDK)
// See: https://learn.microsoft.com/en-us/agent-framework/tutorials/agents/enable-observability
var appInsightsConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"]
    ?? Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");

var otelBuilder = builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: serviceName, serviceVersion: serviceVersion)
        .AddAttributes(new Dictionary<string, object>
        {
            ["deployment.environment"] = builder.Environment.EnvironmentName,
            ["service.instance.id"] = Environment.MachineName
        }));

// Check if verbose OpenTelemetry console output is wanted (set Telemetry:VerboseConsole=true)
var verboseOtelConsole = builder.Configuration.GetValue<bool>("Telemetry:VerboseConsole", false);

// Configure tracing
otelBuilder.WithTracing(tracing =>
{
    tracing
        .AddAspNetCoreInstrumentation(options =>
        {
            // Filter out health check noise
            options.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/api/health");
        })
        .AddHttpClientInstrumentation()
        .AddSource(serviceName); // Custom activity source for bot operations

    // Console exporter is very verbose - only enable if explicitly requested
    if (verboseOtelConsole)
    {
        tracing.AddConsoleExporter();
    }
});

// Configure metrics
otelBuilder.WithMetrics(metrics =>
{
    metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddMeter(serviceName); // Custom meter for bot metrics

    // Console exporter is very verbose - only enable if explicitly requested
    if (verboseOtelConsole)
    {
        metrics.AddConsoleExporter();
    }
});

// Add Application Insights if connection string is configured (for Azure deployments)
if (!string.IsNullOrEmpty(appInsightsConnectionString))
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
    {
        options.ConnectionString = appInsightsConnectionString;
    });
    Console.WriteLine($"Application Insights configured: {appInsightsConnectionString[..Math.Min(30, appInsightsConnectionString.Length)]}...");
}
else if (!builder.Environment.IsDevelopment())
{
    Console.WriteLine("WARNING: Application Insights not configured for production. Set ApplicationInsights:ConnectionString or APPLICATIONINSIGHTS_CONNECTION_STRING.");
}

// Configure logging
// In Development: Use standard console logging (clean, readable)
// In Production: Use OpenTelemetry logging (exports to Application Insights if configured)
if (builder.Environment.IsDevelopment())
{
    // Standard console logging for local development - clean and readable
    builder.Logging.AddConsole();
    builder.Logging.AddDebug();
    builder.Logging.SetMinimumLevel(LogLevel.Debug);

    // Optionally add OpenTelemetry console if verbose mode requested
    if (verboseOtelConsole)
    {
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
            logging.AddConsoleExporter();
        });
    }
}
else
{
    // Production: Use OpenTelemetry for structured logging to Application Insights
    builder.Logging.ClearProviders();
    builder.Logging.AddOpenTelemetry(logging =>
    {
        logging.IncludeFormattedMessage = true;
        logging.IncludeScopes = true;
    });
    builder.Logging.SetMinimumLevel(LogLevel.Information);
    builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
    builder.Logging.AddFilter("Microsoft.Agents", LogLevel.Warning);
}

// Register metrics service (singleton for app lifetime)
builder.Services.AddSingleton<IBotMetrics, BotMetrics>();

builder.Services.AddHttpClient();

// Configure Microsoft 365 Agents SDK
// Register the agent (replaces IBot registration)
builder.AddAgent<CobraTeamsBot>();

// Add authentication and authorization for Agents SDK
// For POC/Development: Using basic authentication setup
// For Production: Configure proper JWT token validation with Azure AD
builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        // Token validation will be configured for production via Azure AD
        // For POC, we allow requests to pass through
        options.RequireHttpsMetadata = false;
    });
builder.Services.AddAuthorization();

// Create the storage for conversation state
// For POC, use in-memory storage. For production, use Azure Blob Storage or CosmosDB
builder.Services.AddSingleton<IStorage, MemoryStorage>();

// Create Conversation State
builder.Services.AddSingleton<ConversationState>();

// Create User State
builder.Services.AddSingleton<UserState>();

// Register the conversation reference service
builder.Services.AddSingleton<IConversationReferenceService, ConversationReferenceService>();

// Register the conversation reference validator
builder.Services.AddSingleton<IConversationReferenceValidator, ConversationReferenceValidator>();

// Configure CobraAPI client for forwarding messages
builder.Services.Configure<CobraApiSettings>(builder.Configuration.GetSection("CobraApi"));
builder.Services.AddHttpClient<ICobraApiClient, CobraApiClient>();

// Configure Bot settings (display name, etc.)
builder.Services.Configure<BotSettings>(builder.Configuration.GetSection("Bot"));

// Configure CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.

// Add request logging middleware (before other middleware for accurate timing)
app.UseRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Map the bot messages endpoint using Agents SDK pattern
app.MapPost("/api/messages", async (
    HttpRequest request,
    HttpResponse response,
    IAgentHttpAdapter adapter,
    IAgent agent,
    CancellationToken cancellationToken) =>
{
    await adapter.ProcessAsync(request, response, agent, cancellationToken);
}).RequireAuthorization();

// Log startup information
var logger = app.Services.GetRequiredService<ILogger<Program>>();
var configuration = app.Services.GetRequiredService<IConfiguration>();
var appId = configuration["MicrosoftAppId"];
var cobraApiUrl = configuration["CobraApi:BaseUrl"];
var botDisplayName = configuration["Bot:DisplayName"] ?? "COBRA Bot";

logger.LogInformation("{BotName} v{Version} starting...", botDisplayName, serviceVersion);
logger.LogInformation("Environment: {Environment}", app.Environment.EnvironmentName);
logger.LogInformation("Bot App ID configured: {HasAppId}", !string.IsNullOrEmpty(appId));
logger.LogInformation("CobraAPI URL: {CobraApiUrl}", cobraApiUrl ?? "(not configured)");
logger.LogInformation("Application Insights: {AppInsightsConfigured}",
    !string.IsNullOrEmpty(appInsightsConnectionString) ? "Enabled" : "Disabled");
logger.LogInformation("OpenTelemetry tracing and metrics: Enabled");

app.Run();
