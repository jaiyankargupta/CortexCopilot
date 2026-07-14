import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from models.models import Telemetry, TenantConfig
from cache.cache import cache_get, cache_set


def resolve_db_tenant_id(tenant_id: str) -> str:
    tid = str(tenant_id or "").strip()
    if tid in ("T_STEEL_DURGAPUR", "Steel Rolling Mill, Durgapur", "1001"):
        return "1001"
    if tid in ("T_COIMBATORE", "Coimbatore Textiles", "1002"):
        return "1002"
    return tid



def get_latest_telemetry_month(db: Session, tenant_id: str) -> str:
    latest = db.query(Telemetry.ts).filter(Telemetry.tenant_id == tenant_id).order_by(Telemetry.ts.desc()).first()
    if latest and latest[0]:
        return latest[0].strftime("%Y-%m")
    return datetime.now().strftime("%Y-%m")


def get_latest_telemetry_range(db: Session, tenant_id: str) -> tuple:
    latest = db.query(Telemetry.ts).filter(Telemetry.tenant_id == tenant_id).order_by(Telemetry.ts.desc()).first()
    if latest and latest[0]:
        year_month = latest[0].strftime("%Y-%m")
        return f"{year_month}-01T00:00:00+05:30", f"{year_month}-31T23:59:59+05:30"
    now_ym = datetime.now().strftime("%Y-%m")
    return f"{now_ym}-01T00:00:00+05:30", f"{now_ym}-31T23:59:59+05:30"


def get_consumption_summary(db: Session, tenant_id: str, start_ts: Optional[str] = None, end_ts: Optional[str] = None, meter_id: Optional[str] = None) -> Dict:
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"calc:summary:{target_id}:{start_ts}:{end_ts}:{meter_id}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    if not start_ts or not end_ts or start_ts == "latest":
        start_ts, end_ts = get_latest_telemetry_range(db, target_id)

    query = db.query(
        func.sum(Telemetry.kwh).label("total_kwh"),
        func.sum(Telemetry.kvah).label("total_kvah"),
        func.avg(Telemetry.pf).label("avg_pf"),
        func.max(Telemetry.md_kva).label("max_md_kva")
    ).filter(
        and_(
            Telemetry.tenant_id == target_id,
            Telemetry.ts >= datetime.fromisoformat(start_ts),
            Telemetry.ts <= datetime.fromisoformat(end_ts)
        )
    )

    if meter_id:
        query = query.filter(Telemetry.meter_id == meter_id)

    result = query.first()
    if not result or result.total_kwh is None:
        return {"error": "No telemetry found for the specified time window or meter."}

    peak_record = db.query(Telemetry).filter(
        and_(
            Telemetry.tenant_id == target_id,
            Telemetry.ts >= datetime.fromisoformat(start_ts),
            Telemetry.ts <= datetime.fromisoformat(end_ts),
            Telemetry.md_kva == result.max_md_kva
        )
    ).first()

    output = {
        "tenant_id": tenant_id,
        "start_ts": start_ts,
        "end_ts": end_ts,
        "meter_id": meter_id or "ALL_FEEDERS",
        "total_kwh": round(float(result.total_kwh), 2),
        "total_kvah": round(float(result.total_kvah), 2),
        "avg_pf": round(float(result.avg_pf), 3),
        "max_md_kva": round(float(result.max_md_kva), 2),
        "peak_md_timestamp": peak_record.ts.isoformat() if peak_record else None
    }
    cache_set(cache_key, output, ttl_seconds=300)
    return output


