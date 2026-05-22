---
name: claude-code-opsx-workflow
description: "为 Claude Code 项目生成配置驱动的五阶段自动化开发流程。通过 phase-config.json 驱动所有 hook 行为，支持三种检测策略（filesystem/state-file/custom），内置 OpenSpec+GStack 和最小化两套预设，依赖缺失时自动检测安装。"
version: 2.1.0
author: jizhiqiang
license: MIT
metadata:
  hermes:
    tags: [claude-code, phase-guard, workflow, hooks, config-driven]
    related_skills: [claude-code, virtual-team-setup]
---

# Claude Code 五阶段流水线 (v2 配置驱动版)

## Overview

为 Claude Code 项目生成一整套五阶段自动化开发流程规范。所有 hook 行为由 `phase-config.json` 单一配置文件驱动，不再硬编码任何工具链或路径。依赖缺失时自动检测安装。

五阶段流水线：
- 阶段1: 需求澄清与方案设计
- 阶段2: 任务规划与确认
- 阶段3: 编码执行与迭代
- 阶段4: 质量门禁校验
- 阶段5: 提交归档与清理

三种阶段检测策略：
- **filesystem**: 从文件系统状态推导（适用于 OpenSpec 等文件驱动项目）
- **state-file**: 从 JSON 文件读写状态（零依赖，任何项目可用）
- **custom**: 调用自定义检测脚本（完全可定制）

## Skill 目录结构

```
claude-code-opsx-workflow/
├── SKILL.md                              # 主技能文档
├── references/
│   └── architecture.md                   # v2 架构说明
├── scripts/
│   ├── install-dependencies.js           # 依赖检测与自动安装
│   ├── validate-setup.js                 # 验证搭建完整性 + 配置校验
│   └── detect-project-phase.js           # 检测当前阶段 + 策略信息
└── templates/
    ├── phase-config.json                 # 配置模板（含注释说明）
    ├── presets/
    │   ├── openspec-gstack.json          # OpenSpec + GStack 完整预设
    │   └── minimal.json                  # 最小预设（零依赖）
    ├── hooks/
    │   ├── lib/phase-detector.js         # 配置驱动的阶段检测引擎
    │   ├── phase-guard.js                # 配置驱动的统一守卫（阶段+危险命令）
    │   ├── phase-reminder.js             # 配置驱动的阶段提醒
    │   ├── startup-check.js              # 配置驱动的环境检查
    │   └── check-gstack.sh              # GStack 检查（openspec-gstack 预设需要）
    ├── settings.json                     # hooks 注册配置
    └── karpathy.md                       # Karpathy 编码原则
```

## 目标项目生成的文件清单

```
.claude/
├── phase-config.json                  # 核心：驱动所有 hook 行为
├── CLAUDE.md                          # 主规范文件
├── karpathy.md                        # Karpathy 编码原则
├── settings.json                      # hooks 注册
├── settings.local.json                # 权限白名单
├── hooks/
│   ├── lib/phase-detector.js          # 阶段检测引擎
│   ├── phase-guard.js                 # 统一守卫（阶段+危险命令）
│   ├── phase-reminder.js              # 阶段提醒注入
│   ├── startup-check.js               # 环境检查
│   └── check-gstack.sh               # GStack 检查（仅 openspec-gstack 预设）
├── standards/                         # 编码规范（按技术栈）
└── skills/                            # Claude Code skills（OpenSpec + Superpowers）
```

## phase-config.json 结构

配置文件是整个流水线的核心，所有 hook 从此文件读取行为：

```json
{
  "version": 1,
  "pipeline": { "phases": { "1": {...}, "2": {...}, ... } },
  "detection": {
    "strategy": "state-file | filesystem | custom",
    "state_file": { ... },
    "filesystem": { ... },
    "custom": { ... }
  },
  "source_patterns": ["src/", "lib/"],
  "guard": {
    "rules": [...],
    "skill_rules": [...],
    "dangerous_commands": { "enabled": true, "patterns": [...] }
  },
  "environment": { "checks": [...] },
  "skill_routing": { "enabled": false, "check_script": "", "routes": {} }
}
```

## 三种检测策略详解

### filesystem 策略
从文件系统状态推导当前阶段，适用于 OpenSpec 等文件驱动项目。
支持条件：no_active_change / file_missing / file_exists / file_contains / file_not_contains / all_of / any_of

### state-file 策略
零依赖，读写 `.claude/phase-state.json`，AI 推进阶段时调用 `writePhaseState()`。

### custom 策略
调用自定义检测脚本，输出标准 JSON 格式。

## 一句话使用

```
给 /path/to/my-project 搭建五阶段开发流程
```

或更具体：

```
给 /path/to/my-project 搭建五阶段开发流程，技术栈是 React+Express，不用 OpenSpec
```

agent 加载此 skill 后全自动完成，你只需要等结果。

## 自动执行步骤

### 1. 采集信息

- 目标项目路径（用户指定或当前目录）
- 技术栈（从项目文件推断：package.json/requirements.txt 等）
- 是否使用 OpenSpec/GStack（用户指定；未指定时默认使用完整版）
- 项目源码目录结构（扫描 src/lib/app/frontend/backend 等）

### 2. 检测与安装依赖

运行 `node scripts/install-dependencies.js <项目路径> --install`

自动检测并安装：

