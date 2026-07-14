from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Index, ForeignKey
from sqlalchemy.sql import func
from db.database import Base


class TenantConfig(Base):
    __tablename__ = "tenant_config"

    tenant_id = Column(String(64), primary_key=True, index=True)
    company_name = Column(String(128), nullable=False)
    contracted_demand_kva = Column(Float, nullable=False)
    
    tariff_config_json = Column(JSON, nullable=False)
    pf_rules_json = Column(JSON, nullable=False)
    shift_schedule_json = Column(JSON, nullable=False)
    machine_map_json = Column(JSON, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TenantAuth(Base):
    __tablename__ = "tenant_auth"

    tenant_id = Column(String(64), ForeignKey("tenant_config.tenant_id", ondelete="CASCADE"), primary_key=True, index=True)
    password = Column(String(128), nullable=False)
    role = Column(String(32), default="plant_manager")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenant_config.tenant_id", ondelete="CASCADE"), nullable=False, index=True)
    meter_id = Column(String(64), nullable=False, index=True)
    ts = Column(DateTime(timezone=True), nullable=False, index=True)

    kwh = Column(Float, nullable=False)
    kvah = Column(Float, nullable=False)
    kvarh = Column(Float, nullable=True)
    
    pf = Column(Float, nullable=False)
    md_kva = Column(Float, nullable=False)

    v_r = Column(Float, nullable=True)
    v_y = Column(Float, nullable=True)
    v_b = Column(Float, nullable=True)
    i_r = Column(Float, nullable=True)
    i_y = Column(Float, nullable=True)
    i_b = Column(Float, nullable=True)

    thd_v = Column(Float, nullable=True)
    thd_i = Column(Float, nullable=True)
    freq = Column(Float, nullable=True)

    __table_args__ = (
        Index("idx_telemetry_tenant_ts", "tenant_id", "ts"),
        Index("idx_telemetry_tenant_meter_ts", "tenant_id", "meter_id", "ts"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    user_query = Column(String, nullable=False)
    tool_executed = Column(String, nullable=True)
    tool_payload_summary = Column(JSON, nullable=True)
    cortex_guard_status = Column(String(32), nullable=False)
    llm_response = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