def calculate_bill_decomposition(db: Session, tenant_id: str, month_year: Optional[str] = None) -> Dict:
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"calc:bill_decomp:{target_id}:{month_year}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    tenant = db.query(TenantConfig).filter_by(tenant_id=target_id).first()
    if not tenant:
        return {"error": f"Tenant {target_id} not found in configuration."}

    if not month_year or month_year == "latest":
        month_year = get_latest_telemetry_month(db, target_id)

    year, month = map(int, month_year.split("-"))
    start_dt = datetime(year, month, 1, 0, 0, 0)
    if month == 12:
        end_dt = datetime(year + 1, 1, 1, 0, 0, 0) - timedelta(seconds=1)
    else:
        end_dt = datetime(year, month + 1, 1, 0, 0, 0) - timedelta(seconds=1)

    records = db.query(Telemetry).filter(
        and_(
            Telemetry.tenant_id == target_id,
            Telemetry.ts >= start_dt,
            Telemetry.ts <= end_dt
        )
    ).all()

    if not records:
        records = db.query(Telemetry).filter(Telemetry.tenant_id == target_id).limit(100).all()
    if not records:
        return {"error": f"No telemetry records found for tenant {tenant_id} in {month_year}."}

    total_kvah = sum(r.kvah for r in records)
    total_kwh = sum(r.kwh for r in records)
    avg_pf = sum(r.pf for r in records) / len(records)
    max_md_kva = max(r.md_kva for r in records)

    peak_kvah = 0.0
    off_peak_kvah = 0.0
    normal_kvah = 0.0

    for r in records:
        h = r.ts.hour
        if (6 <= h < 10) or (18 <= h < 22):
            peak_kvah += r.kvah
        elif h >= 22 or h < 6:
            off_peak_kvah += r.kvah
        else:
            normal_kvah += r.kvah

    tariff = tenant.tariff_config_json or {}
    rates = tariff.get("energy_rates_kvah", {})
    peak_rate = float(rates.get("peak", 8.65))
    off_peak_rate = float(rates.get("off_peak", 6.65))
    normal_rate = float(rates.get("normal", 7.15))

    energy_charge_inr = (
        (normal_kvah * normal_rate) +
        (peak_kvah * peak_rate) +
        (off_peak_kvah * off_peak_rate)
    )

    contracted_kva = float(tenant.contracted_demand_kva or 1501.0)
    min_billing_demand = contracted_kva * float(tariff.get("min_chargeable_demand_ratio", 0.80))
    billed_demand = max(max_md_kva, min_billing_demand)

    demand_charge_normal_rate = float(tariff.get("demand_charge_normal", 500.0))
    demand_charge_penal_rate = float(tariff.get("demand_charge_penal", 1000.0))

    if max_md_kva <= contracted_kva:
        normal_demand_charge = billed_demand * demand_charge_normal_rate
        penal_demand_charge = 0.0
    else:
        normal_demand_charge = contracted_kva * demand_charge_normal_rate
        penal_demand_charge = (max_md_kva - contracted_kva) * demand_charge_penal_rate

    duty_rate = float(tariff.get("electricity_duty_rate", 0.06))
    electricity_duty = (normal_kvah + peak_kvah + off_peak_kvah) * duty_rate
    customer_charges = float(tariff.get("customer_charges", 3500.0))

    total_bill_inr = energy_charge_inr + normal_demand_charge + penal_demand_charge + electricity_duty + customer_charges

    output = {
        "tenant_id": tenant_id,
        "month_year": month_year,
        "contracted_demand_kva": contracted_kva,
        "recorded_peak_md_kva": round(max_md_kva, 2),
        "is_demand_violation": max_md_kva > contracted_kva,
        "demand_excess_kva": round(max(0.0, max_md_kva - contracted_kva), 2),
        "total_kvah": round(normal_kvah + peak_kvah + off_peak_kvah, 2),
        "total_kwh": round(total_kwh, 2),
        "tod_breakdown_kvah": {
            "peak": round(peak_kvah, 2),
            "off_peak": round(off_peak_kvah, 2),
            "normal": round(normal_kvah, 2)
        },
        "tod_breakdown_kwh": {
            "peak": round(peak_kvah, 2),
            "off_peak": round(off_peak_kvah, 2),
            "standard": round(normal_kvah, 2)
        },
        "average_pf": round(avg_pf, 3),
        "financial_breakdown_inr": {
            "energy_charge": round(energy_charge_inr, 2),
            "normal_demand_charge": round(normal_demand_charge, 2),
            "demand_penalty": round(penal_demand_charge, 2),
            "electricity_duty": round(electricity_duty, 2),
            "customer_charges": round(customer_charges, 2),
            "pf_adjustment": 0.0,
            "estimated_total_bill": round(total_bill_inr, 2)
        }
    }
    cache_set(cache_key, output, ttl_seconds=600)
    return output


