#!/usr/bin/env node
/**
 * 测试 phase-guard.js 守卫逻辑
 *
 * 通过环境变量模拟 Claude Code hook 调用
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createFixture, cleanFixture, cleanAllFixtures, assert } = require("./helpers");

const HOOKS_DIR = path.join(__dirname, "..", "src", "templates", "hooks");

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

function runGuard(projectDir, toolName, toolInput) {
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: projectDir,
    TOOL_NAME: toolName,
    TOOL_INPUT: typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput),
  };
  try {
    const output = execSync(`node "${path.join(HOOKS_DIR, "phase-guard.js")}"`, {
      encoding: "utf-8",
      env,
      timeout: 5000,
    });
    return output.trim() || "{}";
  } catch (e) {
    // hook 返回非零退出码或输出到 stderr 是正常的 deny
    return e.stdout ? e.stdout.trim() : JSON.stringify({ error: e.message });
  }
}

console.log("\n=== 测试 phase-guard.js ===\n");

test("危险命令 rm -rf / 应被拦截", () => {
  const dir = createFixture("guard-danger", {
    ".claude/phase-config.json": JSON.stringify({
      version: 1,
      pipeline: { phases: { "3": { name: "编码" } } },
      detection: { strategy: "state-file" },
      guard: { dangerous_commands: { enabled: true, patterns: [{ pattern: "rm\\s+-rf\\s+[/~]", reason: "禁止删除根目录" }] } },
    }),
    ".claude/phase-state.json": JSON.stringify({ phase: 3 }),
  });
  const result = runGuard(dir, "Bash", { command: "rm -rf /" });
  const parsed = JSON.parse(result);
  assert.ok(parsed.permissionDecision === "deny" || result.includes("deny") || result.includes("禁止"), "rm -rf / 应该被拒绝");
});

test("强推主分支应被拦截", () => {
  const dir = createFixture("guard-force-push", {
    ".claude/phase-config.json": JSON.stringify({
      version: 1,
      pipeline: { phases: { "5": { name: "归档" } } },
      detection: { strategy: "state-file" },
      guard: { dangerous_commands: { enabled: true, patterns: [{ pattern: "git\\s+push\\s+--force\\s+origin\\s+(main|master)", reason: "禁止强推主分支" }] } },
    }),
    ".claude/phase-state.json": JSON.stringify({ phase: 5 }),
  });
  const result = runGuard(dir, "Bash", { command: "git push --force origin main" });
  const parsed = JSON.parse(result);
  assert.ok(parsed.permissionDecision === "deny" || result.includes("deny") || result.includes("禁止"), "强推主分支应该被拒绝");
});

cleanAllFixtures();

console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
