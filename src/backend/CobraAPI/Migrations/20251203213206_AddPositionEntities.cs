using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobraAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_EventId_ChannelType_PositionName",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "PositionName",
                table: "ChatThreads");

            migrationBuilder.AddColumn<Guid>(
                name: "PositionId",
                table: "ChatThreads",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Positions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceLanguageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IconName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Positions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PositionTranslations",
                columns: table => new
                {
                    PositionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LanguageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PositionTranslations", x => new { x.PositionId, x.LanguageId });
                    table.ForeignKey(
                        name: "FK_PositionTranslations_Positions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "Positions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_EventId_PositionId",
                table: "ChatThreads",
                columns: new[] { "EventId", "PositionId" },
                filter: "[PositionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_PositionId",
                table: "ChatThreads",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_Positions_OrganizationId",
                table: "Positions",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Positions_OrganizationId_DisplayOrder",
                table: "Positions",
                columns: new[] { "OrganizationId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Positions_OrganizationId_IsActive",
                table: "Positions",
                columns: new[] { "OrganizationId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PositionTranslations_LanguageId",
                table: "PositionTranslations",
                column: "LanguageId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatThreads_Positions_PositionId",
                table: "ChatThreads",
                column: "PositionId",
                principalTable: "Positions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatThreads_Positions_PositionId",
                table: "ChatThreads");

            migrationBuilder.DropTable(
                name: "PositionTranslations");

            migrationBuilder.DropTable(
                name: "Positions");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_EventId_PositionId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_PositionId",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "PositionId",
                table: "ChatThreads");

            migrationBuilder.AddColumn<string>(
                name: "PositionName",
                table: "ChatThreads",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_EventId_ChannelType_PositionName",
                table: "ChatThreads",
                columns: new[] { "EventId", "ChannelType", "PositionName" },
                filter: "[ChannelType] = 3");
        }
    }
}
