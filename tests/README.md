# Checklist POC - Testing

This directory contains all automated tests for the Checklist POC application.

## Directory Structure

```
tests/
├── integration/              # Integration tests (API endpoint testing)
│   ├── test-templates-api.ps1           # Templates API integration tests
│   └── test-templates-api-README.md     # Documentation for test script
│
├── unit/                     # Unit tests (planned)
│   ├── backend/             # C# unit tests (xUnit)
│   └── frontend/            # TypeScript unit tests (Vitest)
│
└── e2e/                      # End-to-end tests (planned)
    └── playwright/          # Playwright E2E tests
```

## Integration Tests

Located in `integration/` folder.

### Templates API Tests

**Script:** `integration/test-templates-api.ps1`

**What it tests:**
- ✅ GET /api/templates - Get all templates
- ✅ GET /api/templates/{id} - Get single template
- ✅ GET /api/templates/category/{category} - Filter by category
- ✅ POST /api/templates - Create template
- ✅ PUT /api/templates/{id} - Update template
- ✅ POST /api/templates/{id}/duplicate - Duplicate template
- ✅ DELETE /api/templates/{id} - Archive template (soft delete)
- ✅ GET /api/templates/archived - Get archived templates (Admin only)
- ✅ POST /api/templates/{id}/restore - Restore archived template (Admin only)
- ✅ DELETE /api/templates/{id}/permanent - Permanent delete (Admin only)

**Run:**
```powershell
cd tests/integration
.\test-templates-api.ps1

# With verbose output
.\test-templates-api.ps1 -Verbose

# Different URL
.\test-templates-api.ps1 -BaseUrl "https://localhost:5001"
```

**Prerequisites:**
- Backend API running on https://localhost:5001
- Seed data loaded (3 templates)

**Expected:** ~40-50 tests passing with 100% pass rate

## Unit Tests (Planned)

### Backend Unit Tests
- Framework: xUnit
- Location: `unit/backend/`
- Coverage target: 80%+

**Run:**
```bash
cd src/backend/ChecklistAPI.Tests
dotnet test
```

### Frontend Unit Tests
- Framework: Vitest + React Testing Library
- Location: `unit/frontend/`
- Coverage target: 70%+

**Run:**
```bash
cd src/frontend
npm run test
npm run test:coverage
```

## E2E Tests (Planned)

- Framework: Playwright
- Location: `e2e/playwright/`
- Tests critical user workflows end-to-end

**Run:**
```bash
cd tests/e2e
npx playwright test
```

## Test Data

### Seed Data
- Location: `database/seed-templates.sql`
- Creates: 3 templates with 34 items
- Required for integration tests

### Test Isolation
- Integration tests create and clean up their own test data
- Each test is independent and can run in any order
- Admin tests use headers: `X-User-Position: Incident Commander`

## Continuous Integration

### GitHub Actions (Planned)
```yaml
# .github/workflows/tests.yml
- name: Run Integration Tests
  run: |
    cd src/backend/ChecklistAPI
    dotnet run &
    sleep 10
    cd ../../../tests/integration
    pwsh ./test-templates-api.ps1
```

### Azure DevOps (Planned)
```yaml
# azure-pipelines.yml
- task: PowerShell@2
  displayName: 'Run API Integration Tests'
  inputs:
    filePath: 'tests/integration/test-templates-api.ps1'
```

## Test Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Backend Services | 80%+ | TBD |
| Backend Controllers | 70%+ | TBD |
| Frontend Components | 70%+ | TBD |
| Frontend Hooks | 80%+ | TBD |
| Integration Tests | 100% endpoints | ✅ 10/10 |
| E2E Critical Paths | 100% | TBD |

## Test Conventions

### Naming
- **Integration:** `test-{feature}-api.ps1`
- **Unit (C#):** `{ClassName}Tests.cs`
- **Unit (TS):** `{ComponentName}.test.tsx`
- **E2E:** `{workflow-name}.spec.ts`

### Test Structure
```powershell
# PowerShell Integration Tests
function Test-FeatureName {
    Write-TestHeader "Test Description"
    Write-TestStep "Step description"

    # Arrange
    $testData = PrepareTestData

    # Act
    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/resource"

    # Assert
    Write-TestPass "Success message"
    # or
    Write-TestFail "Failure message"
}
```

```csharp
// C# Unit Tests
[Fact]
public async Task MethodName_Scenario_ExpectedResult()
{
    // Arrange
    var service = CreateService();

    // Act
    var result = await service.MethodAsync();

    // Assert
    Assert.NotNull(result);
}
```

```typescript
// TypeScript Unit Tests
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { ... };

    // Act
    render(<ComponentName {...props} />);

    // Assert
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## Troubleshooting Tests

### Integration Tests Failing
```powershell
# Check API is running
curl https://localhost:5001/swagger

# Check seed data loaded
sqlcmd -S localhost -d ChecklistPOC -Q "SELECT COUNT(*) FROM Templates"

# Re-run seed data
sqlcmd -S localhost -d ChecklistPOC -i database/seed-templates.sql -E -C
```

### SSL Certificate Errors
- Integration tests use `-SkipCertificateCheck` for local dev
- Normal for self-signed certificates in development

### Admin Tests Failing
- Check headers include admin position: `X-User-Position: Incident Commander`
- Admin detection is case-insensitive and checks for "Commander", "Chief", or "Admin"

## Documentation

- **Integration Tests:** `tests/integration/test-templates-api-README.md`
- **Testing Guide:** `docs/TESTING_GUIDE.md`
- **Coding Standards:** `docs/CODING_STANDARDS.md` (Testing section)

## Contributing

When adding new endpoints:
1. Add integration tests to `integration/test-{feature}-api.ps1`
2. Add unit tests to service and controller test files
3. Update this README with new test counts
4. Ensure all tests pass before committing

**Test First:** Write tests before implementation when possible (TDD)
