import jwt
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from db.database import SessionLocal
from models.models import TenantAuth
import os

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey123")
ALGORITHM = "HS256"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash.startswith("pbkdf2_sha256$"):
        return plain_password == stored_hash
    parts = stored_hash.split("$")
    if len(parts) != 3:
        return False
    _, salt, expected_hex = parts
    dk = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return dk.hex() == expected_hex


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def authenticate_tenant(tenant_id: str, password: str) -> Optional[dict]:
    db = SessionLocal()
    try:
        user = db.query(TenantAuth).filter(TenantAuth.tenant_id == tenant_id).first()
        if not user:
            return None
        if not verify_password(password, user.password):
            return None
        return {"tenant_id": user.tenant_id, "role": user.role}
    finally:
        db.close()
