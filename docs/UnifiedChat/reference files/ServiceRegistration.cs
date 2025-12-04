using Cobra.Poc.Data;
using Cobra.Poc.ExternalMessaging;
using Cobra.Poc.Services;
using Microsoft.EntityFrameworkCore;

namespace Cobra.Poc;

/// <summary>
/// Extension methods for registering chat and external messaging services.
/// Add these to your Program.cs or Startup.cs.
/// </summary>
public static class ServiceRegistration
{
    /// <summary>
    /// Registers all chat and external messaging services.
    /// 
    /// Usage in Program.cs:
    /// <code>
    /// builder.Services.AddChatServices(builder.Configuration);
    /// </code>
    /// </summary>
    public static IServiceCollection AddChatServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Register GroupMe settings from configuration
        services.Configure<GroupMeSettings>(
            configuration.GetSection(GroupMeSettings.SectionName));

        // Register GroupMe API client with HttpClient
        services.AddHttpClient<IGroupMeApiClient, GroupMeApiClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // Register SignalR hub service
        services.AddScoped<IChatHubService, ChatHubService>();

        // Register application services
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IExternalMessagingService, ExternalMessagingService>();

        return services;
    }

    /// <summary>
    /// Configures SignalR for chat functionality.
    /// 
    /// Usage in Program.cs:
    /// <code>
    /// builder.Services.AddSignalR();
    /// // ... after app.Build() ...
    /// app.MapChatHub();
    /// </code>
    /// </summary>
    public static IEndpointRouteBuilder MapChatHub(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHub<ChatHub>("/hubs/chat");
        return endpoints;
    }
}

/// <summary>
/// Example Program.cs configuration showing how to wire up the chat services.
/// 
/// Copy relevant sections into your existing POC's Program.cs.
/// </summary>
public static class ProgramExample
{
    public static void ConfigureServicesExample(WebApplicationBuilder builder)
    {
        // =====================================================================
        // Add to your existing Program.cs
        // =====================================================================

        // 1. Add SignalR
        builder.Services.AddSignalR();

        // 2. Register chat services
        builder.Services.AddChatServices(builder.Configuration);

        // 3. Make sure your DbContext has the chat DbSets
        // If using a different DbContext name, register it appropriately
        // builder.Services.AddDbContext<PocDbContext>(options =>
        //     options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
    }

    public static void ConfigureAppExample(WebApplication app)
    {
        // =====================================================================
        // Add to your existing Program.cs after app = builder.Build()
        // =====================================================================

        // Map the SignalR hub
        app.MapChatHub();

        // Webhooks controller is auto-discovered via [ApiController]
    }
}
