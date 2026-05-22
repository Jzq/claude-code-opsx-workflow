#!/usr/bin/env node
/**
 * 阶段提醒 -- 配置驱动版
 *
 * 从 .claude/phase-config.json 读取 pipeline phases 配置，
 * 每次用户输入时注入当前阶段信息和允许/禁止操作列表。
 */

const { detectPhase, loadConfig } = require("./lib/phase-detector");

/**
 * 从 guard 配置推导每阶段允许/禁止操作
 */
function derivePhaseOps(config, phase) {
  const guardConfig = (config && config.guard) || {};
  const rules = guardConfig.rules || [];
  const skillRules = guardConfig.skill_rules || [];

  const forbidden = [];
  const allowed = [];

  // 从 guard rules 推导
  for (const rule of rules) {
    if (rule.phases && rule.phases.includes(phase)) {
      const desc = rule.source_only
        ? `编辑源码`
        : rule.command_pattern
          ? `执行 ${rule.command_pattern.replace(/^\\^/, "").replace(/\$$/, "")} 命令`
          : `${(rule.tools || []).join("/")}`;
      forbidden.push(desc);
    }
  }

  // 从 skill_rules 推导
  for (const rule of skillRules) {
    if (rule.phases && rule.phases.includes(phase)) {
      forbidden.push(`Skill(${(rule.skill_patterns || []).join(", ")})`);
    } else if (rule.phases && !rule.phases.includes(phase)) {
      allowed.push(`Skill(${(rule.skill_patterns || []).join(", ")})`);
    }
  }

  // 简单逻辑：源码操作在阶段3+允许
  if (phase >= 3) {
    allowed.push("编辑源码");
    allowed.push("运行测试");
  }
  if (phase >= 5) {
    allowed.push("git commit");
  }

  return { allowed: [...new Set(allowed)], forbidden: [...new Set(forbidden)] };
}

function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const config = loadConfig(projectDir);
  const phaseInfo = detectPhase(projectDir);

  const phases = (config && config.pipeline && config.pipeline.phases) || {};
  const phaseConf = phases[String(phaseInfo.phase)] || {};
  const name = phaseConf.name ? `阶段${phaseInfo.phase}·${phaseConf.name}` : `阶段${phaseInfo.phase}`;

  const ops = derivePhaseOps(config, phaseInfo.phase);

  let context = `# 工作流阶段检测\n`;
  context += `当前阶段：${name}\n`;
  context += `原因：${phaseInfo.reason}\n`;
  if (phaseInfo.change) {
    context += `Change：${phaseInfo.change}\n`;
  }
  if (ops.allowed.length > 0) {
    context += `允许的操作：${ops.allowed.join("、")}\n`;
  }
  if (ops.forbidden.length > 0) {
    context += `禁止的操作：${ops.forbidden.join("、")}\n`;
  }
  if (phaseInfo.qaFailed) {
    context += `\nQA 未通过，必须返回编码阶段修复问题后再重新执行质量门禁。\n`;
  }

  // Superpowers 提示
  const superpowers = phaseConf.superpowers;
  if (superpowers !== undefined) {
    context += `Superpowers：${superpowers ? "启用" : "禁用"}\n`;
  }

  process.stdout.write(JSON.stringify({ additionalContext: context }) + "\n");
}

main();
