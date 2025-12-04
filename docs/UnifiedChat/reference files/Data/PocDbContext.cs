using Cobra.Poc.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cobra.Poc.Data;

/// <summary>
/// POC Database Context.
/// Add DbSets for chat entities to your existing POC DbContext.
/// </summary>
public class PocDbContext : DbContext
{
    public PocDbContext(DbContextOptions<PocDbContext> options) : base(options)
    {
    }

    // Existing POC entities (adjust to match your actual POC)
    public DbSet<Event> Events => Set<Event>();
    public DbSet<User> Users => Set<User>();

    // Chat entities
    public DbSet<ChatThread> ChatThreads => Set<ChatThread>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ExternalChannelMapping> ExternalChannelMappings => Set<ExternalChannelMapping>();
    public DbSet<LogbookEntry> LogbookEntries => Set<LogbookEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        modelBuilder.ApplyConfiguration(new ChatThreadConfiguration());
        modelBuilder.ApplyConfiguration(new ChatMessageConfiguration());
        modelBuilder.ApplyConfiguration(new ExternalChannelMappingConfiguration());
        modelBuilder.ApplyConfiguration(new LogbookEntryConfiguration());
    }
}

/// <summary>
/// EF Core configuration for ChatThread entity.
/// </summary>
public class ChatThreadConfiguration : IEntityTypeConfiguration<ChatThread>
{
    public void Configure(EntityTypeBuilder<ChatThread> builder)
    {
        builder.ToTable("ChatThreads");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.HasOne(e => e.Event)
            .WithMany()
            .HasForeignKey(e => e.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ModifiedBy)
            .WithMany()
            .HasForeignKey(e => e.ModifiedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Index for finding default thread by event
        builder.HasIndex(e => new { e.EventId, e.IsDefaultEventThread })
            .HasDatabaseName("IX_ChatThreads_EventId_IsDefault");
    }
}

/// <summary>
/// EF Core configuration for ChatMessage entity.
/// </summary>
public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("ChatMessages");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Message)
            .IsRequired();

        // Relationships
        builder.HasOne(e => e.ChatThread)
            .WithMany(t => t.Messages)
            .HasForeignKey(e => e.ChatThreadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ModifiedBy)
            .WithMany()
            .HasForeignKey(e => e.ModifiedById)
            .OnDelete(DeleteBehavior.Restrict);

        // External messaging fields
        builder.Property(e => e.ExternalSource)
            .HasConversion<int?>();

        builder.Property(e => e.ExternalMessageId)
            .HasMaxLength(100);

        builder.Property(e => e.ExternalSenderName)
            .HasMaxLength(100);

        builder.Property(e => e.ExternalSenderId)
            .HasMaxLength(100);

        builder.Property(e => e.ExternalAttachmentUrl)
            .HasMaxLength(1000);

        builder.HasOne(e => e.ExternalChannelMapping)
            .WithMany()
            .HasForeignKey(e => e.ExternalChannelMappingId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(e => e.ChatThreadId)
            .HasDatabaseName("IX_ChatMessages_ChatThreadId");

        builder.HasIndex(e => e.Created)
            .HasDatabaseName("IX_ChatMessages_Created");

        // Unique index for deduplication of external messages
        builder.HasIndex(e => e.ExternalMessageId)
            .HasDatabaseName("IX_ChatMessages_ExternalMessageId")
            .HasFilter("[ExternalMessageId] IS NOT NULL")
            .IsUnique();

        builder.HasIndex(e => e.ExternalChannelMappingId)
            .HasDatabaseName("IX_ChatMessages_ExternalChannelMappingId")
            .HasFilter("[ExternalChannelMappingId] IS NOT NULL");
    }
}

/// <summary>
/// EF Core configuration for ExternalChannelMapping entity.
/// </summary>
public class ExternalChannelMappingConfiguration : IEntityTypeConfiguration<ExternalChannelMapping>
{
    public void Configure(EntityTypeBuilder<ExternalChannelMapping> builder)
    {
        builder.ToTable("ExternalChannelMappings");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Platform)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(e => e.ExternalGroupId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.ExternalGroupName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.BotId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.WebhookSecret)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.ShareUrl)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(e => e.Event)
            .WithMany()
            .HasForeignKey(e => e.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ModifiedBy)
            .WithMany()
            .HasForeignKey(e => e.ModifiedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(e => e.EventId)
            .HasDatabaseName("IX_ExternalChannelMappings_EventId");

        builder.HasIndex(e => new { e.Platform, e.ExternalGroupId })
            .HasDatabaseName("IX_ExternalChannelMappings_Platform_ExternalGroupId")
            .IsUnique();

        builder.HasIndex(e => e.IsActive)
            .HasDatabaseName("IX_ExternalChannelMappings_IsActive")
            .HasFilter("[IsActive] = 1");
    }
}

/// <summary>
/// EF Core configuration for LogbookEntry entity.
/// Simplified for POC.
/// </summary>
public class LogbookEntryConfiguration : IEntityTypeConfiguration<LogbookEntry>
{
    public void Configure(EntityTypeBuilder<LogbookEntry> builder)
    {
        builder.ToTable("LogbookEntries");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Content)
            .IsRequired();

        builder.HasIndex(e => e.EventId)
            .HasDatabaseName("IX_LogbookEntries_EventId");
    }
}
