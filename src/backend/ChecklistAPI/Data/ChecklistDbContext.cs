using Microsoft.EntityFrameworkCore;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Data;

public class ChecklistDbContext : DbContext
{
    public ChecklistDbContext(DbContextOptions<ChecklistDbContext> options) 
        : base(options)
    {
    }
    
    public DbSet<Template> Templates { get; set; }
    public DbSet<TemplateItem> TemplateItems { get; set; }
    public DbSet<ChecklistInstance> ChecklistInstances { get; set; }
    public DbSet<ChecklistItem> ChecklistItems { get; set; }
    public DbSet<OperationalPeriod> OperationalPeriods { get; set; }
    
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
        });
        
        // TemplateItem configuration
        modelBuilder.Entity<TemplateItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemText).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ItemType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.StatusConfiguration).HasColumnType("nvarchar(max)");

            entity.HasIndex(e => new { e.TemplateId, e.DisplayOrder });
        });
        
        // ChecklistInstance configuration
        modelBuilder.Entity<ChecklistInstance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EventId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ProgressPercentage).HasPrecision(5, 2);
            entity.HasMany(e => e.Items)
                .WithOne(e => e.ChecklistInstance)
                .HasForeignKey(e => e.ChecklistInstanceId)
                .OnDelete(DeleteBehavior.Cascade);

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
            entity.Property(e => e.StatusConfiguration).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.ChecklistInstanceId, e.DisplayOrder });
            entity.HasIndex(e => e.LastModifiedAt);
        });

        // OperationalPeriod configuration
        modelBuilder.Entity<OperationalPeriod>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EventId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.StartTime).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);

            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => new { e.EventId, e.IsCurrent });
            entity.HasIndex(e => e.IsArchived);
        });
    }
}
