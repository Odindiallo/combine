---
allowed-tools: Bash(ls:*), Bash(git:*), Bash(node:*), Bash(test:*)
description: Validate project state before starting work
---

# ✅ Project State Validation

## Checkpoint Files Status
!`ls -la docs/*CHECKPOINT.md 2>/dev/null || echo "❌ ERROR: No checkpoint files found!"`

## Git Repository Status
!`git status --short 2>/dev/null || echo "❌ ERROR: Not a git repository! Run: git init"`

## Uncommitted Changes
!`git diff --stat 2>/dev/null || echo "✅ No uncommitted changes"`

## Node.js Project Health
!`test -f package.json && echo "✅ package.json exists" || echo "❌ package.json missing - run: npm init -y"`
!`test -f server.js && node -c server.js 2>&1 && echo "✅ server.js valid" || echo "⚠️ server.js missing or has errors"`

## Recent Activity (last 5 commits)
!`git log --oneline -5 --all --graph --decorate 2>/dev/null || echo "No commits yet"`

## Directory Structure
!`ls -la`

---
**If any ❌ errors above**: Fix them before proceeding
**If only ⚠️ warnings**: Note them and proceed with caution
**If all ✅**: Good to continue development!