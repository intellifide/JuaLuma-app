import requests

url = "http://localhost:8001/api/auth/change-password"
# Try changing password with empty mfa_code to trigger pydantic validation
# Note: This requires a token, but Pydantic validation happens BEFORE authentication in FastAPI if the dependency is handled that way.
# However, change_password depends on get_current_user which depends on verify_token.
# Let's try /api/auth/reset-password which is open.
pay = {"email": "test@example.com", "mfa_code": "1"} # Too short

res = requests.post("http://localhost:8001/api/auth/reset-password", json=pay)
print(f"Status: {res.status_code}")
print(f"Body: {res.text}")
