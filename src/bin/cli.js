#!/usr/bin/env node
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

// 定位 skill 根目录（支持 src 开发环境和 dist 分发环境）
const SKILL_DIR = fs.existsSync(path.join(__dirname, "..", "SKILL.md"))
  ? path.join(__dirname, "..")
  : path.join(__dirname, "..", "..");

const command = process.argv[2];
const projectDir = process.argv[3] || ".";
const args = process.argv.slice(4);

function resolveScript(name) {
  return path.join(SKILL_DIR, "scripts", name);
}

function run() {
  switch (command) {
    case "init": {
      let preset = "openspec-gstack";
      if (args.includes("--preset")) {
        const presetIdx = args.indexOf("--preset") + 1;
        if (presetIdx < args.length && args[presetIdx] && !args[presetIdx].startsWith("--")) {
          preset = args[presetIdx];
        } else {
          console.log("ERROR: --preset 需要指定预设名称 (minimal | openspec-gstack)");
          process.exit(1);
        }
      }
      console.log("初始化五阶段开发流程...");
      console.log(`项目: ${path.resolve(projectDir)}`);
      console.log(`预设: ${preset}`);

      // 1. 检测依赖
      const checkResult = execSync(
        `node "${resolveScript("install-dependencies.js")}" "${projectDir}" --check-only`,
        { encoding: "utf-8" }
      );
      const check = JSON.parse(checkResult);
      const missing = check.checks.filter((c) => !c.installed);
      if (missing.length > 0) {
        console.log("缺失依赖，正在安装...");
        execSync(
          `node "${resolveScript("install-dependencies.js")}" "${projectDir}" --install`,
          { stdio: "inherit" }
        );
      }

      // 2. 模板复制
      const templatesDir = path.join(SKILL_DIR, "templates");
      const hooksDir = path.join(templatesDir, "hooks");
      const targetClaudeDir = path.join(projectDir, ".claude");

      // 复制 hooks
      fs.mkdirSync(path.join(targetClaudeDir, "hooks", "lib"), { recursive: true });
      const hookEntries = fs.readdirSync(hooksDir).filter((f) => !f.startsWith("."));
      for (const entry of hookEntries) {
        const src = path.join(hooksDir, entry);
        if (fs.statSync(src).isDirectory()) {
          // 子目录（如 lib/）
          const subFiles = fs.readdirSync(src).filter((f) => !f.startsWith("."));
          for (const sf of subFiles) {
            const subSrc = path.join(src, sf);
            if (fs.statSync(subSrc).isDirectory()) {
              // 支持更深层嵌套
              copyDirRecursive(subSrc, path.join(targetClaudeDir, "hooks", entry, sf));
            } else {
              const destDir = path.join(targetClaudeDir, "hooks", entry);
              fs.mkdirSync(destDir, { recursive: true });
              fs.copyFileSync(subSrc, path.join(destDir, sf));
            }
          }
        } else {
          fs.copyFileSync(src, path.join(targetClaudeDir, "hooks", entry));
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
        `node "${resolveScript("validate-setup.js")}" "${projectDir}"`,
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
      execSync(`node "${resolveScript("detect-project-phase.js")}" "${projectDir}"`, { stdio: "inherit" });
      break;
    }
    case "validate": {
      execSync(`node "${resolveScript("validate-setup.js")}" "${projectDir}"`, { stdio: "inherit" });
      break;
    }
    case "check-deps": {
      const installFlag = args.includes("--install") ? "--install" : "--check-only";
      execSync(
        `node "${resolveScript("install-dependencies.js")}" "${projectDir}" ${installFlag}`,
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

/**
 * 递归复制目录
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src).filter((f) => !f.startsWith("."));
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

run();
