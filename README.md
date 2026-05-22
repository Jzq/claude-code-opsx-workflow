# claude-code-opsx-workflow 开发工程

Claude Code 五阶段配置驱动开发流程 skill 的开发工程。

## 项目结构

```
claude-code-opsx-workflow/
├── package.json              项目配置
├── .gitignore
├── README.md                 本文件
├── scripts/
│   ├── build-dist.js         打包：src/ → dist/
│   ├── build-hermes.js       部署：dist/ → ~/.hermes/skills/
│   └── lint.js               语法检查
├── src/                      skill 源码（编辑这里）
│   ├── SKILL.md
│   ├── references/
│   ├── scripts/
│   └── templates/
└── test/                     测试
```

## 开发流程

### 1. 编辑源码

编辑 `src/` 下的文件。

### 2. 测试

```bash
npm test
```

### 3. 打包

```bash
npm run build
```

生成 `dist/` 目录，包含：
- `SKILL.md` + `references/` + `templates/` + `scripts/` -- skill 完整文件
- `bin/cli.js` -- 命令行入口（opsx-workflow）
- `package.json` -- 精简版，可 npm publish
- `README.md` -- 安装使用说明

### 4. 部署到 Hermes

```bash
npm run build:hermes
```

将 dist/ 同步到 `~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/`。

### 5. 分发

dist/ 生成后，可以：

```bash
# 上传到 npm registry
cd dist/ && npm publish

# 打包 tar.gz 上传到 GitHub Release
tar czf claude-code-opsx-workflow-2.1.0.tar.gz -C dist .

# 用户安装
npm install -g claude-code-opsx-workflow
# 或
npx claude-code-opsx-workflow init /path/to/project
# 或
hermes skills install https://github.com/<user>/claude-code-opsx-workflow/blob/main/dist/SKILL.md
```

## 设计原则

- **src/ 是唯一真相源**：所有编辑在 src/ 下进行
- **dist/ 是分发产物**：由 build-dist.js 生成，不手动编辑
- **打包与部署分离**：build 生成 dist，build:hermes 部署到本地
- **dist/ 可独立使用**：包含 package.json，可 npm publish；包含 cli.js，可全局安装
