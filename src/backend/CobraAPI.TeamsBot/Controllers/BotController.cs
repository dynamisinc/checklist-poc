using Microsoft.AspNetCore.Mvc;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Hosting.AspNetCore;

namespace CobraAPI.TeamsBot.Controllers;

/// <summary>
/// Controller for handling Bot Framework / Agents SDK messages.
/// This is an alternative entry point for incoming messages from Microsoft Teams and Bot Framework Emulator.
///
/// Note: The Agents SDK also supports minimal API routing via MapPost("/api/messages", ...) in Program.cs.
/// This controller is retained for backwards compatibility and additional routing flexibility.
/// </summary>
[Route("api/messages")]
[ApiController]
public class BotController : ControllerBase
{
    private readonly IAgentHttpAdapter _adapter;
    private readonly IAgent _agent;
    private readonly ILogger<BotController> _logger;

    /// <summary>
    /// Initializes a new instance of the BotController.
    /// </summary>
    /// <param name="adapter">The Agents SDK HTTP adapter.</param>
    /// <param name="agent">The agent implementation to handle activities.</param>
    /// <param name="logger">Logger for diagnostic information.</param>
    public BotController(
        IAgentHttpAdapter adapter,
        IAgent agent,
        ILogger<BotController> logger)
    {
        _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));
        _agent = agent ?? throw new ArgumentNullException(nameof(agent));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Handles incoming POST requests from Bot Framework and Microsoft Teams.
    /// All messages, reactions, and other activities come through this endpoint.
    /// </summary>
    /// <returns>A Task representing the asynchronous operation.</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task PostAsync(CancellationToken cancellationToken)
    {
        _logger.LogDebug("Received incoming Agents SDK activity via controller");

        // Delegate the processing of the HTTP POST to the adapter.
        // The adapter will invoke the agent.
        await _adapter.ProcessAsync(Request, Response, _agent, cancellationToken);
    }
}
