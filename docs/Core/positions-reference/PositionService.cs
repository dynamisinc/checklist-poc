using AutoMapper;
using Azure.Core.GeoJson;
using Cobra.Application.Common.Exceptions;
using Cobra.Application.Common.Interfaces;
using Cobra.Application.Common.Models;
using Cobra.Application.Common.Validators;
using Cobra.Domain.Common;
using Cobra.Domain.Entities;
using Cobra.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cobra.Application.Services;



public class PositionService : BaseService, IPositionService
{
    readonly IMapper _mapper;


    public PositionService(IOptionsSnapshot<CobraConfigurationSettings> cobraSettingsSnapshot, IUserContextService userContextService, IFilteredDbContextService filteredContextService, IMapper mapper)
        : base(cobraSettingsSnapshot, userContextService, filteredContextService)
    {
        _mapper = mapper;
    }


    public IQueryable<ViewPositionDto> GetPositionDtoQueryable()
    {
        var withTranslations = _dbContext.Positions.Select(pos => new
        {
            DesiredTranslation = pos.Translations.SingleOrDefault(ett => ett.LanguageId == CurrentUserContext.LanguageId),
            SourceTranslation = pos.Translations.SingleOrDefault(ett => ett.LanguageId == pos.SourceLanguageId),
            Id = pos.Id,
            OrganizationId = pos.OrganizationId,
        });

        return withTranslations.Select(pos => new ViewPositionDto
        {
            Name = pos.DesiredTranslation != null && pos.DesiredTranslation.Name != null ? pos.DesiredTranslation.Name : pos.SourceTranslation!.Name,
            Id = pos.Id
        }).OrderBy(p => p.Name);
    }

    public async Task<List<ViewPositionDto>> GetPositions()
    {
        return await GetPositionDtoQueryable().ToListAsync();
    }


    public async Task<ViewPositionDto> GetPosition(Guid id)
    {
        var dto = await GetPositionDtoQueryable().SingleOrDefaultAsync(p => p.Id == id);
        if (dto == null)
        {
            throw new NotFoundException();
        }
        return dto;
    }

    public async Task<List<ViewPositionDto>> GetPositions(List<Guid> ids)
    {
        return await GetPositionDtoQueryable().Where(p => ids.Contains(p.Id)).ToListAsync();
    }

    public async Task<Guid> CreatePosition(PositionDto newPosition)
    {
        PositionValidator validator = new PositionValidator();
        validator.ValidateAndThrow(newPosition);

        Guid positionToCreateGuid = Guid.NewGuid();

        Position positionToCreate = new()
        {
            Id = positionToCreateGuid,
            IsActive = true,
            OrganizationId = CurrentUserContext.OrganizationId!.Value,
            SourceLanguageId = CurrentUserContext.LanguageId
        };

        _dbContext.Positions.Add(positionToCreate);
        _dbContext.Add(new PositionTranslation
        {
            LanguageId = CurrentUserContext.LanguageId,
            Name = newPosition.Name,
            Description = newPosition.Description,
            PositionId = positionToCreateGuid,
        });

        await _dbContext.SaveChangesAsync(Domain.Entities.Action.PositionCreated, positionToCreateGuid, CurrentUserContext.LanguageId, newPosition.Name);

        return positionToCreateGuid;
    }

    private async Task<Position> EnsurePosition(Guid id)
    {
        var foundPosition = await _dbContext.Positions.SingleOrDefaultAsync(po => po.Id == id);
        if (foundPosition == null)
        {
            throw new NotFoundException();
        }
        return foundPosition;
    }

    public async Task EditPosition(Guid id, PositionDto positionDto)
    {
        var position = await EnsurePosition(id);

        var originalName = position.Translations.FirstOrDefault(ect => ect.LanguageId == CurrentUserContext.LanguageId)?.Name ?? string.Empty;

        var existingLanguageTranslation = position.Translations.FirstOrDefault(ect => ect.LanguageId == CurrentUserContext.LanguageId);
        if (existingLanguageTranslation != null)
        {
            existingLanguageTranslation.Name = positionDto.Name;
            existingLanguageTranslation.Description = positionDto.Description;
        }
        else
        {
            _dbContext.Add(new PositionTranslation
            {
                PositionId = position.Id,
                Name = positionDto.Name,
                Description = positionDto.Description,
                LanguageId = CurrentUserContext.LanguageId
            });
        }

        EnsurePrimaryEntityUpdate(position);
        await _dbContext.SaveChangesAsync(Domain.Entities.Action.PositionEdited, id, position.SourceLanguageId, positionDto.Name);
    }

    public async Task DeletePosition(Guid id)
    {
        var position = await EnsurePosition(id);

        position.IsActive = false; // Soft delete

        PositionTranslation? translation;
        if (position.Translations.Any(wt => wt.LanguageId == CurrentUserContext.LanguageId))
        {
            translation = position.Translations.FirstOrDefault(wt => wt.LanguageId == CurrentUserContext.LanguageId);
        }
        else
        {
            translation = position.Translations.FirstOrDefault(wt => wt.LanguageId == position.SourceLanguageId);
        }

        await _dbContext.SaveChangesAsync(Domain.Entities.Action.PositionDeleted, id, position.SourceLanguageId, translation?.Name);

    }
}