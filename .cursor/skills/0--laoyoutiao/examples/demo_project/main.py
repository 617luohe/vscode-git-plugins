"""老油条 示例项目 — 主入口。

演示如何通过 branch_config.json + 注册表控制模块实现选择。
"""

import json
import importlib
from pathlib import Path


def load_config() -> dict:
    """加载分支开关配置。"""
    config_path = Path(__file__).parent / "branch_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}


def load_implementation(module_path: str):
    """从 'module.path:ClassName' 字符串动态加载实现类。"""
    mod, cls = module_path.split(":")
    module = importlib.import_module(mod)
    return getattr(module, cls)


class App:
    """应用主类，通过分支配置选择各模块的实现。"""

    def __init__(self):
        self.config = load_config()

        # 排序引擎
        sort_impl = self.config.get("sort", "basic")
        sort_cls = load_implementation(SORT_REGISTRY[sort_impl])
        self.sort_engine = sort_cls()

        # 缓存后端
        cache_impl = self.config.get("cache", "memory")
        cache_cls = load_implementation(CACHE_REGISTRY[cache_impl])
        self.cache = cache_cls()

        # 渲染引擎
        render_impl = self.config.get("renderer", "dom")
        render_cls = load_implementation(RENDER_REGISTRY[render_impl])
        self.renderer = render_cls()

        # 认证提供者
        auth_impl = self.config.get("auth", "basic")
        auth_cls = load_implementation(AUTH_REGISTRY[auth_impl])
        self.auth = auth_cls()

    def status(self):
        """打印当前各模块使用的实现。"""
        print("当前分支配置：")
        for module, branch in self.config.items():
            print(f"  {module} → {branch}")


# ── 注册表（引用各模块的注册表值，简化 import 路径管理） ──

# 这些在实际项目中可以直接 import，这里映射为简化形式
SORT_REGISTRY = {
    "basic": "app.engines.sort:BasicSort",
    "timsort": "app.engines.sort:TimSort",
    "parallel": "app.engines.sort:ParallelSort",
}

CACHE_REGISTRY = {
    "memory": "app.engines.cache:MemoryCache",
    "redis": "app.engines.cache:RedisCache",
    "memcached": "app.engines.cache:MemcachedCache",
}

RENDER_REGISTRY = {
    "dom": "app.engines.renderer:DOMRenderer",
    "webgl": "app.engines.renderer:WebGLRenderer",
}

AUTH_REGISTRY = {
    "basic": "app.auth.providers:BasicAuth",
    "oauth": "app.auth.providers:OAuthAuth",
    "sso": "app.auth.providers:SSOAuth",
}


if __name__ == "__main__":
    app = App()
    app.status()
