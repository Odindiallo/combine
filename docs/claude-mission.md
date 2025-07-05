# SkillForge Backend Architecture Mission - Claude Code CLI

## 🎯 Primary Responsibility
Claude owns and manages the entire backend architecture for SkillForge, an AI-powered skill assessment platform.

## 📁 File Ownership (EXCLUSIVE)
- `/server.js` - Main Express server
- `/api/*` - All API endpoints and routing
- `/db/*` - Database schema, migrations, and utilities
- `/services/*` - Business logic and AI integration
- `/package.json` - Dependencies and scripts
- `.env` - Environment configuration

## 🔧 Technical Stack
- **Framework**: Express.js
- **Database**: SQLite3 with raw SQL (no ORMs)
- **Authentication**: JWT with bcryptjs
- **Middleware**: CORS, rate limiting, body parsing
- **AI Integration**: Abstract service layer for provider swapping

## 🏗️ Database Schema Design

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Skills Table
```sql
CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty_levels INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Assessments Table
```sql
CREATE TABLE assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id INTEGER NOT NULL,
    questions_json TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### User Progress Table
```sql
CREATE TABLE user_progress (
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);
```

### Achievements Table
```sql
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    condition_json TEXT NOT NULL,
    icon_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### User Achievements Table
```sql
CREATE TABLE user_achievements (
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);
```

## 🛠️ API Endpoints (15 Required)

### Authentication Endpoints
1. `POST /api/auth/register` - User registration
2. `POST /api/auth/login` - User login
3. `GET /api/auth/verify` - JWT token verification
4. `GET /api/auth/logout` - User logout

### Skills Management
5. `GET /api/skills/categories` - List all skill categories
6. `GET /api/skills/:id` - Get specific skill details
7. `POST /api/skills/create` - Create new skill
8. `PUT /api/skills/:id` - Update skill
9. `DELETE /api/skills/:id` - Delete skill

### Assessment System
10. `POST /api/assessment/generate` - Generate AI-powered assessment
11. `POST /api/assessment/submit` - Submit assessment results
12. `GET /api/assessment/history/:userId` - Get user's assessment history

### Progress Tracking
13. `GET /api/progress/:userId/:skillId` - Get user progress for skill
14. `POST /api/progress/update` - Update user progress

### Achievements System
15. `GET /api/achievements/:userId` - Get user achievements

### Real-time Updates
16. `GET /api/sse/updates` - Server-sent events for live updates

## 🤖 AI Service Implementation

### Abstract AI Service Layer
```javascript
// /services/ai-service.js
class AIService {
    constructor(provider = 'openai') {
        this.provider = provider;
    }
    
    async generateAssessmentQuestions(skillId, level, count = 5) {
        // Abstract method for generating dynamic questions
        // Supports multiple AI providers (OpenAI, Anthropic, etc.)
    }
    
    async evaluateResponse(question, userAnswer) {
        // AI-powered response evaluation
    }
}
```

## 📊 Business Logic Implementation

### XP Calculation Algorithm
```javascript
// /services/progress-service.js
const calculateXP = (difficulty, accuracy, timeSpent) => {
    const baseXP = difficulty * 100;
    const accuracyBonus = accuracy * 0.5;
    const timeBonus = Math.max(0, 1 - (timeSpent / 300000)) * 0.2; // 5 min max
    return Math.floor(baseXP * (1 + accuracyBonus + timeBonus));
};
```

### Level Progression System
```javascript
const calculateLevel = (totalXP) => {
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
};
```

### Streak Tracking
```javascript
const updateStreak = (userId, skillId) => {
    // Check if user practiced yesterday
    // Increment or reset streak accordingly
};
```

### Achievement Conditions
```javascript
const checkAchievements = (userId, action, data) => {
    // Evaluate unlock conditions
    // Examples: "Complete 10 assessments", "Reach level 5 in JavaScript"
};
```

## 🔒 Security Implementation
- JWT tokens with 24-hour expiration
- Password hashing with bcryptjs (12 rounds)
- Rate limiting: 100 requests per hour per IP
- Input validation and sanitization
- CORS configuration for frontend domain
- SQL injection prevention with prepared statements

## 📝 Error Handling
- Custom error codes: 1000-1999 range
- Standardized error response format
- Comprehensive logging system
- Graceful degradation for AI service failures

## 🔄 Development Protocol
1. **Phase 1**: Database setup and basic server
2. **Phase 2**: Authentication system
3. **Phase 3**: Skills and assessment APIs
4. **Phase 4**: Progress tracking and achievements
5. **Phase 5**: AI service integration
6. **Phase 6**: Real-time features (SSE)

## 📋 Success Criteria
- All 15+ endpoints functional with <200ms response time
- Complete SQL schema with proper relationships
- Working AI question generation system
- Comprehensive business logic for XP/levels/achievements
- Full compliance with API contract
- Zero security vulnerabilities

## 🔗 Integration Points
- Frontend consumes REST API endpoints
- Real-time updates via Server-Sent Events
- AI service abstracts provider implementation
- Database handles all persistent data
- Authentication guards all protected routes

## 📄 Documentation Requirements
- Update `/docs/api-contract.json` after each endpoint
- Document all error codes and meanings
- Maintain database schema documentation
- Provide setup and deployment instructions