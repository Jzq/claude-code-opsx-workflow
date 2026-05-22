#!/usr/bin/env node
/**
 * 基础 lint 脚本 -- 检查 src/ 下的 JS 和 JSON 文件
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
let errors = 0;

function checkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkFiles(fullPath);
    } else {
      // JSON 文件：验证格式
      if (entry.name.endsWith(".json")) {
        try {
          JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        } catch (e) {
          console.log(`  ERROR: ${fullPath} -- JSON 解析失败: ${e.message}`);
          errors++;
        }
      }
      // JS 文件：用 node --check 检查语法（支持 CommonJS）
      if (entry.name.endsWith(".js")) {
        try {
          execSync(`node --check "${fullPath}"`, { stdio: "pipe" });
        } catch (e) {
          console.log(`  ERROR: ${fullPath} -- JS 语法错误`);
          errors++;
        }
      }
      // SKILL.md：检查 YAML frontmatter
      if (entry.name === "SKILL.md") {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (!content.startsWith("---")) {
          console.log(`  ERROR: ${fullPath} -- 缺少 YAML frontmatter`);
          errors++;
        }
      }
    }
  }
}

console.log("检查 src/ ...\n");
checkFiles(SRC_DIR);

if (errors === 0) {
  console.log("全部通过");
} else {
  console.log(`\n${errors} 个错误`);
}
process.exit(errors > 0 ? 1 : 0);
