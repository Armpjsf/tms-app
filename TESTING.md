"""
Quick Start Guide - Testing
"""

# 🚀 Quick Testing Commands

## Run All Tests
```bash
pytest tests/ -v
```

## Run with Coverage
```bash
pytest tests/ -v --cov=services --cov-report=html
```

## Run Only Unit Tests
```bash
pytest tests/unit/ -v
```

## Run Only Integration Tests
```bash
pytest tests/integration/ -v -m integration
```

## Run Specific Test File
```bash
pytest tests/unit/test_auth_service.py -v
```

## Run Specific Test
```bash
pytest tests/unit/test_auth_service.py::TestAuthService::test_login_success_with_argon2 -v
```

## View Coverage Report
```bash
# After running tests with --cov-report=html
start htmlcov/index.html
```

## Run Tests in Parallel (faster)
```bash
pip install pytest-xdist
pytest tests/ -v -n auto
```

## Watch Mode (re-run on file changes)
```bash
pip install pytest-watch
ptw tests/
```

---

# 📊 Current Test Status

**Total Tests:** 42 passed
**Coverage:** 7% overall (target: 60%)

**Well Covered:**
- ✅ auth_service.py: 94%
- ✅ validators.py: 91%
- ✅ config modules: 100%

**Need More Tests:**
- ⚠️ views/: 0% (will test in Week 4)
- ⚠️ accounting_service.py: 7%
- ⚠️ job_service.py: 16%
- ⚠️ driver_service.py: 13%

---

# 🎯 Next Steps

1. Run new tests:
```bash
pytest tests/ -v --cov=services --cov-report=html
```

2. Check coverage improved:
```bash
start htmlcov/index.html
```

3. Expected: 50-60% coverage after new tests

---

# 💡 Tips

- Use `-v` for verbose output
- Use `-s` to see print statements
- Use `-k "test_name"` to run tests matching pattern
- Use `--lf` to run only last failed tests
- Use `--ff` to run failed tests first
