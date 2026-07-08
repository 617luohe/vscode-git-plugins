"""认证提供者 — 多种认证策略实现。

叙事线：安全加固。
"""

# storyline: security
AUTH_PROVIDERS = {
    "basic": "app.auth.providers:BasicAuth",   # branch: basic — 用户名密码认证
    "oauth": "app.auth.providers:OAuthAuth",   # branch: oauth — OAuth 2.0 第三方登录
    "sso": "app.auth.providers:SSOAuth",       # branch: sso — 企业单点登录
}


class BasicAuth:
    """用户名密码认证。适合内部系统。"""

    def authenticate(self, username: str, password: str) -> bool:
        return username == "admin" and password == "admin123"


class OAuthAuth:
    """OAuth 2.0 认证。支持 Google/GitHub/微信登录。"""

    def authenticate(self, token: str) -> bool:
        return token.startswith("oauth_")


class SSOAuth:
    """企业 SSO 单点登录。支持 SAML/LDAP 协议。"""

    def authenticate(self, ticket: str) -> bool:
        return ticket.startswith("sso_")
