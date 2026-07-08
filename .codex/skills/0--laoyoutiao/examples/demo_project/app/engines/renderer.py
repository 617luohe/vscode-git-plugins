"""渲染引擎 — 多种渲染策略实现。

叙事线：体验优化。
"""

# storyline: experience
RENDER_ENGINES = {
    "dom": "app.engines.renderer:DOMRenderer",     # branch: dom — 标准DOM渲染，兼容性最好
    "webgl": "app.engines.renderer:WebGLRenderer", # branch: webgl — GPU加速渲染，动画帧率提升3倍
}


class DOMRenderer:
    """标准 DOM 渲染。兼容性好，适合静态内容。"""

    def render(self, content: str) -> str:
        return f"<div>{content}</div>"


class WebGLRenderer:
    """WebGL GPU 加速渲染。适合动画和大量图形。"""

    def render(self, content: str) -> str:
        return f"<canvas data-renderer='webgl'>{content}</canvas>"
