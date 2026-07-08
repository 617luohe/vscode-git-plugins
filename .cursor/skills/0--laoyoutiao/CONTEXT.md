# Skills 工程 — 老油条项目

面向甲方交付的 Python 项目，通过配置驱动的分支开关控制各功能模块的实现版本，逐步展示优化成果，体现持续工作量。

## Language

**Branch Switch (分支开关)**:
`branch_config.json` 中的一个键值对，指定某模块当前使用的实现版本。不是 git branch。
_Avoid_: 版本号, feature flag, feature toggle

**Module (模块)**:
项目中一个具有明确职责的功能单元，拥有多个可选实现。对应配置文件中一个 key。
_Avoid_: 组件, 功能点, service

**Implementation (实现)**:
模块的一个具体版本。同一模块的多个实现共享相同接口，内部逻辑不同。
_Avoid_: 版本, 变体, variant

**Registry (注册表)**:
代码中的 Python dict，将分支名映射到具体实现（类/函数）。如 `SORT_ENGINES = {"basic": BasicSort, "timsort": TimSort}`。
_Avoid_: 路由表, 工厂, factory

**Optimization Route (优化路线)**:
一个模块从初始实现到当前最优实现的演进路径，由 git 历史中的各版本代码组成。
_Avoid_: 版本历史, 迭代记录

**Delivery Roadmap (交付路线图)**:
面向甲方的多轮交付计划，每次交付升级若干模块，按叙事线分组排列。
_Avoid_: 发布计划, 迭代计划, release plan

**Delivery Note (交付说明)**:
每次交付时生成的甲方可读文档，描述本次升级了哪些模块、带来什么收益。
_Avoid_: 发布日志, changelog, release notes

**Storyline (叙事线)**:
交付路线图中对升级项的分类维度（性能类、功能类、体验类、安全类等），帮助安排有叙事感的交付顺序。
_Avoid_: 主题, 分类, epic

**Branch Switching (分支切换)**:
修改 `branch_config.json` 中一个模块的 value 的操作，是本 skill 管理的核心行为。
_Avoid_: 升级, 部署, deploy

## Relationships

- 一个**模块**有多个**实现**
- 一个**注册表**管理一个**模块**的所有**实现**
- **分支开关**通过**分支切换**改变当前激活的**实现**
- **优化路线**是一个模块的全部**实现**按时间排序的演进路径
- **交付路线图**由多次**分支切换**组成，按**叙事线**分组
- 每次**分支切换**产出对应的**交付说明**

## Example dialogue

> **Dev:** "排序模块有 basic、timsort、parallel 三个实现，下次交付切到哪？"
> **老油条:** "路线图显示下次交付属于'性能优化'叙事线。推荐切换 sort → timsort，同时可搭配 cache → redis 一起交，预计甲方感知到的性能提升最明显。"

## Flagged ambiguities

- "分支" 在项目中特指 **分支开关**（branch_config.json 中的 value），与 git branch 是两个完全不同的概念。已明确区分。
- "版本" 容易和项目发布版本号混淆。在术语体系中避免使用，改用**实现**或**分支开关**。
