---
allowed-tools: Bash(mkdir:*), Bash(cat:*), Bash(git:*)
description: Initialize complete state tracking system for SkillForge project
---

# 🚀 Initialize State Tracking System

## Creating directory structure
!`mkdir -p .claude/commands && mkdir -p docs && echo "✅ Directories created"`

## Creating CLAUDE checkpoint file
!`cat > docs/CLAUDE-CHECKPOINT.md << 'EOF'
# ⚠️ MANDATORY READ - Claude Session Checkpoint ⚠️
# Start EVERY session with: /project:claude-checkpoint
# Update EVERY 30 minutes with: /project:update-claude

## 🛑 STOP - Verification Questions (Answer these first):
1. What was the last endpoint I implemented?
2. What database tables exist?
3. What was I working on when last session ended?
4. What patterns/conventions am I following?

## 📁 Files I Own (DO NOT TOUCH OTHERS):
/server.js - [STATUS: Not started]
/api/* - [STATUS: Not started]
/db/* - [STATUS: Not started]
/services/* - [STATUS: Not started]
/package.json - [STATUS: Not started]

## ✅ Completed Features (DO NOT REBUILD):
[SESSION 1 - 2025-01-05]
- PENDING: Initial project setup

## 🚧 Current Work Session:
WORKING ON: Initial project setup
LAST LINE WRITTEN: N/A
NEXT STEP: Initialize Node.js project and create Express server
BLOCKER: None

## 📋 Decisions Already Made (RESPECT THESE):
- Project: SkillForge - AI-powered skill assessment platform
- Port: 3000
- Database: SQLite with raw SQL
- Auth: JWT (24hr expiry)
- Password hashing: bcrypt (10 rounds)
- Response format: {success: boolean, data: any, error: string}
- Error codes: 1000-1999 for backend

## API Endpoints to Implement:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/verify
- GET /api/skills/categories
- POST /api/assessment/generate
- POST /api/assessment/submit
- GET /api/progress/:userId/:skillId
- GET /api/achievements/:userId
- GET /api/sse/updates

## ⏭️ CONTINUE FROM HERE:
1. Run /project:validate-state
2. Initialize package.json with dependencies
3. Create server.js with Express setup
4. Update this file after 30 minutes
EOF
echo "✅ CLAUDE checkpoint created"`

## Creating COPILOT checkpoint file
!`cat > docs/COPILOT-CHECKPOINT.md << 'EOF'
# ⚠️ MANDATORY READ - Copilot Session Checkpoint ⚠️
# Review this file at: docs/COPILOT-CHECKPOINT.md
# Update regularly during your session

## 🛑 STOP - Verification Questions (Answer these first):
1. What components have I already built?
2. What API endpoints am I integrated with?
3. What was I implementing when last session ended?
4. What CSS/JS patterns am I using?

## 📁 Files I Own (DO NOT TOUCH OTHERS):
/public/index.html - [STATUS: Not started]
/public/dashboard.html - [STATUS: Not started]
/public/assessment.html - [STATUS: Not started]
/public/progress.html - [STATUS: Not started]
/public/achievements.html - [STATUS: Not started]
/public/css/* - [STATUS: Not started]
/public/js/* - [STATUS: Not started]

## ✅ Completed Features (DO NOT REBUILD):
[SESSION 1 - 2025-01-05]
- PENDING: Initial setup

## 🚧 Current Work Session:
WORKING ON: Waiting for backend setup
LAST FUNCTION: N/A
NEXT STEP: Create HTML structure
WAITING FOR: Backend API structure

## 📋 Patterns Already Established (FOLLOW THESE):
- API calls: apiClient.post('/endpoint', data) pattern
- DOM: document.querySelector()
- Events: addEventListener with async/await
- Primary color: #2563eb
- Error color: #dc2626
- Mobile breakpoint: 768px
- No frameworks: Vanilla HTML/CSS/JS only

## Design System:
- Border radius: 0.375rem
- Box shadow: 0 1px 3px rgba(0,0,0,0.1)
- Font: System font stack

## ⏭️ CONTINUE FROM HERE:
1. Wait for backend /api structure
2. Create index.html with login/register
3. Build api-client.js
4. Update this file regularly
EOF
echo "✅ COPILOT checkpoint created"`

## Creating slash commands
!`cat > .claude/commands/claude-checkpoint.md << 'EOF'
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
!`git branch --show-current 2>/dev/null && git status --short 2>/dev/null || echo "Git not initialized yet"`

## ⚡ Quick Actions
- Update checkpoint: Use /project:update-claude
- Validate state: Use /project:validate-state
- Set timer: Use /project:timer

REMEMBER: Update checkpoint every 30 minutes!
EOF
echo "✅ Claude checkpoint command created"`

## Initializing git and making commit
!`git init 2>/dev/null || echo "Git already initialized"`
!`git add . && git commit -m "[SETUP]: Initialize SkillForge project with state tracking system" 2>/dev/null || echo "✅ Changes committed"`

## Final status
!`echo "✅ State tracking system initialized!" && echo "" && echo "Available commands:" && echo "  /project:claude-checkpoint - View your current state (START HERE)" && echo "  /project:update-claude - Update your progress" && echo "  /project:validate-state - Check project health" && echo "  /project:timer - Set 30-minute reminder" && echo "  /project:copilot-checkpoint - View frontend state" && echo "" && echo "Start with: /project:claude-checkpoint"`