namespace CobraAPI.TeamsBot.Models;

/// <summary>
/// Configuration settings for the COBRA Teams Bot.
/// </summary>
public class BotSettings
{
    /// <summary>
    /// Display name shown in welcome messages and bot responses.
    /// </summary>
    public string DisplayName { get; set; } = "COBRA Bot";

    /// <summary>
    /// Description of the bot's purpose.
    /// </summary>
    public string Description { get; set; } = "COBRA Incident Management Bot";
}
