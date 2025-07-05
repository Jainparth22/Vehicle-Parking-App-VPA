import redis
import json
from flask import current_app

_redis_client = None


def get_redis():
    """Get Redis client (singleton with reconnect logic)"""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
                decode_responses=True,
                socket_connect_timeout=2
            )
            _redis_client.ping()
        except Exception as e:
            print(f'[!] Redis connection failed: {e}')
            _redis_client = None
    else:
        try:
            _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client
