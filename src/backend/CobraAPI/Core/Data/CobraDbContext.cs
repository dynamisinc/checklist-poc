using Microsoft.EntityFrameworkCore;

namespace CobraAPI.Core.Data;

public class CobraDbContext : DbContext
{
    public CobraDbContext(DbContextOptions<CobraDbContext> options) 
        : base(options)
    {
    }
    
    public DbSet<Template> Templates { get; set; }
    public DbSet<TemplateItem> TemplateItems { get; set; }
    public DbSet<ChecklistInstance> ChecklistInstances { get; set; }
    public DbSet<ChecklistItem> ChecklistItems { get; set; }
    public DbSet<OperationalPeriod> OperationalPeriods { get; set; }
    public DbSet<ItemLibraryEntry> ItemLibraryEntries { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<EventCategory> EventCategories { get; set; }
    public DbSet<FeatureFlagOverride> FeatureFlagOverrides { get; set; }

    // Chat entities
    public DbSet<ChatThread> ChatThreads { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<ExternalChannelMapping> ExternalChannelMappings { get; set; }

    // System configuration
    public DbSet<SystemSetting> SystemSettings { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Template configuration
        modelBuilder.Entity<Template>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.HasMany(e => e.Items)
                .WithOne(e => e.Template)
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => new { e.IsActive, e.IsArchived });
            entity.HasIndex(e => e.UsageCount); // For sorting by popularity in suggestions
            entity.HasIndex(e => e.LastUsedAt); // For recent template suggestions
        });
        
