# 五阶段流水线架构 (v2 配置驱动版)

## 整体架构

```
目标项目
├── .claude/
│   ├── phase-config.json          <-- 所有 hook 行为的单一配置源
│   ├── CLAUDE.md                  <-- 主规范（引用 phase-config.json）
│   ├── karpathy.md                <-- Karpathy 编码原则
│   ├── settings.json              <-- hooks 注册
│   ├── settings.local.json        <-- 权限白名单
│   ├── hooks/
│   │   ├── lib/phase-detector.js  <-- 配置驱动的阶段检测引擎
│   │   ├── phase-guard.js         <-- 统一守卫（阶段+危险命令）
│   │   ├── phase-reminder.js      <-- 配置驱动的阶段提醒
│   │   ├── startup-check.js       <-- 配置驱动的环境检查
│   │   └── check-gstack.sh       <-- GStack 检查（openspec-gstack 预设）
│   ├── standards/                 <-- 编码规范（按技术栈生成）
│   └── skills/                    <-- OpenSpec + Superpowers skills
└── openspec/                      <-- OpenSpec 变更管理（filesystem 策略时）
```

## 配置驱动架构

```
phase-config.json (单一配置源)
    |
    +-- pipeline.phases      --> phase-reminder.js (阶段信息注入)
    |                         --> phase-guard.js   (阶段守卫规则)
    |
    +-- detection             --> phase-detector.js (阶段检测策略)
    |                         --> detect-project-phase.js
    |
    +-- source_patterns       --> phase-guard.js (源码文件判定)
    |
    +-- guard.rules           --> phase-guard.js (工具操作守卫)
    +-- guard.skill_rules     --> phase-guard.js (Skill 调用守卫)
    +-- guard.dangerous_cmds  --> phase-guard.js (危险命令拦截)
    |
    +-- environment.checks    --> startup-check.js (环境检查)
    |
    +-- skill_routing         --> phase-guard.js (Skill 路由)
```

## Hooks 调用链

```
SessionStart
  └─> startup-check.js
       ├─ 读取 phase-config.json environment.checks
       ├─ 逐项执行检查
       └─ 调用 phase-detector.js 检测当前阶段

UserPromptSubmit
  └─> phase-reminder.js
       ├─ 调用 phase-detector.js 获取当前阶段
       ├─ 读取 pipeline.phases 获取阶段信息
       └─ 注入阶段提醒到上下文

PreToolUse (Skill|Edit|Write|Bash)
  └─> phase-guard.js
       ├─ 危险命令检查（guard.dangerous_commands，与阶段无关）
       ├─ 调用 phase-detector.js 获取当前阶段
       ├─ 源码文件判定（source_patterns）
       ├─ 工具操作守卫（guard.rules）
       ├─ Skill 调用守卫（guard.skill_rules）
       └─ 返回 allow/deny + 原因
```

## 阶段检测策略

### filesystem
```
openspec/changes/<change-id>/
├── proposal.md    STATUS: APPROVED  --> 阶段2
├── tasks.md       STATUS: IN_PROGRESS  --> 阶段3
├── tasks.md       STATUS: DONE  --> 阶段4
└── qa_report.md   RESULT: PASS  --> 阶段5
                    RESULT: FAIL  --> 阶段4(qa_failed)
```

### state-file
```
.claude/phase-state.json
{
  "phase": 3,
  "reason": "编码执行中",
  "updated_at": "..."
}
```

AI 推进阶段时必须调用 writePhaseState() 更新此文件。

### custom
调用 phase-config.json 中指定的脚本，输出标准 JSON。

## 关键设计决策

1. **单一配置源**: 所有 hook 从同一个 phase-config.json 读取，避免分散配置导致不一致
2. **检测策略可插拔**: filesystem/state-file/custom 三种策略，通过配置切换不需要改代码
3. **守卫统一**: phase-guard.js 同时处理阶段守卫和危险命令拦截，不再分两个文件
4. **安装自动化**: install-dependencies.js 检测+自动安装 OpenSpec/GStack/Superpowers
5. **执行顺序关键**: openspec init 必须在生成 .claude/ 文件之前，Superpowers 必须在 openspec init 之后

## 从 v1 迁移

v1 用户（有 openspec/changes/ 但无 phase-config.json）：
phase-detector.js 内置 legacy 检测逻辑，自动走旧版路径。
建议创建 phase-config.json 迁移到配置驱动。
