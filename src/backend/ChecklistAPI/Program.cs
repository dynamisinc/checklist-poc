using Azure.Identity;
using ChecklistAPI.Data;
using ChecklistAPI.Extensions;
using ChecklistAPI.ExternalMessaging;
using ChecklistAPI.Hubs;
using ChecklistAPI.Models.Configuration;
using ChecklistAPI.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

// Add DbContext with SQL Server
builder.Services.AddDbContext<ChecklistDbContext>(options =>
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
builder.Services.AddScoped<IExternalMessagingService, ExternalMessagingService>();

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
        var context = services.GetRequiredService<ChecklistDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("Applying database migrations...");
        context.Database.Migrate();
        logger.LogInformation("Database migrations applied successfully");
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
