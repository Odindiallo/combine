---
allowed-tools: Bash(cat:*), Bash(git log:*), Bash(find:*), Bash(ls:*)
description: Display Claude's current state and progress - RUN THIS FIRST in every session
---

# 🚀 Claude Backend Development Status

## Current Checkpoint
!`cat docs/CLAUDE-CHECKPOINT.md 2>/dev/null || echo "ERROR: Checkpoint file not found!"`

## Recent Backend Activity
### Git commits by Claude
!`git log --oneline -10 --grep="\\[CLAUDE\\]" 2>/dev/null || echo "No Claude commits yet"`

### Recently modified backend files
!`find . -path ./node_modules -prune -o -path ./public -prune -o -type f -name "*.js" -mtime -1 -print | grep -E "(server|api|db|services)" | head -20`

### Current branch and status
!`git branch --show-current && git status --short`

## ⚡ Quick Actions
- Update checkpoint: Use `/project:update-claude`
- Validate state: Use `/project:validate-state`
- Set timer: Use `/project:timer`

REMEMBER: Update checkpoint every 30 minutes!