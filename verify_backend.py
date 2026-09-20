#!/usr/bin/env python3
"""
===============================================================================
TattvaAI - Backend Verification Script
===============================================================================
Automated regression testing for critical backend endpoints.
Run before final submission to verify all APIs are functional.
===============================================================================
"""

import sys
import requests
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
BASE_URL = "http://localhost:8000"
RESULTS: List[Tuple[str, bool, str]] = []


def test(name: str, func):
    """Execute a test and record result."""
    try:
        func()
        RESULTS.append((name, True, "✅ PASS"))
        print(f"✅ {name}")
        return True
    except AssertionError as e:
        RESULTS.append((name, False, f"❌ FAIL: {str(e)}"))
        print(f"❌ {name}: {str(e)}")
        return False
    except Exception as e:
        RESULTS.append((name, False, f"❌ ERROR: {str(e)}"))
        print(f"❌ {name}: {str(e)}")
        return False


def test_health():
    """Test health endpoint."""
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert data.get("status") == "healthy", "Health status not healthy"


def test_signoz_status():
    """Test SigNoz status endpoint."""
    r = requests.get(f"{BASE_URL}/dashboard/signoz-status", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "status" in data, "Status field missing"


def test_dashboard_recent():
    """Test recent investigations endpoint."""
    r = requests.get(f"{BASE_URL}/dashboard/recent?limit=5", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "investigations" in data, "Investigations field missing"


def test_auth_signup_personal_email():
    """Test signup rejects personal email."""
    payload = {
        "full_name": "Test User",
        "email": "test@gmail.com",
        "password": "test123456"
    }
    r = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=5)
    assert r.status_code == 400, f"Expected 400 for personal email, got {r.status_code}"
    data = r.json()
    assert "work" in data.get("detail", "").lower() or "organization" in data.get("detail", "").lower(), \
        "Error message doesn't mention work email requirement"


def test_auth_login_personal_email():
    """Test login shows work email message for personal domains."""
    payload = {
        "email": "test@yahoo.com",
        "password": "anypassword"
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=5)
    assert r.status_code == 400, f"Expected 400 for personal email, got {r.status_code}"
    data = r.json()
    assert "work" in data.get("detail", "").lower() or "organization" in data.get("detail", "").lower(), \
        "Login doesn't show work email message for personal domain"


def test_incident_lab_scenarios():
    """Test incident lab scenarios endpoint."""
    r = requests.get(f"{BASE_URL}/incident-lab/scenarios", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Scenarios should be a list"
    assert len(data) == 5, f"Expected 5 scenarios, got {len(data)}"
    
    scenario_names = [s.get("name") for s in data]
    expected = ["HEALTHY", "PAYMENT_TIMEOUT", "PAYMENT_FAILURE", "HIGH_LATENCY", "DEPENDENCY_FAILURE"]
    for exp in expected:
        assert exp in scenario_names, f"Missing scenario: {exp}"


def test_incident_lab_status():
    """Test incident lab status endpoint."""
    r = requests.get(f"{BASE_URL}/incident-lab/status", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "status" in data, "Status field missing"


def test_investigation_history():
    """Test investigation history endpoint."""
    r = requests.get(f"{BASE_URL}/investigation/history", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    # Response can be empty or have investigations


def print_summary():
    """Print test results summary."""
    print("\n" + "="*80)
    print("BACKEND VERIFICATION SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, success, _ in RESULTS if success)
    total = len(RESULTS)
    
    print(f"\nTests Passed: {passed}/{total}")
    print(f"Tests Failed: {total - passed}/{total}")
    
    if total - passed > 0:
        print("\n❌ FAILED TESTS:")
        for name, success, msg in RESULTS:
            if not success:
                print(f"  • {name}: {msg}")
    
    print("\n" + "="*80)
    
    if passed == total:
        print("✅ ALL BACKEND TESTS PASSED")
        print("="*80)
        return 0
    else:
        print("❌ SOME BACKEND TESTS FAILED - FIX BEFORE SUBMISSION")
        print("="*80)
        return 1


def main():
    print("TattvaAI Backend Verification")
    print("="*80)
    print(f"Testing: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print("="*80)
    print()
    
    # Core Health Checks
    print("🔍 Core Health Checks")
    test("Health endpoint", test_health)
    test("SigNoz status endpoint", test_signoz_status)
    test("Dashboard recent endpoint", test_dashboard_recent)
    print()
    
    # Authentication
    print("🔐 Authentication Tests")
    test("Signup rejects personal email", test_auth_signup_personal_email)
    test("Login shows work email message", test_auth_login_personal_email)
    print()
    
    # Incident Lab
    print("🧪 Incident Lab Tests")
    test("Incident lab scenarios list", test_incident_lab_scenarios)
    test("Incident lab status check", test_incident_lab_status)
    print()
    
    # Investigation
    print("📊 Investigation Tests")
    test("Investigation history retrieval", test_investigation_history)
    print()
    
    return print_summary()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Verification interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Verification script error: {e}")
        sys.exit(1)
