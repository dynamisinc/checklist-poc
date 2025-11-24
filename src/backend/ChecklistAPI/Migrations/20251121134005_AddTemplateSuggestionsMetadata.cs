using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChecklistAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateSuggestionsMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EventCategories",
                table: "Templates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastUsedAt",
                table: "Templates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecommendedPositions",
                table: "Templates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UsageCount",
                table: "Templates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Templates_LastUsedAt",
                table: "Templates",
                column: "LastUsedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Templates_UsageCount",
                table: "Templates",
                column: "UsageCount");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Templates_LastUsedAt",
                table: "Templates");

            migrationBuilder.DropIndex(
                name: "IX_Templates_UsageCount",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "EventCategories",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "LastUsedAt",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "RecommendedPositions",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "UsageCount",
                table: "Templates");
        }
    }
}
