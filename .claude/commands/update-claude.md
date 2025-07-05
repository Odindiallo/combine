---
allowed-tools: Bash(date:*), Bash(git diff:*)
description: Update Claude's checkpoint with current progress
---

# 📝 Update Claude Checkpoint

**Current time:** !`date "+%Y-%m-%d %H:%M:%S"`

## Changed files since last commit:
!`git diff --name-only 2>/dev/null || echo "Git not initialized"`

## Update Instructions:
Please update @docs/CLAUDE-CHECKPOINT.md with:

1. **Session header**: [SESSION N - Current timestamp]
2. **Completed this session**: List what you finished
3. **Currently working on**: Exact file:line
4. **Next immediate step**: Specific action
5. **Any blockers**: Dependencies or issues

Format example:
```
🚧 Current Work Session:
[SESSION 2 - 2025-01-05 14:30]
COMPLETED THIS SESSION:
- Created server.js with Express setup
- Implemented /api/auth/register endpoint
CURRENTLY WORKING ON: /api/auth.js:47 - login endpoint
NEXT IMMEDIATE STEP: Add password verification
BLOCKER: None
```

After updating, commit your work with: git commit -m "[CLAUDE]: Description"