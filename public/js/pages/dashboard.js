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
            const [userStats, recentAssessments, achievements] = await Promise.all([
                this.loadUserStats(),
                this.loadRecentAssessments(),
                this.loadRecentAchievements()
            ]);

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
     * Update user statistics display
     */
    updateUserStats(stats) {
        const elements = {
            totalAssessments: document.getElementById('totalAssessments'),
            completedAssessments: document.getElementById('completedAssessments'),
            averageScore: document.getElementById('averageScore'),
            skillsLearned: document.getElementById('skillsLearned'),
            currentStreak: document.getElementById('currentStreak')
        };

        if (elements.totalAssessments) {
            elements.totalAssessments.textContent = stats.totalAssessments || '0';
        }

        if (elements.completedAssessments) {
            elements.completedAssessments.textContent = stats.completedAssessments || '0';
        }

        if (elements.averageScore) {
            elements.averageScore.textContent = `${Math.round(stats.averageScore || 0)}%`;
        }

        if (elements.skillsLearned) {
            elements.skillsLearned.textContent = stats.skillsLearned || '0';
        }

        if (elements.currentStreak) {
            elements.currentStreak.textContent = `${stats.streak || 0} days`;
        }

        // Update progress rings
        this.updateProgressRings(stats);
    }

    /**
     * Update progress ring displays
     */
    updateProgressRings(stats) {
        const completionRate = stats.totalAssessments > 0 
            ? (stats.completedAssessments / stats.totalAssessments) * 100 
            : 0;

        this.updateProgressRing('completionRing', completionRate);
        this.updateProgressRing('scoreRing', stats.averageScore || 0);
    }

    /**
     * Update individual progress ring
     */
    updateProgressRing(ringId, percentage) {
        const ring = document.getElementById(ringId);
        if (!ring) return;

        const circle = ring.querySelector('.progress-circle');
        if (!circle) return;

        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        circle.style.strokeDasharray = strokeDasharray;
        circle.style.strokeDashoffset = strokeDashoffset;

        // Update percentage text
        const percentText = ring.querySelector('.progress-text');
        if (percentText) {
            percentText.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * Update recent assessments display
     */
    updateRecentAssessments(assessments) {
        const container = document.getElementById('recentAssessments');
        if (!container) return;

        if (assessments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No assessments yet</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='/assessment.html'">
                        Start Your First Assessment
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = assessments.map(assessment => `
            <div class="assessment-item" data-assessment-id="${assessment.id}">
                <div class="assessment-info">
                    <h4>${assessment.title}</h4>
                    <p class="assessment-meta">
                        <span class="skill-tag">${assessment.skill}</span>
                        <span class="date">${this.formatDate(assessment.completedAt)}</span>
                    </p>
                </div>
                <div class="assessment-score ${this.getScoreClass(assessment.score)}">
                    ${assessment.score}%
                </div>
            </div>
        `).join('');

        // Add click listeners to assessment items
        container.querySelectorAll('.assessment-item').forEach(item => {
            item.addEventListener('click', () => {
                const assessmentId = item.dataset.assessmentId;
                this.viewAssessmentDetails(assessmentId);
            });
        });
    }

    /**
     * Update achievements display
     */
    updateAchievements(achievements) {
        const container = document.getElementById('recentAchievements');
        if (!container) return;

        if (achievements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Complete assessments to earn achievements!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-card">
                <div class="achievement-icon">${achievement.icon || '🏆'}</div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                    <small>${this.formatDate(achievement.earnedAt)}</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get CSS class for score
     */
    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 80) return 'score-good';
        if (score >= 70) return 'score-average';
        return 'score-needs-improvement';
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 48) return 'Yesterday';
        
        return date.toLocaleDateString();
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
