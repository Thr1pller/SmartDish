import sys, os, pytest, pyotp
from fastapi.testclient import TestClient
from app.main import app 

client = TestClient(app)

def test_recipes_protection():
    """Тест 1: Перевірка захисту рецептів."""
    response = client.get("/api/recipes")
    assert response.status_code == 401

def test_schedule_protection():
    """Тест 2: Перевірка захисту розкладу."""
    response = client.get("/api/schedule/2026-05-30")
    assert response.status_code == 401

def test_user_profile_protection():
    """Тест 3: Перевірка захисту профілю."""
    response = client.get("/api/users/me")
    assert response.status_code == 401

def test_2fa_algorithm_verification():
    """Тест 4: Перевірка алгоритму 2FA."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    
    assert totp.verify(valid_code) is True
    assert totp.verify("000000") is False