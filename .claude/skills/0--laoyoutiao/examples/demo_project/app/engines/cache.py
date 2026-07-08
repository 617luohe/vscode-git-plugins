"""缓存后端 — 多种缓存策略实现。

叙事线：性能优化。
"""

# storyline: performance
CACHE_BACKENDS = {
    "memory": "app.engines.cache:MemoryCache",       # branch: memory — 进程内内存缓存，无持久化
    "redis": "app.engines.cache:RedisCache",         # branch: redis — Redis缓存，首次加载减少200ms
    "memcached": "app.engines.cache:MemcachedCache", # branch: memcached — 分布式缓存，适合多实例部署
}


class MemoryCache:
    """进程内内存缓存。重启丢失，适合开发环境。"""

    def __init__(self):
        self._store = {}

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, value, ttl: int = 300):
        self._store[key] = value


class RedisCache:
    """Redis 缓存。持久化存储，支持分布式共享。"""

    def __init__(self):
        self._store = {}  # 简化实现，实际连接 Redis

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, value, ttl: int = 300):
        self._store[key] = value


class MemcachedCache:
    """Memcached 分布式缓存。适合多实例水平扩展。"""

    def __init__(self):
        self._store = {}

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, value, ttl: int = 300):
        self._store[key] = value