def detect_system_anomalies(db: Session, tenant_id: str, anomaly_type: str = "all", days: int = 30) -> List[Dict]:
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"calc:anomalies:{target_id}:{anomaly_type}:{days}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    tenant = db.query(TenantConfig).filter_by(tenant_id=target_id).first()
    if not tenant:
        return []

    query = db.query(Telemetry).filter(Telemetry.tenant_id == target_id)
    if days and days > 0:
        latest_ts = db.query(func.max(Telemetry.ts)).filter(Telemetry.tenant_id == target_id).scalar()
        if latest_ts:
            query = query.filter(Telemetry.ts >= latest_ts - timedelta(days=days))
    records = query.order_by(Telemetry.ts.desc()).limit(1000).all()
    records.reverse()
    if not records:
        return []

    tariff = tenant.tariff_config_json if isinstance(tenant.tariff_config_json, dict) else (json.loads(tenant.tariff_config_json) if tenant.tariff_config_json else {})
    pf_rules = tenant.pf_rules_json if isinstance(tenant.pf_rules_json, dict) else (json.loads(tenant.pf_rules_json) if tenant.pf_rules_json else {})
    penalty_rate = float(tariff.get("demand_penalty_rate_kva", 750.0))
    pf_baseline = float(pf_rules.get("baseline", 0.90))
    pf_surcharge_per_point = float(pf_rules.get("penalty_per_point_below", 500.0))

    anomalies = []
    contracted_kva = tenant.contracted_demand_kva

    if anomaly_type in ("all", "demand"):
        for r in records:
            if r.md_kva > contracted_kva:
                anomalies.append({
                    "type": "DEMAND_VIOLATION",
                    "severity": "CRITICAL",
                    "timestamp": r.ts.isoformat(),
                    "meter_id": r.meter_id,
                    "recorded_value": round(r.md_kva, 2),
                    "limit_value": contracted_kva,
                    "rupee_impact": round((r.md_kva - contracted_kva) * penalty_rate, 2),
                    "description": f"Rolling demand hit {r.md_kva} kVA, exceeding contracted limit of {contracted_kva} kVA."
                })

    if anomaly_type in ("all", "pf"):
        low_pf_count = 0
        window_start = None
        min_pf_in_window = 1.0
        for r in records:
            if r.pf < pf_baseline:
                if low_pf_count == 0:
                    window_start = r.ts
                    min_pf_in_window = r.pf
                else:
                    min_pf_in_window = min(min_pf_in_window, r.pf)
                low_pf_count += 1
            else:
                if low_pf_count >= 4:
                    anomalies.append({
                        "type": "POWER_FACTOR_DEGRADATION",
                        "severity": "WARNING",
                        "timestamp": window_start.isoformat(),
                        "meter_id": r.meter_id,
                        "recorded_value": round(min_pf_in_window, 3),
                        "limit_value": pf_baseline,
                        "rupee_impact": round((pf_baseline - min_pf_in_window) * 100 * pf_surcharge_per_point, 2),
                        "description": f"Sustained low power factor below {pf_baseline} (worst: {round(min_pf_in_window, 3)}) observed for {low_pf_count * 15} minutes."
                    })
                low_pf_count = 0

    if anomaly_type in ("all", "thd"):
        for r in records:
            if (r.thd_v and r.thd_v > 5.0) or (r.thd_i and r.thd_i > 8.0):
                anomalies.append({
                    "type": "HARMONIC_DISTORTION_EXCURSION",
                    "severity": "WARNING",
                    "timestamp": r.ts.isoformat(),
                    "meter_id": r.meter_id,
                    "recorded_value": f"THD_V: {r.thd_v}%, THD_I: {r.thd_i}%",
                    "limit_value": "IEEE-519 (THD_V <= 5.0%, THD_I <= 8.0%)",
                    "rupee_impact": -1500.0,
                    "description": f"Harmonic current distortion exceeded safe thresholds on {r.meter_id}."
                })

    if anomaly_type in ("all", "imbalance"):
        for r in records:
            if r.v_r and r.v_y and r.v_b:
                v_avg = (r.v_r + r.v_y + r.v_b) / 3.0
                max_dev = max(abs(r.v_r - v_avg), abs(r.v_y - v_avg), abs(r.v_b - v_avg))
                imbalance_pct = (max_dev / v_avg) * 100.0
                if imbalance_pct > 2.0:
                    anomalies.append({
                        "type": "PHASE_VOLTAGE_IMBALANCE",
                        "severity": "WARNING",
                        "timestamp": r.ts.isoformat(),
                        "meter_id": r.meter_id,
                        "recorded_value": round(imbalance_pct, 2),
                        "limit_value": 2.0,
                        "rupee_impact": -2500.0,
                        "description": f"Phase voltage imbalance of {round(imbalance_pct, 2)}% exceeds 2.0% safe motor limit."
                    })

    cache_set(cache_key, anomalies, ttl_seconds=300)
    return anomalies


