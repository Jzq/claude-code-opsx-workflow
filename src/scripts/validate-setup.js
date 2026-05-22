#!/usr/bin/env node
/**
 * 验证目标项目的 phase workflow 搭建是否完整
 *
 * 用法: node validate-setup.js <目标项目路径>
 *
 * 输出 JSON:
 *   { valid: boolean, missing: string[], warnings: string[] }
 *
 * agent 在生成完 .claude/ 目录后调用此脚本验证完整性
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FILES = [
  ".claude/phase-config.json",
  ".claude/CLAUDE.md",
  ".claude/karpathy.md",
  ".claude/settings.json",
  ".claude/hooks/lib/phase-detector.js",
  ".claude/hooks/phase-guard.js",
  ".claude/hooks/phase-reminder.js",
  ".claude/hooks/startup-check.js",
];

const REQUIRED_DIRS = [
  ".claude/standards",
];

function main() {
  const projectDir = process.argv[2] || ".";
  const missing = [];
  const warnings = [];

  // 检查必需文件
  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(projectDir, file);
    if (!fs.existsSync(fullPath)) {
      missing.push(file);
    }
  }

  // 检查必需目录
  for (const dir of REQUIRED_DIRS) {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      missing.push(dir + "/");
    }
  }

  // 验证 phase-config.json
  const configPath = path.join(projectDir, ".claude/phase-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

      // 检查必需字段
      if (!config.pipeline || !config.pipeline.phases) {
        warnings.push("phase-config.json 缺少 pipeline.phases");
      }
      if (!config.detection || !config.detection.strategy) {
        warnings.push("phase-config.json 缺少 detection.strategy");
      }
      if (!config.guard) {
        warnings.push("phase-config.json 缺少 guard 配置");
      }

      // 验证 detection 策略的子配置
      const strategy = config.detection.strategy;
      if (strategy === "filesystem" && !config.detection.filesystem) {
        warnings.push("detection.strategy=filesystem 但缺少 detection.filesystem 配置");
      }
      if (strategy === "state-file" && !config.detection.state_file) {
        warnings.push("detection.strategy=state-file 但缺少 detection.state_file 配置");
      }
      if (strategy === "custom" && !config.detection.custom) {
        warnings.push("detection.strategy=custom 但缺少 detection.custom.script 配置");
      }

      // 验证 filesystem 规则
      if (strategy === "filesystem" && config.detection.filesystem) {
        const rules = config.detection.filesystem.rules || [];
        if (rules.length === 0) {
          warnings.push("filesystem 检测规则为空，阶段检测将无法工作");
        }
        // 检查规则是否覆盖所有阶段
        const coveredPhases = new Set(rules.map((r) => r.phase));
        const pipelinePhases = Object.keys(config.pipeline.phases).map(Number);
        for (const p of pipelinePhases) {
          if (!coveredPhases.has(p)) {
            warnings.push(`filesystem 规则未覆盖阶段 ${p}`);
          }
        }
      }

      // 验证 source_patterns
      const sp = (config.source_patterns || []).filter((p) => typeof p === "string" && !p.startsWith("_"));
      if (sp.length === 0) {
        warnings.push("source_patterns 为空，phase-guard 将无法区分源码文件和非源码文件");
      }

      // 验证 guard rules
      if (config.guard && config.guard.rules) {
        for (const rule of config.guard.rules) {
          if (!rule.phases || !Array.isArray(rule.phases)) {
            warnings.push(`guard rule 缺少 phases 数组: ${JSON.stringify(rule).slice(0, 80)}`);
          }
          if (!rule.tools || !Array.isArray(rule.tools)) {
            warnings.push(`guard rule 缺少 tools 数组: ${JSON.stringify(rule).slice(0, 80)}`);
          }
        }
      }

      // 检查 skill_routing
      if (config.skill_routing && config.skill_routing.enabled) {
        if (!config.skill_routing.check_script) {
          warnings.push("skill_routing.enabled=true 但未指定 check_script");
        }
      }

    } catch (e) {
      warnings.push(`phase-config.json 解析失败: ${e.message}`);
    }
  } else {
    // 无配置文件时，检查是否是旧版（有 check-gstack.sh）
    const oldGuard = path.join(projectDir, ".claude/hooks/check-gstack.sh");
    if (fs.existsSync(oldGuard)) {
      warnings.push("检测到旧版结构（check-gstack.sh），建议迁移到 phase-config.json 驱动模式");
    }
  }

  // 检查 settings.json 中 hooks 是否注册
  const settingsPath = path.join(projectDir, ".claude/settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      const hooks = settings.hooks || {};
      const requiredHookTypes = ["PreToolUse", "UserPromptSubmit", "SessionStart"];
      for (const hookType of requiredHookTypes) {
        if (!hooks[hookType] || hooks[hookType].length === 0) {
          warnings.push(`settings.json 缺少 ${hookType} hook 注册`);
        }
      }
    } catch (e) {
      warnings.push(`settings.json 解析失败: ${e.message}`);
    }
  }

  // 检查 phase-detector.js 导出
  const detectorPath = path.join(projectDir, ".claude/hooks/lib/phase-detector.js");
  if (fs.existsSync(detectorPath)) {
    const content = fs.readFileSync(detectorPath, "utf-8");
    if (!content.includes("module.exports") || !content.includes("detectPhase")) {
      warnings.push("phase-detector.js 未导出 detectPhase 函数");
    }
  } else {
    warnings.push("phase-detector.js 不存在，阶段检测将无法工作");
  }

  // 检查 standards 目录下是否有编码规范
  const standardsDir = path.join(projectDir, ".claude/standards");
  if (fs.existsSync(standardsDir)) {
    const files = fs.readdirSync(standardsDir).filter(f => f.endsWith(".md"));
    if (files.length === 0) {
      warnings.push(".claude/standards/ 下无编码规范文件");
    }
  }

  // 检查 state-file 策略的状态文件（仅提示）
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.detection && config.detection.strategy === "state-file") {
        const statePath = path.join(projectDir, config.detection.state_file.path);
        if (!fs.existsSync(statePath)) {
          warnings.push("state-file 策略的状态文件尚未创建（首次运行将自动生成）");
        }
      }
    } catch {
      // 已在上面处理
    }
  }

  const result = {
    valid: missing.length === 0,
    missing,
    warnings,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main();
