-- SkillForge Database Schema
-- SQLite3 Database for skill assessment platform

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills table for skill definitions
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty_levels INTEGER DEFAULT 3,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assessments table for storing generated assessments
CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id INTEGER NOT NULL,
    questions_json TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    time_limit INTEGER DEFAULT 1800, -- 30 minutes default
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- User progress tracking for each skill
CREATE TABLE IF NOT EXISTS user_progress (
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    assessments_completed INTEGER DEFAULT 0,
    total_score REAL DEFAULT 0.0,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Achievements definitions
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    condition_json TEXT NOT NULL,
    icon_url TEXT,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User achievements tracking
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

-- Assessment results for tracking user submissions
CREATE TABLE IF NOT EXISTS assessment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assessment_id INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    score REAL NOT NULL,
    points_earned INTEGER NOT NULL,
    points_possible INTEGER NOT NULL,
    time_spent INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_skill ON user_progress(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_skill ON assessments(skill_id);

-- Insert default skills
INSERT OR IGNORE INTO skills (id, name, category, difficulty_levels, description) VALUES
(1, 'JavaScript Fundamentals', 'Programming', 5, 'Core JavaScript concepts including variables, functions, and objects'),
(2, 'Python Basics', 'Programming', 4, 'Introduction to Python programming language'),
(3, 'UI/UX Principles', 'Design', 3, 'User interface and user experience design fundamentals'),
(4, 'SQL Queries', 'Database', 4, 'Database querying and data manipulation'),
(5, 'React Components', 'Programming', 5, 'Building user interfaces with React.js'),
(6, 'CSS Layout', 'Design', 3, 'Advanced CSS layout techniques'),
(7, 'Node.js Backend', 'Programming', 4, 'Server-side JavaScript development'),
(8, 'Git Version Control', 'Tools', 3, 'Version control with Git and GitHub');

-- Insert default achievements
INSERT OR IGNORE INTO achievements (id, name, description, condition_json, points) VALUES
(1, 'First Steps', 'Complete your first assessment', '{"type": "assessment_count", "value": 1}', 10),
(2, 'Quick Learner', 'Complete 5 assessments', '{"type": "assessment_count", "value": 5}', 25),
(3, 'Dedicated Student', 'Complete 10 assessments', '{"type": "assessment_count", "value": 10}', 50),
(4, 'JavaScript Novice', 'Reach level 2 in JavaScript', '{"type": "skill_level", "skill_id": 1, "value": 2}', 20),
(5, 'Perfect Score', 'Score 100% on any assessment', '{"type": "perfect_score", "value": 1.0}', 30),
(6, 'Streak Master', 'Maintain a 7-day learning streak', '{"type": "streak", "value": 7}', 40),
(7, 'Polyglot', 'Learn 3 different programming languages', '{"type": "categories", "category": "Programming", "value": 3}', 75),
(8, 'Level Up', 'Reach level 5 in any skill', '{"type": "max_level", "value": 5}', 100);