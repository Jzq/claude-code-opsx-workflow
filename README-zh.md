# claude-code-opsx-workflow

[English](README.md)

Claude Code 配置驱动的五阶段自动化开发流程。

五阶段：需求澄清 -> 任务规划 -> 编码执行 -> 质量门禁 -> 提交归档

三种检测策略：`filesystem`（文件驱动项目）| `state-file`（零依赖 JSON）| `custom`（自定义脚本）

内置两套预设：**OpenSpec+GStack**（完整版）和 **Minimal**（最小化）。

## 安装

```bash
npm install -g claude-code-opsx-workflow
```

## 快速开始

```bash
# 在项目中初始化（默认使用 openspec-gstack 预设）
opsx-workflow init /path/to/your-project

# 使用最小化预设（不含 OpenSpec/GStack）
opsx-workflow init /path/to/your-project --preset minimal
```

自动生成所有配置文件、hooks 和编码规范到项目的 `.claude/` 目录。

## CLI 命令

| 命令 | 说明 |
|------|------|
| `opsx-workflow init <路径>` | 初始化五阶段流程 |
| `opsx-workflow init <路径> --preset minimal` | 使用最小化预设 |
| `opsx-workflow detect <路径>` | 检测当前阶段 |
| `opsx-workflow validate <路径>` | 验证搭建完整性 |
| `opsx-workflow check-deps <路径>` | 检测依赖 |
| `opsx-workflow check-deps <路径> --install` | 检测并自动安装缺失依赖 |

## 生成的文件

```
<你的项目>/
├── CLAUDE.md                          # 项目规范文件（根目录）
└── .claude/
    ├── phase-config.json              # 核心配置，驱动所有 hook 行为
    ├── karpathy.md                    # Karpathy 编码原则
    ├── settings.json                  # hooks 注册
    ├── settings.local.json            # 权限白名单
    ├── hooks/
    │   ├── lib/phase-detector.js      # 阶段检测引擎
    │   ├── phase-guard.js             # 工具调用前守卫
    │   ├── phase-reminder.js          # 提交提示时的阶段提醒
    │   ├── startup-check.js           # 会话启动检查
    │   └── check-gstack.sh            # GStack 检查（仅 openspec-gstack 预设）
    └── standards/                     # 编码规范
```

## 五个阶段

| 阶段 | 名称 | 说明 |
|------|------|------|
| 1 | 需求澄清 | 收集并澄清需求，禁止编码 |
| 2 | 任务规划 | 拆分任务，定义验收标准 |
| 3 | 编码执行 | 严格 TDD 纪律实现 |
| 4 | 质量门禁 | 运行测试、lint、代码审查，禁止跳过 |
| 5 | 提交归档 | 清理提交、更新文档、归档记录 |

阶段转换由 hooks 强制执行，跳过阶段或越阶段操作会被自动拦截。

## 检测策略

### filesystem（openspec-gstack 默认）

从文件系统状态推导阶段 — 检查 spec 文件、源码模式、测试结果等。适用于 OpenSpec 等文件驱动项目。

### state-file

读写 JSON 状态文件（`.claude/phase-state.json`）。零依赖，任何项目可用。AI agent 调用 `writePhaseState()` 更新状态。

### custom

调用自定义检测脚本。在 `phase-config.json` 的 `detection.custom.command` 中定义命令。

## 配置说明

所有行为由 `.claude/phase-config.json` 驱动：

```json
{
  "detection": {
    "strategy": "filesystem",
    "filesystem": {
      "rules": [
        { "phase": 1, "all_of": [".openspec/"] },
        { "phase": 2, "all_of": [".openspec/", ".openspec/tasks.md"] }
      ]
    }
  },
  "source_patterns": ["src/**", "lib/**"],
  "enforcement": {
    "block_phase_skip": true,
    "warn_soft_boundaries": true
  }
}
```

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

## 开发

```bash
git clone https://github.com/jizhiqiang/claude-code-opsx-workflow.git
cd claude-code-opsx-workflow
npm install
npm test              # 运行测试
npm run lint          # 语法检查
npm run build         # 打包 src/ -> dist/
npm run build:hermes  # 部署到 ~/.hermes/skills/
```

## 项目结构

```
├── src/              # skill 源码
│   ├── SKILL.md      # skill 定义
│   ├── bin/cli.js    # CLI 入口
│   ├── scripts/      # 安装、检测、验证脚本
│   └── templates/    # 配置模板和 hooks
├── scripts/          # 构建脚本
├── test/             # 测试
└── package.json
```

## 许可证

MIT
