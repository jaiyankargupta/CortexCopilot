from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import time
import json
from db.database import get_db
from models.models import AuditLog
from orchestrator.agent import run_copilot_stream

router = APIRouter(prefix="/api/v1/copilot", tags=["Copilot"])


class ChatRequest(BaseModel):
    query: str
    conversation_id: str = "default"


@router.post("/chat")
async def chat_stream(req: ChatRequest, tenant_id: str = "T_STEEL_DURGAPUR", db: Session = Depends(get_db)):
    start_time = time.time()

    async def event_generator():
        response_text = ""
        guard_status = "UNKNOWN"
        tool_executed = ""
        tool_payload = None

        async for event in run_copilot_stream(db, tenant_id, req.query):
            evt_type = event.get("type")
            evt_data = event.get("data", {})

            if evt_type == "tool_start":
                tool_executed = evt_data.get("tool", "")
            elif evt_type == "tool_result":
                tool_payload = evt_data.get("payload_summary")
            elif evt_type == "message_chunk":
                response_text += evt_data.get("chunk", "")
            elif evt_type == "guard_verification":
                guard_status = evt_data.get("status", "UNKNOWN")

            yield f"event: {evt_type}\ndata: {json.dumps(evt_data)}\n\n"

        latency_ms = int((time.time() - start_time) * 1000)
        
        try:
            log_entry = AuditLog(
                tenant_id=tenant_id,
                user_query=req.query,
                tool_executed=tool_executed,
                tool_payload_summary={"summary": str(tool_payload)[:200]} if tool_payload else {},
                cortex_guard_status=guard_status,
                llm_response=response_text[:1000],
                latency_ms=latency_ms
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()

        yield f"event: done\ndata: {json.dumps({'conversation_id': req.conversation_id, 'latency_ms': latency_ms})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
