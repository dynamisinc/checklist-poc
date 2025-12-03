using Cobra.Domain.Interfaces;

namespace Cobra.Domain.Entities;
/// <summary>
/// 
/// </summary>
public class Position : ISoftDeletableEntity, IUserModifiableEntity, IOrganizationDataEntity, ITranslatableEntity<PositionTranslation>
{
    public DateTime Created { get; set; }

    public User CreatedBy { get; set; } = default!;

    public Guid CreatedById { get; set; }

    public required Guid Id { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime Modified { get; set; }

    public User ModifiedBy { get; set; } = default!;

    public Guid ModifiedById { get; set; }

    public Organization Organization { get; set; } = default!;

    public required Guid OrganizationId { get; set; }

    public Language SourceLanguage { get; set; } = default!;

    public required Guid SourceLanguageId { get; set; }

    public ICollection<PositionTranslation> Translations { get; set; } = default!;
}