def get_canonical_explanations(concept: str) -> Dict:
    key = concept.lower().strip()
    cache_key = f"concept_explanation:{key}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    base_definitions = {
        "pf": {
            "term": "Power Factor (PF)",
            "simple_definition": "The ratio of real power used by your machines (kWh) against total apparent power drawn from the grid (kVAh).",
            "business_impact": "If PF falls below 0.90, DISCOMs levy penalties and your kVAh billing increases even if machine output remains unchanged.",
            "action": "Inspect Automatic Power Factor Correction (APFC) capacitor banks and reactive power compensation."
        },
        "thd": {
            "term": "Total Harmonic Distortion (THD)",
            "simple_definition": "Electrical noise introduced into wiring by non-linear electronic loads like induction furnaces, variable frequency drives (VFDs), and LED drivers.",
            "business_impact": "Causes overheating of transformers, premature insulation breakdown in motors, and nuisance breaker tripping.",
            "action": "Install active harmonic filters on heavy inverter or furnace feeders."
        },
        "tod": {
            "term": "Time-of-Day (ToD) Tariff",
            "simple_definition": "Electricity rates that vary by hour. DISCOMs charge extra during peak hours (18:00 to 22:00) and give discounts late at night (23:00 to 06:00).",
            "business_impact": "Running high-consumption equipment during evening peak dramatically inflates monthly power bills.",
            "action": "Shift batch heating, melting, or water pumping operations to the 23:00-06:00 window."
        },
        "demand": {
            "term": "Maximum Demand (kVA)",
            "simple_definition": "The highest 15-minute average power load recorded during the billing cycle.",
            "business_impact": "Exceeding contracted demand limits triggers demand excess charges for every surplus kVA.",
            "action": "Stagger heavy motor startups across shifts using automated demand controllers."
        }
    }
    explanation = base_definitions.get(key, {"term": concept, "simple_definition": f"Industrial electrical parameter tracking {concept} telemetry."})
    cache_set(cache_key, explanation, ttl_seconds=86400)
    return explanation


def get_recommendations_and_benchmarks(db: Session, tenant_id: str, anomalies: Optional[List[Dict]] = None) -> List[Dict]:
    target_id = resolve_db_tenant_id(tenant_id)
    cache_key = f"calc:recs:{target_id}"
    cached = cache_get(cache_key)
    if cached is not None and anomalies is None:
        return cached
    if anomalies is None:
        anomalies = detect_system_anomalies(db, target_id, "all", days=30)
    recs = []

    demand_anomalies = [a for a in anomalies if a["type"] == "DEMAND_VIOLATION"]
    if demand_anomalies:
        calc_savings = round(sum(abs(float(a.get("rupee_impact", 0))) for a in demand_anomalies), 2)
        recs.append({
            "action_title": "Implement Automated Demand Staggering",
            "category": "PEAK_MANAGEMENT",
            "estimated_monthly_savings_inr": max(calc_savings, round(len(demand_anomalies) * 1500.0, 2)),
            "engineering_step": f"Automated demand controller recommended to mitigate {len(demand_anomalies)} recorded peak demand excursions."
        })

    pf_anomalies = [a for a in anomalies if a["type"] == "POWER_FACTOR_DEGRADATION"]
    if pf_anomalies:
        calc_pf_savings = round(sum(abs(float(a.get("rupee_impact", 0))) for a in pf_anomalies), 2)
        recs.append({
            "action_title": "Service APFC Capacitor Bank Steps",
            "category": "REACTIVE_POWER",
            "estimated_monthly_savings_inr": max(calc_pf_savings, round(len(pf_anomalies) * 800.0, 2)),
            "engineering_step": f"Inspect contactors and tuned reactors to resolve {len(pf_anomalies)} power factor drops below baseline."
        })

    imbalance_anomalies = [a for a in anomalies if a["type"] == "PHASE_VOLTAGE_IMBALANCE"]
    if imbalance_anomalies:
        calc_imb_savings = round(sum(abs(float(a.get("rupee_impact", 0))) for a in imbalance_anomalies), 2)
        recs.append({
            "action_title": "Balance Phase Loading Across Distribution Panels",
            "category": "PHASE_OPTIMIZATION",
            "estimated_monthly_savings_inr": max(calc_imb_savings, round(len(imbalance_anomalies) * 1200.0, 2)),
            "engineering_step": f"Redistribute single-phase auxiliary loads across R-Y-B phases to eliminate {len(imbalance_anomalies)} voltage imbalance events."
        })

    cache_set(cache_key, recs, ttl_seconds=600)
    return recs


