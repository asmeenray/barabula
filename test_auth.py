#!/usr/bin/env python3
"""
Test script for BARABULA authentication endpoints
"""
import requests
import json

# Backend API base URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_register():
    """Test user registration"""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
        print(f"\nRegister: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 201
    except Exception as e:
        print(f"Registration failed: {e}")
        return False

def test_login():
    """Test user login"""
    login_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login", 
            data=login_data,  # OAuth2PasswordRequestForm expects form data
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"\nLogin: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            return token
        return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_protected_route(token):
    """Test protected route with JWT token"""
    if not token:
        print("\nNo token available for protected route test")
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
        print(f"\nProtected Route (/me): {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Protected route test failed: {e}")
        return False

def main():
    print("🧪 Testing BARABULA Authentication System")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Server is not running or health check failed")
        return
    
    # Test registration
    print("\n📝 Testing Registration...")
    if test_register():
        print("✅ Registration successful")
    else:
        print("❌ Registration failed")
    
    # Test login
    print("\n🔐 Testing Login...")
    token = test_login()
    if token:
        print("✅ Login successful")
        print(f"Token: {token[:50]}...")
    else:
        print("❌ Login failed")
        return
    
    # Test protected route
    print("\n🛡️ Testing Protected Route...")
    if test_protected_route(token):
        print("✅ Protected route access successful")
    else:
        print("❌ Protected route access failed")
    
    print("\n🎉 Authentication tests completed!")

if __name__ == "__main__":
    main()
