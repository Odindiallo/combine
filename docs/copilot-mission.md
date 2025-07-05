# SkillForge Frontend Architecture Mission - GitHub Copilot

## 🎯 Primary Responsibility
Copilot owns and manages the entire frontend user interface for SkillForge, an AI-powered skill assessment platform.

## 📁 File Ownership (EXCLUSIVE)
- `/public/*` - All frontend files
- `/public/index.html` - Landing page with login/register
- `/public/dashboard.html` - Main dashboard with skill overview
- `/public/assessment.html` - Interactive assessment interface
- `/public/progress.html` - Progress tracking and analytics
- `/public/achievements.html` - Achievement showcase
- `/public/css/*` - All stylesheets
- `/public/js/*` - All JavaScript modules
- `/public/assets/*` - Images, icons, and static resources

## 🔧 Technical Stack
- **Framework**: Vanilla JavaScript only (no React/Vue/jQuery)
- **Styling**: CSS3 with Flexbox/Grid, no preprocessors
- **Architecture**: Modular ES6 modules with state management
- **Communication**: REST API + Server-Sent Events
- **Visualization**: Canvas API for charts, SVG for skill trees

## 🏗️ Application Architecture

### State Management System
```javascript
// /public/js/state-manager.js
class StateManager {
    constructor() {
        this.state = {};
        this.subscribers = {};
    }
    
    subscribe(event, callback) {
        // Pub/sub pattern for component communication
    }
    
    setState(key, value) {
        // Update state and notify subscribers
    }
}
```

### API Client with Error Handling
```javascript
// /public/js/api-client.js
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.retryAttempts = 3;
    }
    
    async request(endpoint, options = {}) {
        // Fetch wrapper with retry logic
        // Error handling with user-friendly messages
        // JWT token management
    }
}
```

## 🎨 User Interface Components

### Page Structure (5 Required Pages)

#### 1. Landing Page (`/public/index.html`)
- Hero section with platform overview
- Login/registration forms
- Responsive navigation bar
- Feature highlights section

#### 2. Dashboard (`/public/dashboard.html`)
- Skill category overview cards
- Progress summary widgets
- Recent activity feed
- Quick assessment shortcuts

#### 3. Assessment Interface (`/public/assessment.html`)
- Interactive question display
- Multiple choice/coding interfaces
- Progress timer and indicators
- Real-time feedback system

#### 4. Progress Tracking (`/public/progress.html`)
- Skill-specific progress charts
- XP and level visualizations
- Learning streak displays
- Historical performance data

#### 5. Achievements (`/public/achievements.html`)
- Achievement gallery grid
- Unlock animations
- Progress toward locked achievements
- Social sharing features

### Reusable Components

#### Loading System
```javascript
// /public/js/components/loading.js
class LoadingSpinner {
    show(container) {
        // CSS-only spinner animation
    }
    
    hide(container) {
        // Remove spinner gracefully
    }
}
```

#### Error Handling
```javascript
// /public/js/components/error-handler.js
class ErrorDisplay {
    showError(message, type = 'warning') {
        // Toast notifications
        // Error codes 2000-2999 range
    }
}
```

#### Modal System
```javascript
// /public/js/components/modal.js
class ModalManager {
    open(content, options = {}) {
        // Accessible modal dialogs
        // Keyboard navigation support
    }
}
```

## 🎯 Interactive Features

### Skill Tree Visualization
```javascript
// /public/js/components/skill-tree.js
class SkillTreeSVG {
    constructor(container, skillData) {
        this.svg = this.createSVG();
        this.nodes = this.createNodes(skillData);
        this.connections = this.createConnections();
    }
    
    createInteractiveNodes() {
        // Clickable skill nodes
        // Progress indicators
        // Hover effects and tooltips
    }
    
    updateProgress(skillId, progress) {
        // Dynamic progress updates
        // Color-coded difficulty levels
    }
}
```

### Assessment Interface
```javascript
// /public/js/components/assessment.js
class AssessmentInterface {
    constructor() {
        this.timer = new Timer();
        this.questions = [];
        this.currentQuestion = 0;
    }
    
    displayQuestion(question) {
        // Dynamic question rendering
        // Code editor for programming questions
        // Multiple choice interfaces
    }
    
    submitAnswer(answer) {
        // Real-time validation
        // Progress tracking
        // Immediate feedback
    }
}
```

### Progress Charts
```javascript
// /public/js/components/charts.js
class ProgressChart {
    constructor(canvas, data) {
        this.ctx = canvas.getContext('2d');
        this.data = data;
    }
    
    drawXPChart() {
        // Canvas-based XP progression
        // Animated transitions
        // Interactive data points
    }
    
    drawSkillRadar() {
        // Skill competency radar
        // Multi-dimensional progress
    }
}
```

