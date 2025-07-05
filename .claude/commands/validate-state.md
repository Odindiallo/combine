---
allowed-tools: Bash(ls:*), Bash(git:*), Bash(node:*), Bash(test:*)
description: Validate project state before starting work
---

# ✅ Project State Validation

## Checkpoint Files Status
!`ls -la docs/*CHECKPOINT.md 2>/dev/null || echo "❌ ERROR: No checkpoint files found!"`

## Git Repository Status
!`git status --short || echo "❌ ERROR: Not a git repository!"`

## Uncommitted Changes
!`git diff --stat || echo "✅ No uncommitted changes"`

## Node.js Project Health
!`test -f package.json && echo "✅ package.json exists" || echo "❌ package.json missing"`
!`test -f server.js && node -c server.js 2>&1 && echo "✅ server.js valid" || echo "⚠️ server.js missing or has errors"`

## Recent Activity (last 5 commits)
!`git log --oneline -5 --all --graph --decorate || echo "No commits yet"`

## Environment Check
!`test -f .env && echo "✅ .env exists" || echo "⚠️ .env missing (create from .env.example)"`

---
**If any ❌ errors above**: Fix them before proceeding
**If only ⚠️ warnings**: Note them and proceed with caution
**If all ✅**: Good to continue development!