using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobraAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionNameToChannels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_EventId_ChannelType_PositionName",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "PositionName",
                table: "ChatThreads");
        }
    }
}
