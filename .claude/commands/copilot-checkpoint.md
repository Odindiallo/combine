---
allowed-tools: Bash(cat:*), Bash(find:*), Bash(ls:*)
description: Display Copilot's frontend state for reference
---

# 🎨 Copilot Frontend Development Status

## Current Checkpoint
!`cat docs/COPILOT-CHECKPOINT.md 2>/dev/null || echo "ERROR: Checkpoint file not found!"`

## Frontend Structure
!`find public -type f -name "*.html" -o -name "*.css" -o -name "*.js" 2>/dev/null | grep -v node_modules | sort || echo "No frontend files yet"`

## Note for Claude
This shows Copilot's progress. You own the backend - don't modify frontend files!
Your API contracts should match what Copilot expects.