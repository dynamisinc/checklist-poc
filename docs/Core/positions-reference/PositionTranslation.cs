using Cobra.Domain.Interfaces;

namespace Cobra.Domain.Entities;

/// <summary>
/// 
/// </summary>
public class PositionTranslation : ITranslationEntity
{
    public string? Description { get; set; }

    public Position Position { get; set; } = default!;

    public required Guid PositionId { get; set; }

    public Language Language { get; set; } = default!;

    public required Guid LanguageId { get; set; }

    public required string Name { get; set; }
}
