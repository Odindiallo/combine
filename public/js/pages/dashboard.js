/**
 * Dashboard Page Specific JavaScript
 * Handles dashboard functionality and data display
 */

import { apiClient } from '../api-client.js';
import { stateManager } from '../state-manager.js';
import { errorHandler } from '../utils/error-handler.js';
import { notifications } from '../components/notifications.js';
import { LoadingManager } from '../components/loading.js';

class DashboardPage {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.refreshInterval = null;
        this.init();
    }

    /**
     * Initialize dashboard page
     */
    async init() {
        try {
            // Wait for app to be ready
            if (stateManager.getState('app.isInitialized')) {
                this.setupDashboard();
            } else {
                window.addEventListener('app:ready', () => this.setupDashboard());
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'dashboard_init' });
        }
    }

    /**
     * Set up dashboard functionality
     */
    async setupDashboard() {
        this.setupEventListeners();
        await this.loadDashboardData();
        this.setupDataRefresh();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // API Test buttons (development)
        this.setupAPITestButtons();

        // Quick action buttons
        const startAssessmentBtn = document.getElementById('startAssessmentBtn');
        if (startAssessmentBtn) {
            startAssessmentBtn.addEventListener('click', () => {
                window.location.href = '/assessment.html';
            });
        }

        const viewProgressBtn = document.getElementById('viewProgressBtn');
        if (viewProgressBtn) {
            viewProgressBtn.addEventListener('click', () => {
                window.location.href = '/progress.html';
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Assessment cards
        this.setupAssessmentCards();
    }

    /**
     * Set up assessment card interactions
     */
    setupAssessmentCards() {
        const assessmentCards = document.querySelectorAll('.assessment-card');
        assessmentCards.forEach(card => {
            card.addEventListener('click', () => {
                const assessmentId = card.dataset.assessmentId;
                if (assessmentId) {
                    this.startAssessment(assessmentId);
                }
            });
        });
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.loadingManager.show('Loading dashboard...');

            // Load data in parallel
            const [userStats, recentAssessments, achievements, skillCategories] = await Promise.all([
                this.loadUserStats(),
                this.loadRecentAssessments(),
                this.loadRecentAchievements(),
                this.loadSkillCategories()
            ]);

            // Update UI with loaded data
            this.updateStatsDisplay(userStats);
            this.updateCategoriesDisplay(skillCategories);
            this.updateActivityFeed(recentAssessments, achievements);

            // Update UI with loaded data
            this.updateUserStats(userStats);
            this.updateRecentAssessments(recentAssessments);
            this.updateAchievements(achievements);

            // Store data in state
            stateManager.setState('dashboard', {
                userStats,
                recentAssessments,
                achievements,
                lastUpdated: new Date().toISOString()
            });

        } catch (error) {
            errorHandler.handleError(error, { context: 'dashboard_load' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Load user statistics
     */
    async loadUserStats() {
        try {
            const response = await apiClient.users.getStats();
            return response.data || {
                totalAssessments: 0,
                completedAssessments: 0,
                averageScore: 0,
                skillsLearned: 0,
                streak: 0
            };
        } catch (error) {
            console.warn('Failed to load user stats:', error);
            return {
                totalAssessments: 0,
                completedAssessments: 0,
                averageScore: 0,
                skillsLearned: 0,
                streak: 0
            };
        }
    }

    /**
     * Load recent assessments
     */
    async loadRecentAssessments() {
        try {
            const response = await apiClient.assessments.getRecent({ limit: 5 });
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load recent assessments:', error);
            return [];
        }
    }

    /**
     * Load recent achievements
     */
    async loadRecentAchievements() {
        try {
            const response = await apiClient.achievements.getRecent({ limit: 3 });
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load achievements:', error);
            return [];
        }
    }

    /**
     * Load skill categories with progress
     */
    async loadSkillCategories() {
        try {
            const response = await apiClient.skills.getAll();
            if (response.success) {
                return this.groupSkillsByCategory(response.data);
            }
            return [];
        } catch (error) {
            console.error('Failed to load skill categories:', error);
            return [];
        }
    }

    /**
     * Group skills by category for display
     */
    groupSkillsByCategory(skills) {
        const categories = {};
        
        skills.forEach(skill => {
            const category = skill.category || 'General';
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    skills: [],
                    totalSkills: 0,
                    completedSkills: 0,
                    progress: 0
                };
            }
            
            categories[category].skills.push(skill);
            categories[category].totalSkills++;
            
            if (skill.masteryLevel >= 80) {
                categories[category].completedSkills++;
            }
        });

        // Calculate progress for each category
        Object.values(categories).forEach(category => {
            category.progress = category.totalSkills > 0 
                ? Math.round((category.completedSkills / category.totalSkills) * 100)
                : 0;
        });

        return Object.values(categories);
    }

    /**
     * Update stats display with real data
     */
    updateStatsDisplay(userStats) {
        const stats = userStats || {
            totalSkills: 0,
            currentStreak: 0,
            totalAchievements: 0,
            totalXP: 0
        };

        // Update stat cards
        this.updateElement('totalSkills', stats.totalSkills);
        this.updateElement('currentStreak', stats.currentStreak);
        this.updateElement('totalAchievements', stats.totalAchievements);
        this.updateElement('totalXP', stats.totalXP.toLocaleString());

        // Add animations to stat cards
        this.animateStatCards();
    }

    /**
     * Update categories display
     */
    updateCategoriesDisplay(categories) {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;

        if (!categories || categories.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3>No Skills Yet</h3>
                    <p>Start your learning journey by adding your first skill!</p>
                    <button class="btn btn-primary" onclick="window.location.href='/assessment.html'">
                        Take Assessment
                    </button>
                </div>
            `;
            return;
        }

        // Generate category cards
        categoriesGrid.innerHTML = categories.map(category => `
            <div class="category-card" data-category="${category.name}">
                <div class="category-header">
                    <div class="category-icon">${this.getCategoryIcon(category.name)}</div>
                    <div class="category-info">
                        <h3>${category.name}</h3>
                        <p>${category.totalSkills} skill${category.totalSkills !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="category-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${category.progress}%"></div>
                    </div>
                    <span class="progress-text">${category.progress}% Complete</span>
                </div>
                <div class="category-actions">
                    <button class="btn btn-outline btn-sm" onclick="dashboard.viewCategoryDetails('${category.name}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers to category cards
        this.setupCategoryInteractions();
    }

    /**
     * Update activity feed with recent data
     */
    updateActivityFeed(assessments, achievements) {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;

        const activities = [];

        // Add recent assessments
        (assessments || []).slice(0, 3).forEach(assessment => {
            activities.push({
                type: 'assessment',
                icon: '📝',
                title: `Completed assessment: ${assessment.skillName || 'Unknown Skill'}`,
                description: `Score: ${assessment.score}% • ${this.formatTimeAgo(assessment.completedAt)}`,
                timestamp: new Date(assessment.completedAt)
            });
        });

        // Add recent achievements
        (achievements || []).slice(0, 2).forEach(achievement => {
            activities.push({
                type: 'achievement',
                icon: '🏆',
                title: `Earned achievement: ${achievement.name}`,
                description: achievement.description,
                timestamp: new Date(achievement.earnedAt)
            });
        });

        // Sort by timestamp
        activities.sort((a, b) => b.timestamp - a.timestamp);

        if (activities.length === 0) {
            activityFeed.innerHTML = `
                <div class="empty-activity">
                    <div class="empty-icon">📈</div>
                    <p>No recent activity. Start learning to see your progress here!</p>
                </div>
            `;
            return;
        }

        activityFeed.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get category icon based on name
     */
    getCategoryIcon(categoryName) {
        const icons = {
            'Programming': '💻',
            'Design': '🎨',
            'Marketing': '📊',
            'Communication': '💬',
            'Leadership': '👥',
            'Technical': '⚙️',
            'Creative': '🎭',
            'Business': '💼',
            'General': '📚'
        };
        return icons[categoryName] || '📚';
    }

    /**
     * Setup category card interactions
     */
    setupCategoryInteractions() {
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const categoryName = card.dataset.category;
                    this.viewCategoryDetails(categoryName);
                }
            });

            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.transition = 'transform 0.2s ease';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    /**
     * View category details
     */
    viewCategoryDetails(categoryName) {
        // Store category in state and navigate to skills page
        stateManager.setState('selectedCategory', categoryName);
        window.location.href = '/progress.html';
    }

    /**
     * Animate stat cards on load
     */
    animateStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'slideInUp 0.5s ease forwards';
                card.style.opacity = '1';
            }, index * 100);
        });
    }

    /**
     * Format time ago for activity feed
     */
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    /**
     * Helper to safely update element content
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Start an assessment
     */
    async startAssessment(assessmentId) {
        try {
            this.loadingManager.show('Starting assessment...');
            
            // Create or resume assessment session
            await apiClient.assessments.start(assessmentId);
            
            // Navigate to assessment page
            window.location.href = `/assessment.html?id=${assessmentId}`;
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'start_assessment' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * View assessment details
     */
    viewAssessmentDetails(assessmentId) {
        window.location.href = `/assessment.html?view=${assessmentId}`;
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        notifications.info('Refreshing dashboard...');
        await this.loadDashboardData();
        notifications.success('Dashboard updated');
    }

    /**
     * Set up automatic data refresh
     */
    setupDataRefresh() {
        // Refresh data every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);

        // Clear interval when page unloads
        window.addEventListener('beforeunload', () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        });
    }

    /**
     * Set up API test buttons for development
     */
    setupAPITestButtons() {
        const resultElement = document.getElementById('apiTestResult');
        
        // Test Health endpoint
        const testHealthBtn = document.getElementById('testHealthBtn');
        if (testHealthBtn) {
            testHealthBtn.addEventListener('click', async () => {
                try {
                    this.updateTestResult('Testing...', 'info');
                    const response = await fetch('/health');
                    const data = await response.json();
                    
                    if (data.success) {
                        this.updateTestResult('✅ Health OK', 'success');
                    } else {
                        this.updateTestResult('❌ Health Failed', 'error');
                    }
                } catch (error) {
                    this.updateTestResult('❌ Health Error', 'error');
                    console.error('Health test error:', error);
                }
            });
        }

        // Test Auth endpoint
        const testAuthBtn = document.getElementById('testAuthBtn');
        if (testAuthBtn) {
            testAuthBtn.addEventListener('click', async () => {
                try {
                    this.updateTestResult('Testing...', 'info');
                    
                    // Try to register a test user
                    const testUser = {
                        email: 'test@example.com',
                        password: 'testpassword123',
                        firstName: 'Test',
                        lastName: 'User'
                    };
                    
                    const response = await apiClient.auth.register(testUser);
                    
                    if (response.success) {
                        this.updateTestResult('✅ Auth Registration OK', 'success');
                        
                        // Clean up - delete the test user (if endpoint exists)
                        setTimeout(() => {
                            this.updateTestResult('', '');
                        }, 3000);
                    } else {
                        // Registration failed - might be user already exists, try login
                        const loginResponse = await apiClient.auth.login({
                            email: testUser.email,
                            password: testUser.password
                        });
                        
                        if (loginResponse.success) {
                            this.updateTestResult('✅ Auth Login OK', 'success');
                        } else {
                            this.updateTestResult('❌ Auth Failed', 'error');
                        }
                    }
                } catch (error) {
                    this.updateTestResult('❌ Auth Error', 'error');
                    console.error('Auth test error:', error);
                }
            });
        }

        // Test Skills endpoint
        const testSkillsBtn = document.getElementById('testSkillsBtn');
        if (testSkillsBtn) {
            testSkillsBtn.addEventListener('click', async () => {
                try {
                    this.updateTestResult('Testing...', 'info');
                    const response = await apiClient.skills.getAll();
                    
                    if (response.success) {
                        this.updateTestResult(`✅ Skills OK (${response.data.length} found)`, 'success');
                    } else {
                        this.updateTestResult('❌ Skills Failed', 'error');
                    }
                } catch (error) {
                    this.updateTestResult('❌ Skills Error', 'error');
                    console.error('Skills test error:', error);
                }
            });
        }
    }

    /**
     * Update API test result display
     */
    updateTestResult(message, type) {
        const resultElement = document.getElementById('apiTestResult');
        if (resultElement) {
            resultElement.textContent = message;
            resultElement.className = '';
            if (type === 'success') {
                resultElement.style.color = '#28a745';
            } else if (type === 'error') {
                resultElement.style.color = '#dc3545';
            } else if (type === 'info') {
                resultElement.style.color = '#007bff';
            } else {
                resultElement.style.color = '';
            }
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DashboardPage());
} else {
    new DashboardPage();
}

export default DashboardPage;
