using Microsoft.AspNetCore.SignalR;

namespace ChecklistAPI.Hubs;

/// <summary>
/// SignalR hub for real-time checklist collaboration
/// </summary>
public class ChecklistHub : Hub
{
    private readonly ILogger<ChecklistHub> _logger;

    public ChecklistHub(ILogger<ChecklistHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Join a checklist-specific group to receive updates
    /// </summary>
    /// <param name="checklistId">Checklist ID to join</param>
    public async Task JoinChecklist(string checklistId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GetChecklistGroupName(checklistId));
        _logger.LogInformation(
            "Connection {ConnectionId} joined checklist {ChecklistId}",
            Context.ConnectionId,
            checklistId);
    }

    /// <summary>
    /// Leave a checklist-specific group
    /// </summary>
    /// <param name="checklistId">Checklist ID to leave</param>
    public async Task LeaveChecklist(string checklistId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetChecklistGroupName(checklistId));
        _logger.LogInformation(
            "Connection {ConnectionId} left checklist {ChecklistId}",
            Context.ConnectionId,
            checklistId);
    }

    /// <summary>
    /// Broadcast item completion change to all users viewing the checklist
    /// </summary>
    /// <param name="checklistId">Checklist ID</param>
    /// <param name="itemId">Item ID</param>
    /// <param name="isCompleted">New completion status</param>
    /// <param name="completedBy">User who completed the item</param>
    /// <param name="completedAt">Timestamp of completion</param>
    public async Task ItemCompletionChanged(
        string checklistId,
        string itemId,
        bool isCompleted,
        string completedBy,
        DateTime? completedAt)
    {
        await Clients.Group(GetChecklistGroupName(checklistId))
            .SendAsync("ItemCompletionChanged", new
            {
                checklistId,
                itemId,
                isCompleted,
                completedBy,
                completedAt
            });

        _logger.LogDebug(
            "Broadcasted item completion change: Checklist {ChecklistId}, Item {ItemId}, Completed: {IsCompleted}",
            checklistId,
            itemId,
            isCompleted);
    }

    /// <summary>
    /// Broadcast item status change to all users viewing the checklist
    /// </summary>
    /// <param name="checklistId">Checklist ID</param>
    /// <param name="itemId">Item ID</param>
    /// <param name="newStatus">New status value</param>
    /// <param name="changedBy">User who changed the status</param>
    /// <param name="changedAt">Timestamp of change</param>
    public async Task ItemStatusChanged(
        string checklistId,
        string itemId,
        string newStatus,
        string changedBy,
        DateTime changedAt)
    {
        await Clients.Group(GetChecklistGroupName(checklistId))
            .SendAsync("ItemStatusChanged", new
            {
                checklistId,
                itemId,
                newStatus,
                changedBy,
                changedAt
            });

        _logger.LogDebug(
            "Broadcasted item status change: Checklist {ChecklistId}, Item {ItemId}, Status: {NewStatus}",
            checklistId,
            itemId,
            newStatus);
    }

    /// <summary>
    /// Broadcast item notes change to all users viewing the checklist
    /// </summary>
    /// <param name="checklistId">Checklist ID</param>
    /// <param name="itemId">Item ID</param>
    /// <param name="notes">Updated notes</param>
    /// <param name="changedBy">User who changed the notes</param>
    /// <param name="changedAt">Timestamp of change</param>
    public async Task ItemNotesChanged(
        string checklistId,
        string itemId,
        string notes,
        string changedBy,
        DateTime changedAt)
    {
        await Clients.Group(GetChecklistGroupName(checklistId))
            .SendAsync("ItemNotesChanged", new
            {
                checklistId,
                itemId,
                notes,
                changedBy,
                changedAt
            });

        _logger.LogDebug(
            "Broadcasted item notes change: Checklist {ChecklistId}, Item {ItemId}",
            checklistId,
            itemId);
    }

    /// <summary>
    /// Broadcast checklist update (progress change, metadata change) to all users
    /// </summary>
    /// <param name="checklistId">Checklist ID</param>
    /// <param name="progressPercentage">New progress percentage</param>
    public async Task ChecklistUpdated(string checklistId, int progressPercentage)
    {
        await Clients.Group(GetChecklistGroupName(checklistId))
            .SendAsync("ChecklistUpdated", new
            {
                checklistId,
                progressPercentage
            });

        _logger.LogDebug(
            "Broadcasted checklist update: Checklist {ChecklistId}, Progress: {ProgressPercentage}%",
            checklistId,
            progressPercentage);
    }

    /// <summary>
    /// Handle client disconnection
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "Connection {ConnectionId} disconnected. Exception: {Exception}",
            Context.ConnectionId,
            exception?.Message ?? "None");

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Get the SignalR group name for a checklist
    /// </summary>
    private static string GetChecklistGroupName(string checklistId) => $"checklist-{checklistId}";
}
