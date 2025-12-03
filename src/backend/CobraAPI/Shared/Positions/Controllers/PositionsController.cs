using Microsoft.AspNetCore.Mvc;
using CobraAPI.Shared.Positions.Models.DTOs;
using CobraAPI.Shared.Positions.Services;

namespace CobraAPI.Shared.Positions.Controllers;

/// <summary>
/// API controller for position management.
/// Positions represent roles within an organization (e.g., ICS positions).
/// </summary>
[ApiController]
[Route("api/positions")]
public class PositionsController : ControllerBase
{
    private readonly IPositionService _positionService;
    private readonly ILogger<PositionsController> _logger;

    public PositionsController(
        IPositionService positionService,
        ILogger<PositionsController> logger)
    {
        _positionService = positionService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all positions for the current organization.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ViewPositionDto>>> GetPositions()
    {
        var positions = await _positionService.GetPositionsAsync();
        return Ok(positions);
    }

    /// <summary>
    /// Gets a specific position by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ViewPositionDto>> GetPosition(Guid id)
    {
        var position = await _positionService.GetPositionAsync(id);
        if (position == null)
        {
            return NotFound("Position not found");
        }
        return Ok(position);
    }

    /// <summary>
    /// Creates a new position.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ViewPositionDto>> CreatePosition([FromBody] PositionDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Position name is required");
        }

        var id = await _positionService.CreatePositionAsync(request);
        var position = await _positionService.GetPositionAsync(id);

        return CreatedAtAction(nameof(GetPosition), new { id }, position);
    }

    /// <summary>
    /// Updates an existing position.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ViewPositionDto>> UpdatePosition(Guid id, [FromBody] PositionDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Position name is required");
        }

        try
        {
            await _positionService.UpdatePositionAsync(id, request);
            var position = await _positionService.GetPositionAsync(id);
            return Ok(position);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Position not found");
        }
    }

    /// <summary>
    /// Deletes a position (soft delete).
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeletePosition(Guid id)
    {
        try
        {
            await _positionService.DeletePositionAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Position not found");
        }
    }

    /// <summary>
    /// Seeds default ICS positions for an organization.
    /// This is typically called during organization setup.
    /// </summary>
    [HttpPost("seed-defaults")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ViewPositionDto>>> SeedDefaultPositions()
    {
        var userContext = HttpContext.Items["UserContext"] as UserContext;
        if (userContext == null)
        {
            return Unauthorized();
        }

        await _positionService.SeedDefaultPositionsAsync(userContext.OrganizationId, userContext.Email);
        var positions = await _positionService.GetPositionsAsync();

        _logger.LogInformation(
            "Seeded default positions for organization {OrganizationId}",
            userContext.OrganizationId);

        return Ok(positions);
    }
}
