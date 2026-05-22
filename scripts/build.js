#!/usr/bin/env node
/**
 * 构建脚本 -- 将 src/ 同步到 ~/.hermes/skills/autonomous-ai-agents/claude-code-opsx-workflow/
 *
 * 用法:
 *   node scripts/build.js          # 构建到 Hermes skills 目录
 *   node scripts/build.js --dry-run # 只看会复制什么，不实际执行
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const SRC_DIR = path.join(__dirname, "..", "src");
const DEST_DIR = path.join(os.homedir(), ".hermes", "skills", "autonomous-ai-agents", "claude-code-opsx-workflow");
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
  const files = getAllFiles(SRC_DIR);
  let copied = 0;
  let skipped = 0;

  console.log(`源: ${SRC_DIR}`);
  console.log(`目标: ${DEST_DIR}`);
  console.log(`文件数: ${files.length}`);
  console.log(dryRun ? "(dry-run 模式，不实际复制)\n" : "\n");

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(DEST_DIR, file);

    // 比较内容
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

  // 删除目标中源里没有的文件
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

build();