## 🔔 Real-time Features

### Server-Sent Events Handler
```javascript
// /public/js/services/sse-client.js
class SSEClient {
    constructor() {
        this.eventSource = null;
        this.reconnectAttempts = 0;
    }
    
    connect() {
        // Establish SSE connection
        // Handle connection errors
        // Automatic reconnection
    }
    
    handleLiveUpdates(event) {
        // Real-time progress updates
        // Achievement notifications
        // Leaderboard changes
    }
}
```

### Achievement Notifications
```javascript
// /public/js/components/notifications.js
class AchievementPopup {
    show(achievement) {
        // Celebration animation
        // Achievement details display
        // Social sharing integration
    }
}
```

## ♿ Accessibility Implementation

### ARIA Support
- Proper semantic HTML structure
- ARIA labels for interactive elements
- Screen reader compatibility
- Focus management for modals and navigation

### Keyboard Navigation
- Tab order management
- Keyboard shortcuts for power users
- Skip links for screen readers
- Visual focus indicators

### Visual Accessibility
- High contrast mode support
- Scalable font sizes
- Color-blind friendly palettes
- Reduced motion preferences

## 📱 Responsive Design

### Mobile-First Approach
- Flexible grid system
- Touch-friendly interactions
- Optimized loading for mobile
- Progressive enhancement

### Breakpoint Strategy
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+
- Large screens: 1440px+

## 🔧 JavaScript Module Structure

### Core Modules
```
/public/js/
├── main.js                 # Application entry point
├── state-manager.js        # Central state management
├── api-client.js          # API communication
├── router.js              # Client-side routing
├── components/
│   ├── loading.js         # Loading indicators
│   ├── error-handler.js   # Error displays
│   ├── modal.js           # Modal dialogs
│   ├── navigation.js      # Navigation components
│   └── notifications.js   # Toast notifications
├── services/
│   ├── auth-service.js    # Authentication logic
│   ├── sse-client.js      # Real-time updates
│   └── storage-service.js # Local storage management
└── utils/
    ├── helpers.js         # Utility functions
    ├── validators.js      # Input validation
    └── formatters.js      # Data formatting
```

## 🎨 CSS Architecture

### Modular Stylesheets
```
/public/css/
├── main.css               # Global styles and variables
├── layout.css             # Grid and layout utilities
├── components.css         # Reusable component styles
├── pages/
│   ├── index.css          # Landing page styles
│   ├── dashboard.css      # Dashboard specific
│   ├── assessment.css     # Assessment interface
│   ├── progress.css       # Progress visualization
│   └── achievements.css   # Achievement gallery
└── themes/
    ├── light.css          # Light theme
    └── dark.css           # Dark theme
```

## 🔄 Development Protocol

### Git Commit Standards
- `[COPILOT]: feature description` for new features
- `[COPILOT]: fix description` for bug fixes
- `[COPILOT]: style description` for styling changes

### Integration Workflow
1. Backend completes API endpoint
2. Contract documentation updated
3. Frontend implements API integration
4. Testing and validation
5. User interface polish

### File Boundaries
- NEVER edit backend files (/server.js, /api/*, /db/*, /services/*)
- NEVER modify package.json or server configuration
- Focus exclusively on /public/* directory

## 🎯 Performance Targets

### Loading Performance
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Largest Contentful Paint: <2s
- Cumulative Layout Shift: <0.1

### JavaScript Performance
- Bundle size: <100KB gzipped
- API response handling: <50ms
- Animation frame rate: 60fps
- Memory usage: <50MB

## 🧪 Testing Strategy

### Manual Testing Checklist
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile device testing
- Accessibility compliance
- Performance benchmarking
- Error handling verification

### User Experience Testing
- Navigation flow testing
- Form validation testing
- Real-time feature testing
- Responsive design testing

## 📋 Success Criteria

### Functionality
- All 5 pages fully functional
- Complete API integration
- Real-time updates working
- Accessibility compliance
- Mobile responsiveness

### Code Quality
- Modular, maintainable code
- Error handling throughout
- Performance optimization
- Documentation comments
- Clean, semantic HTML

### User Experience
- Intuitive navigation
- Smooth animations
- Fast loading times
- Accessible to all users
- Engaging visual design

## 🔗 Integration Points

### API Communication
- Follow `/docs/api-contract.json` specification
- Handle all error codes 1000-1999 from backend
- Implement proper authentication flow
- Real-time updates via SSE

### Data Flow
- Frontend state synchronized with backend
- Local storage for offline capability
- Progressive enhancement approach
- Graceful degradation for network issues