        // TemplateItem configuration
        modelBuilder.Entity<TemplateItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemText).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ItemType).IsRequired().HasMaxLength(20);

            // Only configure column type for relational databases (not in-memory)
            if (Database.IsRelational())
            {
                entity.Property(e => e.StatusConfiguration).HasColumnType("nvarchar(max)");
            }

            entity.HasIndex(e => new { e.TemplateId, e.DisplayOrder });
        });
        
        // ChecklistInstance configuration
        modelBuilder.Entity<ChecklistInstance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EventName).HasMaxLength(200);
            entity.Property(e => e.ProgressPercentage).HasPrecision(5, 2);
            entity.HasMany(e => e.Items)
                .WithOne(e => e.ChecklistInstance)
                .HasForeignKey(e => e.ChecklistInstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            // FK to Event - Restrict delete (don't delete checklists when event is deleted)
            entity.HasOne(e => e.Event)
                .WithMany()
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Restrict);

            // Optional FK to OperationalPeriod - SET NULL on delete (checklists survive period deletion)
            entity.HasOne(e => e.OperationalPeriod)
                .WithMany(op => op.Checklists)
                .HasForeignKey(e => e.OperationalPeriodId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => e.OperationalPeriodId);
            entity.HasIndex(e => e.IsArchived);
        });
        
        // ChecklistItem configuration
        modelBuilder.Entity<ChecklistItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemText).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ItemType).IsRequired().HasMaxLength(20);

            // Only configure column type for relational databases (not in-memory)
            if (Database.IsRelational())
            {
                entity.Property(e => e.StatusConfiguration).HasColumnType("nvarchar(max)");
            }

            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.ChecklistInstanceId, e.DisplayOrder });
            entity.HasIndex(e => e.LastModifiedAt);
        });

        // OperationalPeriod configuration
        modelBuilder.Entity<OperationalPeriod>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.StartTime).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);

            // FK to Event - Cascade delete (periods deleted with event)
            entity.HasOne(e => e.Event)
                .WithMany()
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => new { e.EventId, e.IsCurrent });
            entity.HasIndex(e => e.IsArchived);
        });

        // ItemLibraryEntry configuration
        modelBuilder.Entity<ItemLibraryEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemText).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ItemType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(200);

            // Only configure column types for relational databases
            if (Database.IsRelational())
            {
                entity.Property(e => e.StatusConfiguration).HasColumnType("nvarchar(max)");
                entity.Property(e => e.AllowedPositions).HasColumnType("nvarchar(max)");
                entity.Property(e => e.DefaultNotes).HasColumnType("nvarchar(max)");
                entity.Property(e => e.Tags).HasColumnType("nvarchar(max)");
            }

            // Indexes for search and filtering
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.ItemType);
            entity.HasIndex(e => e.IsArchived);
            entity.HasIndex(e => e.UsageCount); // For sorting by popularity
        });

        // EventCategory configuration
        modelBuilder.Entity<EventCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.SubGroup).IsRequired().HasMaxLength(50);
            entity.Property(e => e.IconName).HasMaxLength(50);

            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => new { e.EventType, e.DisplayOrder });
            entity.HasIndex(e => e.IsActive);
        });

        // Event configuration
        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(200);

            // Only configure column type for relational databases
            if (Database.IsRelational())
            {
                entity.Property(e => e.AdditionalCategoryIds).HasColumnType("nvarchar(max)");
            }

            // FK to EventCategory
            entity.HasOne(e => e.PrimaryCategory)
                .WithMany()
                .HasForeignKey(e => e.PrimaryCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsArchived);
            entity.HasIndex(e => e.PrimaryCategoryId);
        });

        // FeatureFlagOverride configuration
        modelBuilder.Entity<FeatureFlagOverride>(entity =>
        {
            entity.HasKey(e => e.FlagName);
            entity.Property(e => e.FlagName).IsRequired().HasMaxLength(50);
            entity.Property(e => e.State).IsRequired().HasMaxLength(20);
            entity.Property(e => e.ModifiedBy).HasMaxLength(200);
        });

        // ChatThread (Channel) configuration
        modelBuilder.Entity<ChatThread>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ChannelType).IsRequired().HasConversion<int>();
            entity.Property(e => e.IconName).HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(200);

            entity.HasOne(e => e.Event)
                .WithMany()
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            // Optional FK to ExternalChannelMapping for External channels
            // Use NoAction to avoid multiple cascade paths (Event cascades to both ChatThread and ExternalChannelMapping)
            entity.HasOne(e => e.ExternalChannelMapping)
                .WithMany()
                .HasForeignKey(e => e.ExternalChannelMappingId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => new { e.EventId, e.IsDefaultEventThread });
            entity.HasIndex(e => new { e.EventId, e.ChannelType });
            entity.HasIndex(e => new { e.EventId, e.DisplayOrder });
        });

        // ChatMessage configuration
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).IsRequired();
            entity.Property(e => e.SenderDisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(200);

            entity.HasOne(e => e.ChatThread)
                .WithMany(t => t.Messages)
                .HasForeignKey(e => e.ChatThreadId)
                .OnDelete(DeleteBehavior.Cascade);

            // External messaging fields
            entity.Property(e => e.ExternalSource).HasConversion<int?>();
            entity.Property(e => e.ExternalMessageId).HasMaxLength(100);
            entity.Property(e => e.ExternalSenderName).HasMaxLength(100);
            entity.Property(e => e.ExternalSenderId).HasMaxLength(100);
            entity.Property(e => e.ExternalAttachmentUrl).HasMaxLength(1000);

            entity.HasOne(e => e.ExternalChannelMapping)
                .WithMany()
                .HasForeignKey(e => e.ExternalChannelMappingId)
                .OnDelete(DeleteBehavior.NoAction);

            // Indexes
            entity.HasIndex(e => e.ChatThreadId);
            entity.HasIndex(e => e.CreatedAt);

            // Unique index for deduplication of external messages
            entity.HasIndex(e => e.ExternalMessageId)
                .HasFilter("[ExternalMessageId] IS NOT NULL")
                .IsUnique();

            entity.HasIndex(e => e.ExternalChannelMappingId)
                .HasFilter("[ExternalChannelMappingId] IS NOT NULL");
        });

        // ExternalChannelMapping configuration
        modelBuilder.Entity<ExternalChannelMapping>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasConversion<int>();
            entity.Property(e => e.ExternalGroupId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExternalGroupName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.BotId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.WebhookSecret).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ShareUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(200);

            entity.HasOne(e => e.Event)
                .WithMany()
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => new { e.Platform, e.ExternalGroupId }).IsUnique();
            entity.HasIndex(e => e.IsActive).HasFilter("[IsActive] = 1");
        });

        // SystemSetting configuration
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Value).IsRequired();
            entity.Property(e => e.Category).IsRequired().HasConversion<int>();
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ModifiedBy).IsRequired().HasMaxLength(200);

            // Unique key for settings
            entity.HasIndex(e => e.Key).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => new { e.Category, e.SortOrder });
        });
    }
}
