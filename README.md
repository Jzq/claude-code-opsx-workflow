# claude-code-opsx-workflow 开发工程

Claude Code 五阶段配置驱动开发流程 skill 的开发工程。

## 项目结构

```
skills-develop/
├── package.json              项目配置
├── .gitignore
├── README.md                 本文件
├── scripts/
│   ├── build.js              构建：src/ → ~/.hermes/skills/
│   └── lint.js               基础 lint（JSON/JS 语法检查）
├── src/                      skill 源码（编辑这里）
│   ├── SKILL.md              主技能文档
│   ├── references/
│   │   └── architecture.md   架构说明
│   ├── scripts/
│   │   ├── install-dependencies.js   依赖检测与自动安装
│   │   ├── validate-setup.js         验证搭建完整性
│   │   └── detect-project-phase.js   检测当前阶段
│   └── templates/
│       ├── phase-config.json         配置模板
│       ├── presets/
│       │   ├── openspec-gstack.json  OpenSpec+GStack 完整预设
│       │   └── minimal.json          最小预设
│       ├── hooks/
│       │   ├── lib/phase-detector.js 阶段检测引擎
│       │   ├── phase-guard.js        统一守卫
│       │   ├── phase-reminder.js     阶段提醒
│       │   ├── startup-check.js      环境检查
│       │   └── check-gstack.sh       GStack检查
│       ├── settings.json             hooks注册
│       └── karpathy.md               Karpathy编码原则
└── test/                     测试
    ├── helpers.js            测试辅助工具
    ├── test-setup.js         验证脚本测试
    ├── test-guards.js        守卫逻辑测试
    ├── test-detect.js        阶段检测测试
    ├── test-install.js       依赖安装测试
    └── fixtures/             临时测试项目（自动创建/清理）
```

## 开发流程

### 1. 修改源码

编辑 `src/` 下的文件。

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行单个测试
npm run test:setup
npm run test:guards
npm run test:detect
npm run test:install
```

### 3. 构建

```bash
# 预览（不实际复制）
node scripts/build.js --dry-run

# 构建到 Hermes skills 目录
npm run build
```

构建会将 `src/` 同步到 `~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/`，只复制有变化的文件。

### 4. 集成验证

```bash
# 创建一个测试项目，用 Hermes 触发 skill
# 在 Hermes 会话中说：
给 /tmp/test-project 搭建五阶段开发流程
```

### 5. lint

```bash
npm run lint
```

检查 src/ 下所有 JSON 和 JS 文件的语法。

## 设计原则

- **src/ 是唯一真相源**：所有编辑在 src/ 下进行，不要直接改 ~/.hermes/skills/ 下的文件
- **构建是对称的**：build.js 会删除目标中 src/ 里没有的文件
- **测试用临时项目**：test/fixtures/ 下自动创建和清理，不污染真实项目
- **settings.local.json 工具名首字母大写**：Claude Code 要求格式 `Bash(npm run dev)` 而非 `npm run dev`
