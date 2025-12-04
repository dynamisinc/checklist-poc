using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobraAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamsStatelessFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConversationReferenceJson",
                table: "ExternalChannelMappings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstalledByName",
                table: "ExternalChannelMappings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEmulator",
                table: "ExternalChannelMappings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "ExternalChannelMappings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "ExternalChannelMappings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalChannelMappings_LastActivityAt",
                table: "ExternalChannelMappings",
                column: "LastActivityAt",
                filter: "[Platform] = 3");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalChannelMappings_TenantId",
                table: "ExternalChannelMappings",
                column: "TenantId",
                filter: "[TenantId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExternalChannelMappings_LastActivityAt",
                table: "ExternalChannelMappings");

            migrationBuilder.DropIndex(
                name: "IX_ExternalChannelMappings_TenantId",
                table: "ExternalChannelMappings");

            migrationBuilder.DropColumn(
                name: "ConversationReferenceJson",
                table: "ExternalChannelMappings");

            migrationBuilder.DropColumn(
                name: "InstalledByName",
                table: "ExternalChannelMappings");

            migrationBuilder.DropColumn(
                name: "IsEmulator",
                table: "ExternalChannelMappings");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "ExternalChannelMappings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExternalChannelMappings");
        }
    }
}
