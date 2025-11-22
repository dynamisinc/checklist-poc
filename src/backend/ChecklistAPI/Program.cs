using ChecklistAPI.Data;
using ChecklistAPI.Extensions;
using ChecklistAPI.Hubs;
using ChecklistAPI.Services;
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

// Add DbContext
builder.Services.AddDbContext<ChecklistDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// Always enable Swagger and SwaggerUI
app.UseSwagger();
app.UseSwaggerUI();

// Enable HTTPS redirection
app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

// Mock authentication (POC only - replace with real auth in production)
app.UseMockUserContext();

app.UseAuthorization();
app.MapControllers();
app.MapHub<ChecklistHub>("/hubs/checklist");

app.Run();
