# SkillForge - AI-Powered Skill Assessment Platform

A comprehensive skill assessment platform that combines AI-generated questions with interactive learning experiences.

## 🏗️ Project Architecture

SkillForge is designed for coordinated development between two AI agents:

- **Claude Code CLI (Backend)**: Manages server, API, database, and business logic
- **GitHub Copilot (Frontend)**: Handles all user interface, interactions, and client-side features

## 📁 Project Structure

```
skillforge/
├── server.js                 # Express server (Claude)
├── .env                      # Environment configuration
├── package.json              # Dependencies and scripts
├── api/                      # API endpoints (Claude)
├── db/                       # Database schema and utilities (Claude)
├── services/                 # Business logic and AI integration (Claude)
├── public/                   # Frontend files (Copilot)
│   ├── index.html           # Landing page
│   ├── dashboard.html       # Main dashboard
│   ├── assessment.html      # Assessment interface
│   ├── progress.html        # Progress tracking
│   ├── achievements.html    # Achievement gallery
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript modules
│   └── assets/              # Static resources
└── docs/                    # Project documentation
    ├── claude-mission.md    # Backend development guide
    ├── copilot-mission.md   # Frontend development guide
    ├── api-contract.json    # Shared API contract
    └── data-models.json     # Shared data structures
```

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

## 🔧 Development Workflow

### Phase 1: Foundation ✅
- [x] Project structure initialization
- [x] Basic Express server with CORS
- [x] API contract and data models
- [x] Frontend page templates
- [x] Authentication system foundation

### Phase 2: Core Features
- [ ] Database schema implementation
- [ ] User authentication and JWT
- [ ] Skills management system
- [ ] Basic assessment functionality

### Phase 3: AI Integration
- [ ] AI service abstraction layer
- [ ] Dynamic question generation
- [ ] Assessment evaluation system
- [ ] Progress calculation algorithms

### Phase 4: Advanced Features
- [ ] Real-time updates (SSE)
- [ ] Achievement system
- [ ] Progress visualizations
- [ ] Performance analytics

### Phase 5: Polish
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Accessibility compliance
- [ ] Mobile responsiveness

## 🤝 Team Coordination

### File Ownership
- **Claude**: `/server.js`, `/api/*`, `/db/*`, `/services/*`, `package.json`
- **Copilot**: `/public/*` (all frontend files)

### Communication Protocol
- Shared contracts: `/docs/api-contract.json`, `/docs/data-models.json`
- Git commits: `[CLAUDE]:`, `[COPILOT]:`, `[BOTH]:` prefixes
- No cross-boundary file editing

### Integration Points
- REST API endpoints for data communication
- Server-Sent Events for real-time updates
- Standardized response format across all endpoints
- Error code ranges: 1000-1999 (backend), 2000-2999 (frontend)

## 📊 Features

### Core Functionality
- **User Management**: Registration, authentication, profile management
- **Skill Assessment**: AI-generated questions, multiple difficulty levels
- **Progress Tracking**: XP system, level progression, learning streaks
- **Achievement System**: Unlockable milestones and rewards
- **Analytics**: Performance insights and learning trends

### Technical Features
- **AI Integration**: Dynamic question generation using multiple providers
- **Real-time Updates**: Live progress updates and notifications
- **Responsive Design**: Mobile-first, accessible interface
- **Performance**: <200ms API responses, <2s page loads
- **Security**: JWT authentication, rate limiting, input validation

## 🔧 API Reference

Base URL: `/api`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/verify` - Token verification
- `GET /auth/logout` - User logout

### Skills
- `GET /skills/categories` - List skill categories
- `GET /skills/:id` - Get skill details
- `POST /skills/create` - Create new skill
- `PUT /skills/:id` - Update skill
- `DELETE /skills/:id` - Delete skill

### Assessments
- `POST /assessment/generate` - Generate AI assessment
- `POST /assessment/submit` - Submit assessment results
- `GET /assessment/history/:userId` - Get assessment history

### Progress
- `GET /progress/:userId/:skillId` - Get user progress
- `POST /progress/update` - Update progress

### Achievements
- `GET /achievements/:userId` - Get user achievements

### Real-time
- `GET /sse/updates` - Server-sent events stream

## 🔐 Security

- JWT tokens with 24-hour expiration
- Bcrypt password hashing (12 rounds)
- Rate limiting: 100 requests/hour globally
- CORS configuration for frontend domain
- Input validation and sanitization
- SQL injection prevention

## 🎯 Success Criteria

### Functionality
- All 15+ API endpoints operational
- Complete frontend with 5 pages
- Working AI question generation
- Real-time progress updates
- Achievement unlock system

### Performance
- API responses <200ms
- Page loads <2s
- Mobile responsiveness
- Accessibility compliance (WCAG 2.1)

### Code Quality
- Modular, maintainable architecture
- Comprehensive error handling
- Complete API documentation
- Security best practices

## 📈 Monitoring

The application includes comprehensive logging and error tracking:
- API request/response logging
- Performance metrics collection
- Error code standardization
- User activity tracking

## 🤖 AI Integration

SkillForge uses an abstract AI service layer supporting multiple providers:
- OpenAI GPT models
- Anthropic Claude
- Custom fine-tuned models
- Fallback and retry mechanisms

## 🔄 Deployment

The application is designed for cloud deployment with:
- Environment-based configuration
- Database migrations
- Static asset optimization
- Health check endpoints
- Graceful shutdown handling

---

**Note**: This project demonstrates coordinated AI development between Claude Code CLI and GitHub Copilot, showcasing how AI agents can collaborate on complex applications while maintaining clear boundaries and responsibilities.