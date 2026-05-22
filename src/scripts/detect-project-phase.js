#!/usr/bin/env node
/**
 * 检测目标项目的当前工作流阶段
 *
 * 用法: node detect-project-phase.js <目标项目路径>
 *
 * 复用 phase-detector.js 的逻辑，对目标项目运行阶段检测。
 * agent 在开始工作前调用此脚本判断应从哪个阶段开始。
 *
 * 输出 JSON: { phase, change, changeDir, reason, qaFailed, strategy }
 */

const path = require("path");
const fs = require("fs");

const projectDir = process.argv[2] || ".";
const detectorPath = path.join(projectDir, ".claude/hooks/lib/phase-detector.js");

if (!fs.existsSync(detectorPath)) {
  // 无 phase-detector.js，输出最小结果
  process.stdout.write(
    JSON.stringify({
      phase: 1,
      change: null,
      changeDir: null,
      reason: "phase-detector.js 未安装",
      qaFailed: false,
      strategy: "unknown",
    }, null, 2) + "\n"
  );
  process.exit(0);
}

try {
  const { detectPhase, loadConfig } = require(detectorPath);
  const result = detectPhase(projectDir);

  // 附加检测策略信息
  const config = loadConfig(projectDir);
  result.strategy = (config && config.detection && config.detection.strategy) || "legacy";

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} catch (e) {
  process.stdout.write(
    JSON.stringify({
      phase: 1,
      change: null,
      changeDir: null,
      reason: `阶段检测执行失败: ${e.message}`,
      qaFailed: false,
      strategy: "error",
    }, null, 2) + "\n"
  );
}
