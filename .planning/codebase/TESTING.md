# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Frontend (React):**
- Runner: Jest (via `react-scripts` — CRA default)
- Version: `@types/jest` ^27.5.2 in `frontend/package.json`
- Assertion library: `@testing-library/jest-dom` ^5.17.0
- Component testing: `@testing-library/react` ^13.4.0
- User interaction: `@testing-library/user-event` ^14.5.1
- Config: No standalone `jest.config.*` file — Jest configured implicitly via `react-scripts`
- ESLint integration: `react-app/jest` extended in `frontend/package.json` `eslintConfig`

**MCP Server (TypeScript):**
- Runner: Jest ^29.7.0
- Config: No `jest.config.*` file detected; `"test": "jest"` script in `mcp-server/package.json`
- No test files found — test infrastructure installed but tests not yet written

**Backend (Python):**
- Runner: pytest ^7.4.3 in `backend/requirements.txt`
- Async support: pytest-asyncio ^0.21.1
- HTTP client for integration tests: requests ^2.31.0
- No `pytest.ini`, `setup.cfg`, or `pyproject.toml` config found — default pytest discovery

**Run Commands:**
```bash
# Frontend
cd frontend && npm test                # Run all tests (interactive watch mode)
cd frontend && npm test -- --watchAll=false  # Run once (CI mode)

# MCP Server
cd mcp-server && npm test              # Run all tests via Jest

# Backend
cd backend && pytest                   # Run all tests
cd backend && pytest -v                # Verbose output
cd backend && pytest --asyncio-mode=auto  # For async tests
```

## Test File Organization

**Frontend:**
- No test files currently exist in `frontend/src/`
- `@testing-library` and `@types/jest` are installed but no `.test.tsx` or `.spec.tsx` files are present
- An empty `frontend/src/utils/__tests__/` directory exists (placeholder only)
- CRA convention would place tests co-located with source or in `__tests__` subdirectories

**MCP Server:**
- No test files present; `mcp-server/tsconfig.json` explicitly excludes `**/*.test.ts` from compilation
- Jest is installed as a devDependency; test infrastructure ready but unused

**Backend:**
- `test_auth.py` exists at repository root `/Users/asmeenray/projects/barabula/test_auth.py`
- This is a manual integration script, not a pytest test file (no `assert` statements, no pytest fixtures)
- No `tests/` directory found in `backend/`
- No `test_*.py` files found inside `backend/`

**Naming (intended by tooling):**
- Python: `test_*.py` or `*_test.py` (pytest default discovery)
- TypeScript: `*.test.ts`, `*.test.tsx`, or files in `__tests__/` directories (Jest default)

## Test Structure

**No formal test suites exist in the codebase.** The only test-like file is `test_auth.py` at the repo root, which is a manual HTTP integration script.

**`test_auth.py` pattern (manual integration script):**
```python
def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

if __name__ == "__main__":
    main()  # Runs all test functions sequentially
```

**Intended pytest pattern (based on pytest-asyncio installed):**
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_async_endpoint():
    # async endpoint tests
    ...
```

**Intended React Testing Library pattern (based on deps installed):**
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { store } from '../../store/store';
import Login from './Login';

describe('Login', () => {
  it('renders login form', () => {
    render(
      <Provider store={store}>
        <Login />
      </Provider>
    );
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });
});
```

## Mocking

**Framework:** Not established — no mocks in any current test code.

**What to Mock (recommended based on codebase structure):**
- `frontend/src/services/api.ts` — mock `apiService` methods in Redux slice tests
- `localStorage` — used directly in `authSlice.ts` for token persistence
- `fetch` — used in `ApiService` class methods; no axios interceptors to mock
- SQLAlchemy `Session` — use pytest fixtures with in-memory SQLite or mock `get_db` dependency
- `openai.ChatCompletion.acreate` — mock in `backend/api/chat.py` tests to avoid API calls
- Redis client — mock in `mcp-server/src/services/collaboration.ts` tests

**What NOT to Mock:**
- Redux store shape — test with real `configureStore` using test reducers
- Pydantic schema validation — test actual schema parsing behavior
- SQLite engine — `database.py` already falls back to SQLite; use this for integration tests

## Fixtures and Factories

**No fixtures or factories exist.** Based on the data models, the following would be needed:

**Python (pytest fixtures pattern to use):**
```python
@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()

@pytest.fixture
def test_user(db):
    user = User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=get_password_hash("testpassword123")
    )
    db.add(user)
    db.commit()
    return user
```

**Location:**
- Python fixtures: should be in `backend/tests/conftest.py`
- TypeScript fixtures: should be in `frontend/src/__tests__/` or alongside tests

## Coverage

**Requirements:** None enforced — no coverage thresholds configured in any tool.

**View Coverage:**
```bash
# Frontend
npm test -- --coverage --watchAll=false

# Backend
pytest --cov=. --cov-report=html
# Requires: pip install pytest-cov
```

## Test Types

**Unit Tests:**
- Not present. Intended scope: individual Redux reducers, utility functions, Pydantic schema validation, pure Python helper functions (`verify_password`, `create_access_token`, `get_password_hash` in `backend/api/auth.py`)

**Integration Tests:**
- `test_auth.py` (repo root) is a manual HTTP integration script, not a proper pytest integration test
- Intended scope: FastAPI endpoint tests using `TestClient`, Redux async thunk tests with mocked `apiService`

**E2E Tests:**
- Not used. No Cypress, Playwright, or Selenium found.

## Common Patterns

**Async Testing (intended for backend):**
```python
import pytest

@pytest.mark.asyncio
async def test_generate_chat_response():
    result = await AIService.generate_chat_response("Hello", {}, {})
    assert "response" in result
    assert isinstance(result["suggestions"], list)
```

**Error Testing (intended for API routes):**
```python
def test_get_itinerary_not_found(client, auth_headers):
    response = client.get("/api/v1/itineraries/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Itinerary not found"
```

**Redux Rejected State Testing (intended for frontend):**
```typescript
import { loginUser } from './authSlice';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

it('sets error state on login failure', async () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  // mock apiService.login to reject
  await store.dispatch(loginUser({ username: 'bad', password: 'bad' }));
  expect(store.getState().auth.error).toBeTruthy();
  expect(store.getState().auth.isAuthenticated).toBe(false);
});
```

## Coverage Gaps

**Critical areas with zero test coverage:**

- All FastAPI route handlers in `backend/api/` — `auth.py`, `itineraries.py`, `chat.py`, `recommendations.py`, `users.py`
- All Redux async thunks in `frontend/src/store/authSlice.ts`
- `CollaborationManager.syncItinerary` conflict resolution logic in `mcp-server/src/services/collaboration.ts`
- `AIService.generate_chat_response` and `AIService.generate_itinerary` in `backend/api/chat.py`
- Auth middleware in both `backend/api/auth.py` and `mcp-server/src/middleware/auth.ts`
- JWT token creation and validation (`create_access_token`, `authenticate_user` in `backend/api/auth.py`)

---

*Testing analysis: 2026-03-09*
