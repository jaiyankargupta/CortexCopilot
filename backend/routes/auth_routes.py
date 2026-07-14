from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from models.models import TenantAuth, TenantConfig
from controllers.auth_controller import verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: Optional[str] = None
    org_id: Optional[str] = None
    password: str


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    tenant_key = req.org_id or req.username
    if not tenant_key:
        raise HTTPException(status_code=400, detail="Must provide org_id or username")

    tenant_auth = db.query(TenantAuth).filter(TenantAuth.tenant_id == tenant_key).first()
    if not tenant_auth or not verify_password(req.password, tenant_auth.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    tenant_config = db.query(TenantConfig).filter_by(tenant_id=tenant_auth.tenant_id).first()
    company_name = tenant_config.company_name if tenant_config else ("Steel Rolling Mill, Durgapur" if tenant_auth.tenant_id in ("1001", "T_STEEL_DURGAPUR") else "Coimbatore Textiles")

    access_token = create_access_token(
        data={"tenant_id": tenant_auth.tenant_id, "role": tenant_auth.role, "company_name": company_name}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "tenant_id": tenant_auth.tenant_id,
        "role": tenant_auth.role,
        "company_name": company_name
    }
