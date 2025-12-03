using Azure.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure JSON to output dates in ISO 8601 UTC format
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

// Add DbContext with SQL Server
builder.Services.AddDbContext<CobraDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
    });
});

// Register application services
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<IChecklistService, ChecklistService>();
builder.Services.AddScoped<IChecklistItemService, ChecklistItemService>();
builder.Services.AddScoped<IItemLibraryService, ItemLibraryService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IEventCategoryService, EventCategoryService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IPositionService, PositionService>();

// Register chat services
builder.Services.Configure<GroupMeSettings>(
    builder.Configuration.GetSection(GroupMeSettings.SectionName));
builder.Services.AddHttpClient<IGroupMeApiClient, GroupMeApiClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<IChatHubService, ChatHubService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<ChatService>(); // Concrete type for internal use
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IExternalMessagingService, ExternalMessagingService>();

// Register system settings service
builder.Services.AddScoped<ISystemSettingsService, SystemSettingsService>();

// Add HTTP context accessor for service to access current user
builder.Services.AddHttpContextAccessor();

// Configure Feature Flags from appsettings.json
builder.Services.Configure<FeatureFlagsConfig>(
    builder.Configuration.GetSection(FeatureFlagsConfig.SectionName));

// CORS for frontend (allow localhost and Azure deployment)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173",
                  "https://localhost:5173",
                  "https://checklist-poc-app.azurewebsites.net"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Apply migrations on startup (POC only - remove for production)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<CobraDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("Applying database migrations...");
        context.Database.Migrate();
        logger.LogInformation("Database migrations applied successfully");

        // Seed default ICS positions for the default organization
        var defaultOrgId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var existingPositions = context.Positions.Count(p => p.OrganizationId == defaultOrgId && p.IsActive);
        if (existingPositions == 0)
        {
            logger.LogInformation("Seeding default ICS positions for organization {OrgId}...", defaultOrgId);

            var defaultLanguageId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var defaultPositions = new (string Name, string Description, string Icon, string Color, int Order)[]
            {
                ("Incident Commander", "Command staff coordination", "star", "#0020C2", 1),
                ("Operations Section Chief", "Operations section coordination", "cogs", "#E42217", 2),
                ("Planning Section Chief", "Planning section coordination", "clipboard-list", "#4CAF50", 3),
                ("Logistics Section Chief", "Logistics section coordination", "truck", "#FF9800", 4),
                ("Finance/Admin Section Chief", "Finance and administration coordination", "dollar-sign", "#9C27B0", 5),
                ("Safety Officer", "Safety officer coordination", "shield-halved", "#F44336", 6),
                ("Public Information Officer", "Public information coordination", "bullhorn", "#2196F3", 7),
                ("Liaison Officer", "Liaison officer coordination", "handshake", "#00BCD4", 8),
            };

            foreach (var (name, description, icon, color, order) in defaultPositions)
            {
                var positionId = Guid.NewGuid();
                context.Positions.Add(new Position
                {
                    Id = positionId,
                    OrganizationId = defaultOrgId,
                    SourceLanguageId = defaultLanguageId,
                    IsActive = true,
                    IconName = icon,
                    Color = color,
                    DisplayOrder = order,
                    CreatedBy = "system",
                    CreatedAt = DateTime.UtcNow,
                });
                context.PositionTranslations.Add(new PositionTranslation
                {
                    PositionId = positionId,
                    LanguageId = defaultLanguageId,
                    Name = name,
                    Description = description,
                });
            }
            context.SaveChanges();
            logger.LogInformation("Seeded {Count} default ICS positions", defaultPositions.Length);
        }
        else
        {
            logger.LogInformation("Organization {OrgId} already has {Count} positions, skipping seed", defaultOrgId, existingPositions);
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database");
        // Don't throw - let app start even if migrations fail
    }
}

// Global exception handler - returns full JSON errors for POC debugging
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var error = exceptionFeature?.Error;

        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(error, "Unhandled exception for request {Method} {Path}. Query: {Query}",
            context.Request.Method,
            context.Request.Path,
            context.Request.QueryString);

        // POC: Always return full error details for debugging
        // TODO: Remove detailed errors for production deployment
        await context.Response.WriteAsJsonAsync(new
        {
            message = error?.Message ?? "An error occurred processing your request.",
            exceptionType = error?.GetType().FullName,
            stackTrace = error?.StackTrace,
            innerException = error?.InnerException?.Message,
            innerExceptionType = error?.InnerException?.GetType().FullName,
            innerStackTrace = error?.InnerException?.StackTrace,
            path = context.Request.Path.ToString(),
            method = context.Request.Method,
            timestamp = DateTime.UtcNow
        });
    });
});

// Always enable Swagger and SwaggerUI
app.UseSwagger();
app.UseSwaggerUI();

// Enable HTTPS redirection
app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

// Mock authentication (POC only - replace with real auth in production)
app.UseMockUserContext();

app.UseAuthorization();

// Serve static files (React frontend in wwwroot)
app.UseStaticFiles();
app.UseDefaultFiles();

// Map API controllers first (these take precedence)
app.MapControllers();
app.MapHub<ChecklistHub>("/hubs/checklist");
app.MapHub<ChatHub>("/hubs/chat");

// Fallback to index.html for client-side routing (SPA)
// This catches all routes that don't match controllers/hubs above
app.MapFallbackToFile("index.html");

app.Run();
