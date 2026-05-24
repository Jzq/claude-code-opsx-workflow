---
name: claude-code-opsx-workflow
description: "为 Claude Code 项目生成配置驱动的五阶段自动化开发流程。通过 phase-config.json 驱动所有 hook 行为，支持 filesystem/state-file/custom 三种检测策略，内置 OpenSpec+GStack 和最小化两套预设。"
version: 1.0.0
author: jizhiqiang
license: MIT
metadata:
  hermes:
    tags: [claude-code, phase-guard, workflow, hooks, config-driven]
    related_skills: [claude-code, virtual-team-setup]
---

# Claude Code 五阶段流水线

## Overview

为 Claude Code 项目生成五阶段自动化开发流程。所有 hook 行为由 `phase-config.json` 单一配置驱动。

五阶段：需求澄清 → 任务规划 → 编码执行 → 质量门禁 → 提交归档

三种检测策略：
- **filesystem**: 从文件系统状态推导（适用于 OpenSpec 等文件驱动项目）
- **state-file**: 读写 JSON 状态文件（零依赖，任何项目可用）
- **custom**: 调用自定义检测脚本

## Skill 目录结构

```
claude-code-opsx-workflow/
├── SKILL.md
├── scripts/
│   ├── install-dependencies.js
│   ├── validate-setup.js
│   └── detect-project-phase.js
└── templates/
    ├── phase-config.json
    ├── presets/
    │   ├── openspec-gstack.json
    │   └── minimal.json
    ├── hooks/
    │   ├── lib/phase-detector.js
    │   ├── phase-guard.js
    │   ├── phase-reminder.js
    │   ├── startup-check.js
    │   └── check-gstack.sh
    ├── settings.json
    └── karpathy.md
```

## 目标项目生成的文件

```
<项目根目录>/
├── CLAUDE.md                          # 主规范文件（项目根目录）
└── .claude/
    ├── phase-config.json              # 核心：驱动所有 hook 行为
    ├── karpathy.md                    # Karpathy 编码原则
    ├── settings.json                  # hooks 注册
    ├── settings.local.json            # 权限白名单
    ├── hooks/
    │   ├── lib/phase-detector.js
    │   ├── phase-guard.js
    │   ├── phase-reminder.js
    │   ├── startup-check.js
    │   └── check-gstack.sh           # 仅 openspec-gstack 预设
    ├── standards/                     # 编码规范
    └── skills/                        # OpenSpec + Superpowers
```

## 使用方式

```
给 /path/to/my-project 搭建五阶段开发流程
```

或指定技术栈：
```
给 /path/to/my-project 搭建五阶段开发流程，技术栈是 React+Express，不用 OpenSpec
```

agent 加载此 skill 后全自动完成。

## 自动执行步骤

### 1. 采集信息

- 目标项目路径
- 技术栈（从 package.json/requirements.txt 推断）
- 是否使用 OpenSpec/GStack（未指定时默认使用完整版）
- 源码目录结构（扫描 src/lib/app 等）

### 2. 检测与安装依赖

运行 `node scripts/install-dependencies.js <项目路径> --install`

| 依赖 | 检测方式 | 自动安装 |
|------|---------|---------|
| OpenSpec CLI | openspec --version | npm install -g |
| GStack | ~/.claude/skills/gstack/ | git clone |
| Superpowers | .claude/skills/using-superpowers/ | npx superpowers-zh |
| Node.js | node --version | 给提示 |
| Python | python3 --version | 给提示 |

### 3. 初始化 OpenSpec（仅 openspec-gstack 预设）

**必须在第4步之前！** 在项目目录执行 `openspec init`。

### 4. 安装 Superpowers（仅 openspec-gstack 预设）

**必须在 openspec init 之后！** 执行 `npx superpowers-zh --tool claude-code`。

### 5. 生成配置文件

- 默认 openspec-gstack 预设，不用 OpenSpec → `presets/minimal.json`
- 替换 source_patterns 和 environment.checks 为实际值
- 写入 `<项目>/.claude/phase-config.json`

### 6. 复制 hook 文件

- `lib/phase-detector.js` → `.claude/hooks/lib/`
- `phase-guard.js` / `phase-reminder.js` / `startup-check.js` → `.claude/hooks/`
- `check-gstack.sh` → `.claude/hooks/`（openspec-gstack 预设时）

### 7. 复制其余模板

- `settings.json` → `.claude/settings.json`
- `karpathy.md` → `.claude/karpathy.md`

### 8. 生成项目特定文件

- `CLAUDE.md`（项目根目录）：引用 phase-config.json，声明技术栈和规则
- `.claude/settings.local.json`：按技术栈定制权限白名单
- `.claude/standards/`：按技术栈生成编码规范

### 9. 验证

运行 `node scripts/validate-setup.js <项目路径>`，确认 valid=true。

### 10. 汇报结果

输出文件清单、预设和检测策略、验证结果、下一步提示。

## 常见陷阱

1. **openspec init 会覆盖 .claude/ 文件**: 必须在 openspec init 之后再生成配置/hooks。执行顺序：检测 → 安装 → openspec init → Superpowers → 生成项目文件
2. **settings.local.json 工具名首字母大写**: 正确 `"Bash(npm run dev)"`，错误 `"npm run dev"`
3. **source_patterns 过宽过窄**: 太宽误拦截，太窄守卫失效
4. **state-file 状态同步**: AI 必须调用 writePhaseState() 更新状态
5. **hook 文件 lib/ 子目录**: phase-detector.js 必须在 `.claude/hooks/lib/` 下
6. **filesystem 规则顺序**: 精确规则（all_of）应在宽泛规则（file_not_contains）之前

## 全局强制规则

1. 严格按阶段顺序执行，禁止跨阶段
2. 所有产出落地文件，禁止口头交付
3. 需求变更立即终止返回阶段1
4. 阶段1/2 禁用 Superpowers
5. 严格遵循 TDD，禁止跳过测试
6. 工具缺失或环境异常立即终止
7. QA FAIL 禁止强行归档，返回阶段3修复
8. 拒绝过早抽象、过度工程
9. 代码优先直白可读
10. 先实现可运行版本，再优化
11. 配置驱动优于硬编码，预设优于从零搭建

## 验证清单

- [ ] install-dependencies.js --check-only 确认依赖已安装
- [ ] openspec init 在生成 .claude/ 文件之前执行
- [ ] Superpowers 在 openspec init 之后安装
- [ ] .claude/phase-config.json 存在且格式正确
- [ ] detection.strategy 已选择且有对应子配置
- [ ] source_patterns 与项目源码路径匹配
- [ ] .claude/hooks/lib/phase-detector.js 存在
- [ ] .claude/hooks/phase-guard.js 存在
- [ ] .claude/settings.json 注册了 PreToolUse/UserPromptSubmit/SessionStart
- [ ] 项目根目录 CLAUDE.md 引用了 phase-config.json
- [ ] .claude/standards/ 包含编码规范
- [ ] validate-setup.js 确认 valid=true