def get_dashboard_rich_analytics(db: Session, tenant_id: str, time_range: str = "Today") -> Dict:
    target_id = resolve_db_tenant_id(tenant_id)
    tenant = db.query(TenantConfig).filter_by(tenant_id=target_id).first()
    contracted_kva = float(tenant.contracted_demand_kva) if tenant else 300.0
    
    now = db.query(func.max(Telemetry.ts)).filter(Telemetry.tenant_id == target_id).scalar()
    if not now:
        now = db.query(func.max(Telemetry.ts)).scalar() or datetime.now()
        
    if time_range == "Today":
        start_ts = now - timedelta(days=1)
    elif time_range == "This Week":
        start_ts = now - timedelta(days=7)
    elif time_range == "This Month":
        start_ts = now - timedelta(days=30)
    elif time_range == "Last Month":
        start_ts = now - timedelta(days=60)
        now = now - timedelta(days=30)
    else:
        start_ts = now - timedelta(days=1)

    records = db.query(Telemetry).filter(
        and_(
            Telemetry.tenant_id == target_id,
            Telemetry.ts >= start_ts,
            Telemetry.ts <= now
        )
    ).order_by(Telemetry.ts.asc()).all()

    if not records:
        records = db.query(Telemetry).filter(Telemetry.tenant_id == target_id).order_by(Telemetry.ts.asc()).limit(144).all()

    today_kwh = sum(r.kwh for r in records[-96:]) if records else 0.0
    today_kvah = sum(r.kvah for r in records[-96:]) if records else 0.0
    today_pf = sum(r.pf for r in records[-96:]) / max(1, len(records[-96:])) if records else 0.0

    yesterday_kwh = sum(r.kwh for r in records[-192:-96]) if len(records) >= 192 else 0.0
    yesterday_kvah = sum(r.kvah for r in records[-192:-96]) if len(records) >= 192 else 0.0
    yesterday_pf = sum(r.pf for r in records[-192:-96]) / max(1, len(records[-192:-96])) if len(records) >= 192 else 0.0
    
    month_kwh = sum(r.kwh for r in records) if records else 0.0
    month_kvah = sum(r.kvah for r in records) if records else 0.0
    month_pf = sum(r.pf for r in records) / max(1, len(records)) if records else 0.0
    
    active_apparent_series = []
    tod_series = []
    pf_series = []
    cd_series = []
    phase_series = []

    step = 1
    if time_range == "This Week":
        step = 4
    elif time_range in ["This Month", "Last Month"]:
        step = 16

    sampled_records = records[::step]
    tod_kwh = []
    
    for r in sampled_records:
        time_str = r.ts.strftime("%m-%d %H:%M") if step > 1 else r.ts.strftime("%H:%M")
        
        kw = round(r.kwh * 4.0, 1)
        kva = round(r.md_kva if r.md_kva > 0 else r.kvah * 4.0, 1)
        active_apparent_series.append({"time": time_str, "kw": kw, "kva": kva})
        
        h = r.ts.hour
        if h >= 18 and h <= 21:
            slot = "Peak"
        elif h >= 23 or h <= 5:
            slot = "Off-Peak"
        else:
            slot = "Normal"
        tod_series.append({"time": time_str, "kwh": round(r.kwh, 2), "slot": slot})
        tod_kwh.append(r.kwh)
        
        pf_series.append({"time": time_str, "pf": round(r.pf, 3)})
        
        utilization_pct = round((r.md_kva / contracted_kva) * 100, 1) if contracted_kva > 0 else 0.0
        cd_series.append({"time": time_str, "utilisation_pct": utilization_pct, "peak_kva": round(r.md_kva, 1)})
        
        v_r = r.v_r or 0.0
        v_y = r.v_y or 0.0
        v_b = r.v_b or 0.0
        avg_v = round((v_r + v_y + v_b) / 3.0, 2)
        
        i_r = r.i_r or 0.0
        i_y = r.i_y or 0.0
        i_b = r.i_b or 0.0
        avg_i = round((i_r + i_y + i_b) / 3.0, 2)
        
        phase_series.append({
            "time": time_str, 
            "v_r": v_r, "v_y": v_y, "v_b": v_b, "avg_v": avg_v,
            "i_r": i_r, "i_y": i_y, "i_b": i_b, "avg_i": avg_i
        })
    avg_kw = round(sum(item["kw"] for item in active_apparent_series) / max(1, len(active_apparent_series)), 1) if active_apparent_series else 0.0
    avg_kva = round(sum(item["kva"] for item in active_apparent_series) / max(1, len(active_apparent_series)), 1) if active_apparent_series else 0.0

    tod_min = round(min(tod_kwh), 2) if tod_kwh else 0.0
    tod_avg = round(sum(tod_kwh) / max(1, len(tod_kwh)), 2) if tod_kwh else 0.0
    tod_peak = round(max(tod_kwh), 2) if tod_kwh else 0.0

    pf_avg = round(sum(r.pf for r in records) / max(1, len(records)), 3) if records else 0.0
    cd_max_pct = round(max((r.md_kva / contracted_kva) * 100 for r in records), 1) if records and contracted_kva > 0 else 0.0

    valid_vr = [r for r in records if r.v_r]
    valid_vy = [r for r in records if r.v_y]
    valid_vb = [r for r in records if r.v_b]
    valid_ir = [r for r in records if r.i_r]
    valid_iy = [r for r in records if r.i_y]
    valid_ib = [r for r in records if r.i_b]

    phase_avg = {
        "v_r": round(sum(r.v_r for r in valid_vr) / max(1, len(valid_vr)), 2) if valid_vr else 0.0,
        "v_y": round(sum(r.v_y for r in valid_vy) / max(1, len(valid_vy)), 2) if valid_vy else 0.0,
        "v_b": round(sum(r.v_b for r in valid_vb) / max(1, len(valid_vb)), 2) if valid_vb else 0.0,
        "v_total": 0.0,
        "i_r": round(sum(r.i_r for r in valid_ir) / max(1, len(valid_ir)), 2) if valid_ir else 0.0,
        "i_y": round(sum(r.i_y for r in valid_iy) / max(1, len(valid_iy)), 2) if valid_iy else 0.0,
        "i_b": round(sum(r.i_b for r in valid_ib) / max(1, len(valid_ib)), 2) if valid_ib else 0.0,
        "i_total": 0.0
    }
    phase_avg["v_total"] = round((phase_avg["v_r"] + phase_avg["v_y"] + phase_avg["v_b"]) / 3, 2)
    phase_avg["i_total"] = round((phase_avg["i_r"] + phase_avg["i_y"] + phase_avg["i_b"]) / 3, 2)

    today_cost = today_kwh * 7.50
    yesterday_cost = yesterday_kwh * 7.50
    month_cost = month_kwh * 7.50

    def format_inr(amount: float) -> str:
        if amount >= 100000:
            return f"₹{round(amount / 100000.0, 2)}L"
        return f"₹{round(amount, 2):,}"

    return {
        "tenant_id": tenant_id,
        "time_range": time_range,
        "contracted_demand_kva": contracted_kva,
        "overview": {
            "today": {"energy_mwh": round(today_kwh / 1000.0, 2), "apparent_mvah": round(today_kvah / 1000.0, 2), "power_factor": round(today_pf, 3), "cost_inr": format_inr(today_cost)},
            "yesterday": {"energy_mwh": round(yesterday_kwh / 1000.0, 2), "apparent_mvah": round(yesterday_kvah / 1000.0, 2), "power_factor": round(yesterday_pf, 3), "cost_inr": format_inr(yesterday_cost)},
            "this_month": {"energy_mwh": round(month_kwh / 1000.0, 2), "apparent_mvah": round(month_kvah / 1000.0, 2), "power_factor": round(month_pf, 3), "cost_inr": format_inr(month_cost)}
        },
        "active_apparent": {"series": active_apparent_series, "avg_kw": avg_kw, "avg_kva": avg_kva},
        "time_of_day": {"series": tod_series, "min_kwh": tod_min, "avg_kwh": tod_avg, "peak_kwh": tod_peak},
        "power_factor": {"series": pf_series, "today_avg": pf_avg, "rebate_threshold": 0.92, "penalty_threshold": 0.86},
        "contract_demand": {"series": cd_series, "utilisation_pct": cd_max_pct, "contracted_kva": contracted_kva},
        "phase_balance": {"series": phase_series, "averages": phase_avg}
    }
