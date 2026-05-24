# claude-code-opsx-workflow

[中文文档](README-zh.md)

A config-driven five-phase automated development workflow for Claude Code projects.

Phases: Requirements Clarification -> Task Planning -> Coding Execution -> Quality Gate -> Commit & Archive

Detection strategies: `filesystem` (file-driven projects) | `state-file` (zero-dependency JSON) | `custom` (your own script)

Two built-in presets: **OpenSpec+GStack** (full-featured) and **Minimal** (lightweight).

## Install

```bash
npm install -g claude-code-opsx-workflow
```

## Quick Start

```bash
# Initialize in your project (default: openspec-gstack preset)
opsx-workflow init /path/to/your-project

# Or use the minimal preset (no OpenSpec/GStack)
opsx-workflow init /path/to/your-project --preset minimal
```

This generates all config files, hooks, and coding standards inside your project's `.claude/` directory.

## CLI Commands

| Command | Description |
|---------|-------------|
| `opsx-workflow init <path>` | Initialize five-phase workflow |
| `opsx-workflow init <path> --preset minimal` | Use minimal preset |
| `opsx-workflow detect <path>` | Detect current phase |
| `opsx-workflow validate <path>` | Validate setup completeness |
| `opsx-workflow check-deps <path>` | Check dependencies |
| `opsx-workflow check-deps <path> --install` | Check and auto-install missing deps |

## What It Generates

```
<your-project>/
├── CLAUDE.md                          # Project spec (root)
└── .claude/
    ├── phase-config.json              # Core config driving all hook behavior
    ├── karpathy.md                    # Karpathy coding guidelines
    ├── settings.json                  # Hook registrations
    ├── settings.local.json            # Permission allowlist
    ├── hooks/
    │   ├── lib/phase-detector.js      # Phase detection engine
    │   ├── phase-guard.js             # Pre-tool-use guard
    │   ├── phase-reminder.js          # Prompt submit reminder
    │   ├── startup-check.js           # Session start check
    │   └── check-gstack.sh            # GStack check (openspec-gstack preset)
    └── standards/                     # Coding standards
```

## Five Phases

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Requirements Clarification | Gather and clarify requirements, no coding |
| 2 | Task Planning | Break down into tasks, define acceptance criteria |
| 3 | Coding Execution | Implement with TDD discipline |
| 4 | Quality Gate | Run tests, lint, review - no shortcuts |
| 5 | Commit & Archive | Clean commit, update docs, archive |

Phase transitions are enforced by hooks. Skipping phases or jumping ahead is blocked automatically.

## Detection Strategies

### filesystem (default for openspec-gstack)

Infers phase from file system state - checks for spec files, source patterns, test results, etc. Ideal for OpenSpec-driven projects.

### state-file

Reads/writes a JSON state file (`.claude/phase-state.json`). Zero dependencies, works with any project. The AI agent calls `writePhaseState()` to update.

### custom

Calls your own detection script. Define the command in `phase-config.json` under `detection.custom.command`.

## Configuration

All behavior is driven by `.claude/phase-config.json`:

```json
{
  "detection": {
    "strategy": "filesystem",
    "filesystem": {
      "rules": [
        { "phase": 1, "all_of": [".openspec/"] },
        { "phase": 2, "all_of": [".openspec/", ".openspec/tasks.md"] }
      ]
    }
  },
  "source_patterns": ["src/**", "lib/**"],
  "enforcement": {
    "block_phase_skip": true,
    "warn_soft_boundaries": true
  }
}
```

## Global Rules

1. Strict phase ordering - no skipping ahead
2. All deliverables must be files - no verbal handoffs
3. Requirement changes return to Phase 1 immediately
4. Phases 1-2 disable Superpowers
5. Strict TDD - no skipping tests
6. Missing tools or environment issues halt immediately
7. QA failures return to Phase 3 for fixes
8. No premature abstractions or over-engineering
9. Code should be straightforward and readable
10. Working implementation first, optimize later
11. Config-driven over hardcoded, presets over from-scratch

## Development

```bash
git clone https://github.com/jizhiqiang/claude-code-opsx-workflow.git
cd claude-code-opsx-workflow
npm install
npm test              # Run tests
npm run lint          # Lint check
npm run build         # Build src/ -> dist/
npm run build:hermes  # Deploy to ~/.hermes/skills/
```

## Project Structure

```
├── src/              # Skill source
│   ├── SKILL.md      # Skill definition
│   ├── bin/cli.js    # CLI entry point
│   ├── scripts/      # Install, detect, validate
│   └── templates/    # Config templates and hooks
├── scripts/          # Build scripts
├── test/             # Tests
└── package.json
```

## License

MIT
