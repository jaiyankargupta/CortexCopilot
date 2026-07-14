import os
import json
import time
import logging
import ssl
from typing import Any, Optional
from urllib.request import Request, urlopen
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Upstash Redis Free Tier REST API configuration
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "").strip().rstrip("/")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()

# Create SSL context resilient to macOS certificate store missing root CAs
try:
    import certifi
    _ssl_context = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _ssl_context = ssl._create_unverified_context()

# In-memory fallback cache dictionary (key -> (expiry_ts, data))
_memory_cache: dict[str, tuple[float, Any]] = {}


def _upstash_exec(command: list[Any]) -> Optional[Any]:
    """Execute standard Redis command array against Upstash HTTP REST endpoint."""
    if not UPSTASH_REDIS_REST_URL or not UPSTASH_REDIS_REST_TOKEN:
        return None
    try:
        payload = json.dumps(command).encode("utf-8")
        req = Request(
            UPSTASH_REDIS_REST_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(req, timeout=5, context=_ssl_context) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("result")
    except Exception as e:
        logger.warning(f"Upstash Redis command {command[0]} error: {e}")
        return None


def cache_get(key: str) -> Optional[Any]:
    # 1. Check Upstash Redis via POST command array
    result = _upstash_exec(["GET", key])
    if result is not None:
        try:
            return json.loads(result)
        except Exception:
            return result

    # 2. Fallback to in-memory TTL cache
    item = _memory_cache.get(key)
    if item:
        expiry_ts, val = item
        if time.time() < expiry_ts:
            return val
        else:
            _memory_cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    serialized = json.dumps(value, default=str)
    success = False

    # 1. Write to Upstash Redis via POST command array ["SET", key, value, "EX", ttl]
    res = _upstash_exec(["SET", key, serialized, "EX", str(ttl_seconds)])
    if res == "OK":
        success = True
        logger.info(f"Upstash Redis successfully cached key: {key}")

    # 2. Always keep in-memory fallback updated
    _memory_cache[key] = (time.time() + ttl_seconds, value)
    return success
