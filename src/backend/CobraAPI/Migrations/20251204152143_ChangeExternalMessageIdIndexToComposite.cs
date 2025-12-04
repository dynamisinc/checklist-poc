using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobraAPI.Migrations
{
    /// <inheritdoc />
    public partial class ChangeExternalMessageIdIndexToComposite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_ExternalMessageId",
                table: "ChatMessages");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ExternalMessageId_ChatThreadId",
                table: "ChatMessages",
                columns: new[] { "ExternalMessageId", "ChatThreadId" },
                unique: true,
                filter: "[ExternalMessageId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_ExternalMessageId_ChatThreadId",
                table: "ChatMessages");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ExternalMessageId",
                table: "ChatMessages",
                column: "ExternalMessageId",
                unique: true,
                filter: "[ExternalMessageId] IS NOT NULL");
        }
    }
}
