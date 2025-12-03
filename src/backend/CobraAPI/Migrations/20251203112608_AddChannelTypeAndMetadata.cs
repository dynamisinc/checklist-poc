using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChecklistAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelTypeAndMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChannelType",
                table: "ChatThreads",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "ChatThreads",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ChatThreads",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "ChatThreads",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ExternalChannelMappingId",
                table: "ChatThreads",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconName",
                table: "ChatThreads",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_EventId_ChannelType",
                table: "ChatThreads",
                columns: new[] { "EventId", "ChannelType" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_EventId_DisplayOrder",
                table: "ChatThreads",
                columns: new[] { "EventId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_ExternalChannelMappingId",
                table: "ChatThreads",
                column: "ExternalChannelMappingId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatThreads_ExternalChannelMappings_ExternalChannelMappingId",
                table: "ChatThreads",
                column: "ExternalChannelMappingId",
                principalTable: "ExternalChannelMappings",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatThreads_ExternalChannelMappings_ExternalChannelMappingId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_EventId_ChannelType",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_EventId_DisplayOrder",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_ExternalChannelMappingId",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "ChannelType",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "ExternalChannelMappingId",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "IconName",
                table: "ChatThreads");
        }
    }
}
