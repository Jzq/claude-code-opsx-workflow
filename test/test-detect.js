#!/usr/bin/env node
/**
 * 测试 phase-detector.js 阶段检测逻辑
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createFixture, cleanAllFixtures, assert } = require("./helpers");

const DETECTOR = path.join(__dirname, "..", "src", "templates", "hooks", "lib", "phase-detector.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL: ${name}`);
    console.log(`    ${e.message}`);
  }
}

function detectPhase(projectDir) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };
  const output = execSync(`node -e "const d=require('${DETECTOR.replace(/'/g, "\\'")}');console.log(JSON.stringify(d.detectPhase('${projectDir.replace(/'/g, "\\'")}')))"`, {
    encoding: "utf-8",
    env,
    timeout: 5000,
  });
  return JSON.parse(output.trim());
}

console.log("\n=== 测试 phase-detector.js ===\n");

test("state-file 策略 phase=1 应返回阶段1", () => {
  const dir = createFixture("detector-s1", {
    ".claude/phase-config.json": JSON.stringify({
      version: 1,
      pipeline: { phases: { "1": { name: "需求澄清" }, "2": { name: "任务规划" } } },
      detection: { strategy: "state-file" },
    }),
    ".claude/phase-state.json": JSON.stringify({ phase: 1, reason: "初始状态" }),
  });
  const result = detectPhase(dir);
  assert.equal(result.phase, 1, "应该是阶段1");
  // strategy 不由 detectPhase 返回，由 detect-project-phase.js 附加
});

test("state-file 策略 phase=4 应返回阶段4", () => {
  const dir = createFixture("detector-s4", {
    ".claude/phase-config.json": JSON.stringify({
      version: 1,
      pipeline: { phases: { "1": { name: "a" }, "2": { name: "b" }, "3": { name: "c" }, "4": { name: "d" } } },
      detection: { strategy: "state-file" },
    }),
    ".claude/phase-state.json": JSON.stringify({ phase: 4, reason: "QA" }),
  });
  const result = detectPhase(dir);
  assert.equal(result.phase, 4, "应该是阶段4");
});

test("无 phase-config.json 应 fallback 到阶段1", () => {
  const dir = createFixture("detector-no-config");
  const result = detectPhase(dir);
  assert.equal(result.phase, 1, "无配置应该 fallback 到阶段1");
});

cleanAllFixtures();

console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
