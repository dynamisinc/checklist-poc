using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChecklistAPI.Migrations
{
    /// <inheritdoc />
    public partial class FixOperationalPeriodEventIdType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "OperationalPeriodId",
                table: "ChecklistInstances",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "OperationalPeriods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsCurrent = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    ArchivedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ArchivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationalPeriods", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistInstances_OperationalPeriodId",
                table: "ChecklistInstances",
                column: "OperationalPeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalPeriods_EventId",
                table: "OperationalPeriods",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalPeriods_EventId_IsCurrent",
                table: "OperationalPeriods",
                columns: new[] { "EventId", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationalPeriods_IsArchived",
                table: "OperationalPeriods",
                column: "IsArchived");

            migrationBuilder.AddForeignKey(
                name: "FK_ChecklistInstances_OperationalPeriods_OperationalPeriodId",
                table: "ChecklistInstances",
                column: "OperationalPeriodId",
                principalTable: "OperationalPeriods",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChecklistInstances_OperationalPeriods_OperationalPeriodId",
                table: "ChecklistInstances");

            migrationBuilder.DropTable(
                name: "OperationalPeriods");

            migrationBuilder.DropIndex(
                name: "IX_ChecklistInstances_OperationalPeriodId",
                table: "ChecklistInstances");

            migrationBuilder.AlterColumn<string>(
                name: "OperationalPeriodId",
                table: "ChecklistInstances",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
