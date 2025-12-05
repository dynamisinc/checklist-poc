using CobraAPI.TeamsBot.Bots;
using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Storage;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "COBRA Teams Bot API", Version = "v1" });
});

// Configure logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});

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
logger.LogInformation("{BotName} starting...", botDisplayName);
logger.LogInformation("Bot App ID configured: {HasAppId}", !string.IsNullOrEmpty(appId));
logger.LogInformation("CobraAPI URL: {CobraApiUrl}", cobraApiUrl ?? "(not configured)");
logger.LogInformation("Environment: {Environment}", app.Environment.EnvironmentName);

app.Run();
