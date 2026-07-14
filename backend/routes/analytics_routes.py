from fastapi import APIRouter, Depends, HTTPException, Response, Header
from sqlalchemy.orm import Session
from typing import Optional
import json
from datetime import datetime
from db.database import get_db
from models.models import TenantConfig
from cache.cache import cache_get, cache_set
from tools.analytics_tools import (
    calculate_bill_decomposition,
    get_latest_telemetry_month,
    detect_system_anomalies,
    get_dashboard_rich_analytics,
    get_recommendations_and_benchmarks,
    resolve_db_tenant_id
)

router = APIRouter(prefix="/api/v1", tags=["Analytics"])


def get_tenant_id_from_auth(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or invalid format"
        )
    token = authorization.split(" ")[1]
    try:
        import jwt
        from controllers.auth_controller import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            raise HTTPException(status_code=401, detail="Token payload missing tenant_id")
        return tenant_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")


@router.get("/tenants")
def get_tenants(db: Session = Depends(get_db)):
    tenants = db.query(TenantConfig).all()
    return [
        {
            "id": t.tenant_id,
            "name": t.company_name
        }
        for t in tenants
    ]


@router.get("/dashboard/kpis")
def get_dashboard_kpis(month_year: Optional[str] = None, db: Session = Depends(get_db), tenant_id: str = Depends(get_tenant_id_from_auth)):
    if not month_year or month_year == "latest":
        month_year = get_latest_telemetry_month(db, tenant_id)

    bill_summary = calculate_bill_decomposition(db, tenant_id, month_year)
    if "error" in bill_summary:
        raise HTTPException(status_code=404, detail=bill_summary["error"])

    tenant = db.query(TenantConfig).filter_by(tenant_id=tenant_id).first()
    pf_rules = tenant.pf_rules_json if isinstance(tenant.pf_rules_json, dict) else (json.loads(tenant.pf_rules_json) if tenant and tenant.pf_rules_json else {})
    baseline_pf = float(pf_rules.get("baseline", 0.90))

    anomalies = detect_system_anomalies(db, tenant_id, "all", days=5)

    return {
        "tenant_id": tenant_id,
        "month_year": month_year,
        "billing_summary": {
            "current_month_kwh": bill_summary.get("total_kwh", 0),
            "estimated_bill_inr": bill_summary.get("financial_breakdown_inr", {}).get("estimated_total_bill", 0),
            "energy_charge_inr": bill_summary.get("financial_breakdown_inr", {}).get("energy_charge", 0),
            "demand_penalty_inr": bill_summary.get("financial_breakdown_inr", {}).get("demand_penalty", 0),
            "pf_adjustment_inr": bill_summary.get("financial_breakdown_inr", {}).get("pf_adjustment", 0)
        },
        "demand_status": {
            "recorded_peak_md_kva": bill_summary.get("recorded_peak_md_kva", 0),
            "contracted_demand_kva": bill_summary.get("contracted_demand_kva", 0),
            "is_violation": bill_summary.get("is_demand_violation", False),
            "excess_kva": bill_summary.get("demand_excess_kva", 0)
        },
        "power_factor_status": {
            "average_pf": bill_summary.get("average_pf", 0),
            "baseline_pf": baseline_pf,
            "status": "PENALTY_EXPOSURE" if bill_summary.get("average_pf", 0) < baseline_pf else "GOOD"
        },
        "anomaly_summary": {
            "total_count": len(anomalies),
            "critical_count": sum(1 for a in anomalies if a.get("severity") == "CRITICAL"),
            "warning_count": sum(1 for a in anomalies if a.get("severity") == "WARNING")
        }
    }


@router.get("/dashboard/analytics")
def get_dashboard_analytics(response: Response, time_range: str = "Today", db: Session = Depends(get_db), tenant_id: str = Depends(get_tenant_id_from_auth)):
    response.headers["Cache-Control"] = "private, max-age=3600"
    response.headers["Vary"] = "Authorization"
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"analytics:{tenant_id}:{time_range}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    analytics = get_dashboard_rich_analytics(db, target_id, time_range)
    anomalies = detect_system_anomalies(db, target_id, "all", days=30)
    billing = calculate_bill_decomposition(db, target_id, month_year="latest")
    
    analytics["anomalies"] = anomalies
    analytics["billing"] = billing
    cache_set(cache_key, analytics, ttl_seconds=300)
    return analytics


@router.get("/insights/weekly")
def get_weekly_insights(db: Session = Depends(get_db), tenant_id: str = Depends(get_tenant_id_from_auth)):
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"insights:{tenant_id}:weekly"
    cached = cache_get(cache_key)
    if cached:
        return cached

    anomalies = detect_system_anomalies(db, target_id, "all", days=7)
    recs = get_recommendations_and_benchmarks(db, target_id, anomalies=anomalies)

    insights = []
    for idx, a in enumerate(anomalies[:4]):
        insights.append({
            "id": f"ins_{idx+1}",
            "category": a.get("type"),
            "severity": a.get("severity"),
            "title": f"{a.get('type').replace('_', ' ')} Detected on {a.get('meter_id')}",
            "summary": a.get("description"),
            "rupee_impact": a.get("rupee_impact", 0),
            "affected_meter_id": a.get("meter_id"),
            "timestamp": a.get("timestamp")
        })

    for idx, r in enumerate(recs[:2]):
        insights.append({
            "id": f"rec_{idx+1}",
            "category": "OPTIMIZATION_OPPORTUNITY",
            "severity": "INFO",
            "title": r.get("action_title"),
            "summary": r.get("engineering_step"),
            "rupee_impact": r.get("estimated_monthly_savings_inr", 0),
            "affected_meter_id": "ALL_FEEDERS",
            "timestamp": datetime.now().isoformat()
        })

    result = {
        "tenant_id": tenant_id,
        "generated_at": datetime.now().isoformat(),
        "insights": insights
    }
    cache_set(cache_key, result, ttl_seconds=600)
    return result
