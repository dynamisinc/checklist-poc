using CobraAPI.TeamsBot.Bots;
using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Connector.Authentication;

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

// Configure Bot Framework Authentication
// For POC, we support both authenticated (Azure) and unauthenticated (local emulator) modes
builder.Services.AddSingleton<BotFrameworkAuthentication, ConfigurationBotFrameworkAuthentication>();

// Create the Bot Framework Adapter with error handling
builder.Services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();

// Create the storage for conversation state
// For POC, use in-memory storage. For production, use Azure Blob Storage or CosmosDB
builder.Services.AddSingleton<IStorage, MemoryStorage>();

// Create Conversation State
builder.Services.AddSingleton<ConversationState>();

// Create User State
builder.Services.AddSingleton<UserState>();

// Register the conversation reference service
builder.Services.AddSingleton<IConversationReferenceService, ConversationReferenceService>();

// Configure CobraAPI client for forwarding messages
builder.Services.Configure<CobraApiSettings>(builder.Configuration.GetSection("CobraApi"));
builder.Services.AddHttpClient<ICobraApiClient, CobraApiClient>();

// Configure Bot settings (display name, etc.)
builder.Services.Configure<BotSettings>(builder.Configuration.GetSection("Bot"));

// Register the main bot
builder.Services.AddTransient<IBot, CobraTeamsBot>();

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
app.UseAuthorization();
app.MapControllers();

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
