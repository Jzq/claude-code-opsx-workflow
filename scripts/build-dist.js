#!/usr/bin/env node
/**
 * 打包脚本 -- 将 src/ 构建到 dist/
 *
 * dist/ 目录结构可以直接部署到 ~/.hermes/skills/ 下的 skill 目录，
 * 也可以作为 npm 包发布，用户 npm install -g 后通过 cli.js 使用。
 *
 * 用法:
 *   node scripts/build-dist.js           # 构建 dist/
 *   node scripts/build-dist.js --dry-run # 只看会生成什么
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const DIST_DIR = path.join(__dirname, "..", "dist");
const dryRun = process.argv.includes("--dry-run");

function getAllFiles(dir, base = "", skipDirs = []) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // 跳过指定目录（由后续逻辑单独处理）
      if (skipDirs.includes(relPath)) continue;
      files.push(...getAllFiles(path.join(dir, entry.name), relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

function build() {
  // 清空 dist
  if (!dryRun) {
    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // 复制 src/ → dist/（保持原结构，跳过 bin/ 由后续单独处理）
  const files = getAllFiles(SRC_DIR, "", ["bin"]);
  let copied = 0;

  console.log(`源:   ${SRC_DIR}`);
  console.log(`目标: ${DIST_DIR}`);
  console.log(`文件: ${files.length}\n`);

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(DIST_DIR, file);

    console.log(`  复制: ${file}`);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
    copied++;
  }

  // 复制 src/bin/cli.js → dist/bin/cli.js（从独立文件复制，不再内嵌生成）
  const cliSrc = path.join(SRC_DIR, "bin", "cli.js");
  if (fs.existsSync(cliSrc)) {
    if (!dryRun) {
      fs.mkdirSync(path.join(DIST_DIR, "bin"), { recursive: true });
      fs.copyFileSync(cliSrc, path.join(DIST_DIR, "bin", "cli.js"));
      fs.chmodSync(path.join(DIST_DIR, "bin", "cli.js"), 0o755);
    }
    console.log(`  复制: bin/cli.js`);
  } else {
    console.log(`  WARNING: src/bin/cli.js 不存在，跳过 CLI 入口`);
  }

  // 生成 dist/package.json -- 精简版，只包含分发需要的信息
  const srcPackage = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));
  const distPackage = {
    name: srcPackage.name,
    version: srcPackage.version,
    description: srcPackage.description,
    main: "scripts/install-dependencies.js",
    bin: { "opsx-workflow": "bin/cli.js" },
    files: [
      "SKILL.md",
      "bin/",
      "scripts/",
      "templates/"
    ],
    keywords: srcPackage.keywords,
    license: srcPackage.license,
    engines: srcPackage.engines,
  };

  if (!dryRun) {
    fs.writeFileSync(path.join(DIST_DIR, "package.json"), JSON.stringify(distPackage, null, 2) + "\n");
    console.log(`  生成: package.json`);
  }

  // 生成 dist/README.md
  const readme = `# claude-code-opsx-workflow

Claude Code 五阶段配置驱动开发流程 skill。

## 安装

方式一：npm 全局安装
\`\`\`bash
npm install -g claude-code-opsx-workflow
opsx-workflow init /path/to/project
\`\`\`

方式二：npx 直接使用
\`\`\`bash
npx claude-code-opsx-workflow init /path/to/project
\`\`\`

方式三：部署到 Hermes skills 目录
\`\`\`bash
cp -r dist/* ~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/
\`\`\`

方式四：Hermes 直接安装
\`\`\`bash
hermes skills install <本目录 SKILL.md 的 URL>
\`\`\`

## 命令

\`\`\`
opsx-workflow init <路径>         初始化五阶段流程
opsx-workflow detect <路径>       检测当前阶段
opsx-workflow validate <路径>     验证搭建完整性
opsx-workflow check-deps <路径>   检测依赖 (--install 自动安装)
\`\`\`

## 预设

- \`openspec-gstack\`：完整版（默认），需要 OpenSpec + GStack + Superpowers
- \`minimal\`：最小版，零外部依赖
`;

  if (!dryRun) {
    fs.writeFileSync(path.join(DIST_DIR, "README.md"), readme);
    console.log(`  生成: README.md`);
  }

  const generatedCount = fs.existsSync(cliSrc) ? 2 : 1; // package.json + README.md + (cli.js if exists)
  console.log(`\n完成: ${copied} 复制 + ${generatedCount} 生成`);
  console.log(`\ndist/ 可直接上传到:`);
  console.log(`  - npm registry:  npm publish dist/`);
  console.log(`  - GitHub Release: 打包 tar.gz 上传`);
  console.log(`  - 任意文件服务器: 打包 zip/tar.gz 分发`);
  console.log(`  - Hermes skills:  cp -r dist/* ~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/`);
}

build();
