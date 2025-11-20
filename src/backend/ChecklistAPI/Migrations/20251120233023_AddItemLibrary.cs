using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChecklistAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddItemLibrary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemLibraryEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ItemType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StatusConfiguration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AllowedPositions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRequiredByDefault = table.Column<bool>(type: "bit", nullable: false),
                    UsageCount = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    ArchivedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ArchivedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemLibraryEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItemLibraryEntries_Category",
                table: "ItemLibraryEntries",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_ItemLibraryEntries_IsArchived",
                table: "ItemLibraryEntries",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_ItemLibraryEntries_ItemType",
                table: "ItemLibraryEntries",
                column: "ItemType");

            migrationBuilder.CreateIndex(
                name: "IX_ItemLibraryEntries_UsageCount",
                table: "ItemLibraryEntries",
                column: "UsageCount");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemLibraryEntries");
        }
    }
}
