using Azure.Identity;
using ChecklistAPI.Data;
using ChecklistAPI.Extensions;
using ChecklistAPI.Hubs;
using ChecklistAPI.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add Application Insights telemetry
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
});

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

// Add HTTP context accessor for service to access current user
builder.Services.AddHttpContextAccessor();

// CORS for frontend (allow both HTTP and HTTPS for local development)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
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

// Fallback to index.html for client-side routing (SPA)
// This catches all routes that don't match controllers/hubs above
app.MapFallbackToFile("index.html");

app.Run();
