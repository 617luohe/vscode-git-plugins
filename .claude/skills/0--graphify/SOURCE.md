# 上游来源

| 字段 | 值 |
|---|---|
| 项目 | [graphify](https://github.com/safishamsi/graphify) |
| 仓库 | `reference-skills/graphify/` |
| 分支 | `v8` |
| 整合日期 | 2026-06-22 |
| 本地 skill 名 | `0--graphify` |
| 上游 skill 文件 | `graphify/skill-windows.md` + `graphify/skills/windows/references/` |

## 更新方式

```powershell
cd reference-skills/graphify
git fetch origin v8
git checkout v8
git pull origin v8
```

然后对比 `graphify/skill-windows.md` 与 `my-skills/0--graphify/SKILL.md`，以及 `references/` 目录差异，按需合并（保留本地 `0--graphify` 命名与中文说明）。