| 依赖 | 检测方式 | 自动安装 |
|------|---------|---------|
| OpenSpec CLI | openspec --version | npm install -g @fission-ai/openspec |
| GStack | ~/.claude/skills/gstack/ 目录 | git clone 到 ~/.claude/skills/gstack/ |
| Superpowers | .claude/skills/using-superpowers/ | npx superpowers-zh --tool claude-code |
| Node.js | node --version | 无法自动安装，给提示 |
| Python | python3 --version | 无法自动安装，给提示 |

安装完成后 `--check-only` 再确认一轮。

### 3. 初始化 OpenSpec（仅 openspec-gstack 预设）

**必须在第4步之前执行！** `openspec init` 会覆盖 .claude/ 下的文件。
在项目目录执行 `openspec init`，创建 openspec/ 目录和 .claude/skills/ 下的 OpenSpec skills。

### 4. 安装 Superpowers（仅 openspec-gstack 预设）

**必须在 openspec init 之后执行！** openspec init 会覆盖 .claude/skills/ 目录。
在项目目录执行 `npx superpowers-zh --tool claude-code`。

### 5. 生成配置文件

- 默认使用 openspec-gstack 预设（用户未明确说"不用 OpenSpec"时）
- 不用 OpenSpec/GStack → 读 `presets/minimal.json`
- 替换 source_patterns 为扫描到的实际源码路径
- 替换 environment.checks 为技术栈对应的环境检查项
- 写入 `<项目>/.claude/phase-config.json`

### 6. 复制 hook 文件（通用，无需修改）

- `lib/phase-detector.js` → `.claude/hooks/lib/phase-detector.js`
- `phase-guard.js` → `.claude/hooks/phase-guard.js`
- `phase-reminder.js` → `.claude/hooks/phase-reminder.js`
- `startup-check.js` → `.claude/hooks/startup-check.js`
- `check-gstack.sh` → `.claude/hooks/check-gstack.sh`（openspec-gstack 预设时）

### 7. 复制其余模板

- `templates/settings.json` → `.claude/settings.json`
- `templates/karpathy.md` → `.claude/karpathy.md`

### 8. 生成项目特定文件

- `.claude/CLAUDE.md`：引用 phase-config.json 阶段定义，声明技术栈和全局规则
- `.claude/settings.local.json`：按技术栈定制权限白名单
- `.claude/standards/`：按技术栈生成编码规范

### 9. 验证

运行 `node scripts/validate-setup.js <项目路径>`，确认 valid=true。

### 10. 汇报结果

输出：生成的文件清单、使用的预设和检测策略、验证结果、下一步提示。

## 常见陷阱

1. **openspec init 会覆盖 .claude/ 文件**: 必须在 openspec init 之后再生成 phase-config.json/CLAUDE.md/hooks 等。执行顺序：检测依赖 → 安装 → openspec init → 安装 Superpowers → 生成项目文件。顺序反了文件会被覆盖。

2. **Superpowers 安装时机**: openspec init 会覆盖 .claude/skills/ 目录，必须在 openspec init 之后再装 Superpowers。

3. **settings.local.json 工具名必须首字母大写**: Claude Code 要求 permissions.allow 中的工具名首字母大写，命令用括号包裹。正确格式：`"Bash(npm run dev)"`、`"Read"`、`"Edit"`。错误格式：`"npm run dev"`、`"cat"`。

3. **source_patterns 过宽或过窄**: 太宽会把 .claude/ 下文件也识别为源码，太窄则守卫失效。

4. **state-file 策略的状态同步**: AI 必须调用 writePhaseState() 更新状态文件。

5. **复制 hook 文件时 lib/ 子目录容易遗漏**: phase-detector.js 必须在 .claude/hooks/lib/ 下。

6. **install-dependencies.js 安装后验证**: npx/git clone 安装后文件系统可能延迟同步，脚本已加入延迟重试（最多3次）。如果重试后仍报未安装但安装命令没报错，会标记 maybe_installed，建议用 `--check-only` 再跑一次手动确认。

## 11条全局强制规则

1. 严格按阶段顺序执行，禁止跨阶段推进
2. 所有开发产出必须落地文件，禁止口头交付
3. 开发中发现需求变更，立即终止返回阶段1
4. 阶段1/2禁用Superpowers
5. 严格遵循TDD，禁止跳过测试直接写业务代码
6. 任意工具缺失或环境异常，立即终止
7. QA FAIL禁止强行归档，必须返回阶段3修复
8. 拒绝过早抽象、过度工程、无意义泛化设计
9. 代码优先直白可读，其次简洁，最后追求优雅
10. 先实现可运行版本，再逐步优化
11. 配置驱动优于硬编码，预设优于从零搭建

## 验证清单

- [ ] install-dependencies.js --check-only 确认依赖已安装
- [ ] openspec init 在生成 .claude/ 文件之前执行
- [ ] Superpowers 在 openspec init 之后安装
- [ ] .claude/phase-config.json 存在且 JSON 格式正确
- [ ] detection.strategy 已选择且有对应子配置
- [ ] source_patterns 与项目源码路径匹配
- [ ] .claude/hooks/lib/phase-detector.js 存在
- [ ] .claude/hooks/phase-guard.js 存在
- [ ] .claude/settings.json 注册了 PreToolUse/UserPromptSubmit/SessionStart
- [ ] CLAUDE.md 引用了 phase-config.json 的阶段定义
- [ ] .claude/standards/ 包含项目对应的编码规范
- [ ] validate-setup.js 确认 valid=true
