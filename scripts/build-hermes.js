#!/usr/bin/env node
/**
 * Hermes 部署脚本 -- 将 dist/ 同步到 ~/.hermes/skills/ 目录
 *
 * 先跑 npm run build 生成 dist/，再跑本脚本部署。
 *
 * 用法:
 *   node scripts/build-hermes.js           # 部署到 Hermes
 *   node scripts/build-hermes.js --dry-run # 只看会复制什么
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const DIST_DIR = path.join(__dirname, "..", "dist");
const DEST_DIR = path.join(os.homedir(), ".hermes", "skills", "autonomous-ai-agents", "claude-code-opsx-workflow");
const dryRun = process.argv.includes("--dry-run");

if (!fs.existsSync(DIST_DIR)) {
  console.error("dist/ 不存在，先运行: npm run build");
  process.exit(1);
}

function getAllFiles(dir, base = "") {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name === "package.json" || entry.name === "README.md") continue;
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...getAllFiles(path.join(dir, entry.name), relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

function deploy() {
  const files = getAllFiles(DIST_DIR);
  let copied = 0;
  let skipped = 0;

  console.log(`源:   ${DIST_DIR}`);
  console.log(`目标: ${DEST_DIR}`);
  console.log(`文件: ${files.length}\n`);

  for (const file of files) {
    const srcPath = path.join(DIST_DIR, file);
    const destPath = path.join(DEST_DIR, file);

    let needCopy = true;
    if (fs.existsSync(destPath)) {
      const srcContent = fs.readFileSync(srcPath);
      const destContent = fs.readFileSync(destPath);
      if (srcContent.equals(destContent)) {
        needCopy = false;
      }
    }

    if (needCopy) {
      const label = fs.existsSync(destPath) ? "更新" : "新增";
      console.log(`  ${label}: ${file}`);
      if (!dryRun) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
      copied++;
    } else {
      skipped++;
    }
  }

  // 删除目标中 dist 里没有的文件
  if (!dryRun && fs.existsSync(DEST_DIR)) {
    const destFiles = getAllFiles(DEST_DIR);
    for (const file of destFiles) {
      if (!files.includes(file)) {
        console.log(`  删除: ${file}`);
        fs.unlinkSync(path.join(DEST_DIR, file));
      }
    }
  }

  console.log(`\n完成: ${copied} 复制, ${skipped} 跳过`);
}

deploy();
