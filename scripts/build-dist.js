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

function getAllFiles(dir, base = "") {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
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

  // 复制 src/ → dist/（保持原结构）
  const files = getAllFiles(SRC_DIR);
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

  // 生成 dist/bin/cli.js -- 命令行入口
  const cliContent = `#!/usr/bin/env node
/**
 * claude-code-opsx-workflow CLI
 *
 * 用法:
 *   opsx-workflow init <项目路径> [--preset minimal|openspec-gstack]
 *   opsx-workflow detect <项目路径>
 *   opsx-workflow validate <项目路径>
 *   opsx-workflow check-deps <项目路径> [--install]
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const DIST_DIR = path.join(__dirname, "..");

const command = process.argv[2];
const projectDir = process.argv[3] || ".";
const args = process.argv.slice(4);

function resolveScript(name) {
  return path.join(DIST_DIR, "scripts", name);
}

function run() {
  switch (command) {
    case "init": {
      const preset = args.includes("--preset")
        ? args[args.indexOf("--preset") + 1]
        : "openspec-gstack";
      console.log("初始化五阶段开发流程...");
      console.log(\`项目: \${path.resolve(projectDir)}\`);
      console.log(\`预设: \${preset}\`);

      // 1. 检测依赖
      const checkResult = execSync(
        \`node "\${resolveScript("install-dependencies.js")}" "\${projectDir}" --check-only\`,
        { encoding: "utf-8" }
      );
      const check = JSON.parse(checkResult);
      const missing = check.checks.filter((c) => !c.installed);
      if (missing.length > 0) {
        console.log("缺失依赖，正在安装...");
        execSync(
          \`node "\${resolveScript("install-dependencies.js")}" "\${projectDir}" --install\`,
          { stdio: "inherit" }
        );
      }

      // 2. 模板复制
      const templatesDir = path.join(DIST_DIR, "templates");
      const hooksDir = path.join(templatesDir, "hooks");
      const targetClaudeDir = path.join(projectDir, ".claude");

      // 复制 hooks
      fs.mkdirSync(path.join(targetClaudeDir, "hooks", "lib"), { recursive: true });
      const hookFiles = fs.readdirSync(hooksDir).filter((f) => !f.startsWith("."));
      for (const f of hookFiles) {
        const src = path.join(hooksDir, f);
        if (fs.statSync(src).isDirectory()) {
          // lib 目录
          const libFiles = fs.readdirSync(src);
          for (const lf of libFiles) {
            fs.copyFileSync(path.join(src, lf), path.join(targetClaudeDir, "hooks", "lib", lf));
          }
        } else {
          fs.copyFileSync(src, path.join(targetClaudeDir, "hooks", f));
        }
      }

      // 复制 settings.json 和 karpathy.md
      fs.copyFileSync(path.join(templatesDir, "settings.json"), path.join(targetClaudeDir, "settings.json"));
      fs.copyFileSync(path.join(templatesDir, "karpathy.md"), path.join(targetClaudeDir, "karpathy.md"));

      // 复制 phase-config.json（使用预设或默认）
      const presetFile = path.join(templatesDir, "presets", preset + ".json");
      const configSrc = fs.existsSync(presetFile) ? presetFile : path.join(templatesDir, "phase-config.json");
      fs.copyFileSync(configSrc, path.join(targetClaudeDir, "phase-config.json"));

      console.log("模板文件已复制到 .claude/");

      // 3. 验证
      const validateResult = execSync(
        \`node "\${resolveScript("validate-setup.js")}" "\${projectDir}"\`,
        { encoding: "utf-8" }
      );
      const v = JSON.parse(validateResult);
      if (v.valid) {
        console.log("验证通过，五阶段开发流程搭建完成。");
      } else {
        console.log("验证发现问题:", v.missing.join(", "));
        console.log("请手动补充缺失文件。");
      }
      break;
    }
    case "detect": {
      execSync(\`node "\${resolveScript("detect-project-phase.js")}" "\${projectDir}"\`, { stdio: "inherit" });
      break;
    }
    case "validate": {
      execSync(\`node "\${resolveScript("validate-setup.js")}" "\${projectDir}"\`, { stdio: "inherit" });
      break;
    }
    case "check-deps": {
      const installFlag = args.includes("--install") ? "--install" : "--check-only";
      execSync(
        \`node "\${resolveScript("install-dependencies.js")}" "\${projectDir}" \${installFlag}\`,
        { stdio: "inherit" }
      );
      break;
    }
    default:
      console.log("用法: opsx-workflow <command> <项目路径> [options]");
      console.log("");
      console.log("命令:");
      console.log("  init <路径>         初始化五阶段流程");
      console.log("  detect <路径>       检测当前阶段");
      console.log("  validate <路径>     验证搭建完整性");
      console.log("  check-deps <路径>   检测依赖 (--install 自动安装)");
      console.log("");
      console.log("选项:");
      console.log("  --preset <name>     预设: minimal | openspec-gstack (默认: openspec-gstack)");
      console.log("  --install           自动安装缺失依赖");
  }
}

run();
`;

  if (!dryRun) {
    fs.mkdirSync(path.join(DIST_DIR, "bin"), { recursive: true });
    fs.writeFileSync(path.join(DIST_DIR, "bin", "cli.js"), cliContent);
    fs.chmodSync(path.join(DIST_DIR, "bin", "cli.js"), 0o755);
    console.log(`  生成: bin/cli.js`);
  }

  // 生成 dist/package.json -- 精简版，只包含分发需要的信息
  const srcPackage = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));
  const distPackage = {
    name: srcPackage.name,
    version: srcPackage.version,
    description: srcPackage.description,
    main: "scripts/install-dependencies.js",
    bin: { "opsx-workflow": "bin/cli.js" },
    files: ["."],
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

  console.log(`\n完成: ${copied} 复制 + 3 生成`);
  console.log(`\ndist/ 可直接上传到:`);
  console.log(`  - npm registry:  npm publish dist/`);
  console.log(`  - GitHub Release: 打包 tar.gz 上传`);
  console.log(`  - 任意文件服务器: 打包 zip/tar.gz 分发`);
  console.log(`  - Hermes skills:  cp -r dist/* ~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/`);
}

build();
