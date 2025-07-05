/**
 * Achievements Page Specific JavaScript
 * Handles achievements display and gamification features
 */

import { apiClient } from '../api-client.js';
import { stateManager } from '../state-manager.js';
import { errorHandler } from '../utils/error-handler.js';
import { notifications } from '../components/notifications.js';
import { LoadingManager } from '../components/loading.js';

class AchievementsPage {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.achievementsData = null;
        this.currentFilter = 'all';
        this.init();
    }

    /**
     * Initialize achievements page
     */
    async init() {
        try {
            // Wait for app to be ready
            if (stateManager.getState('app.isInitialized')) {
                this.setupAchievements();
            } else {
                window.addEventListener('app:ready', () => this.setupAchievements());
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'achievements_init' });
        }
    }

    /**
     * Set up achievements functionality
     */
    async setupAchievements() {
        this.setupEventListeners();
        await this.loadAchievementsData();
        this.initializeAnimations();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                this.filterAchievements(filter);
                this.updateActiveFilter(button);
            });
        });

        // Achievement cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.achievement-card')) {
                const card = e.target.closest('.achievement-card');
                const achievementId = card.dataset.achievementId;
                this.showAchievementDetails(achievementId);
            }
        });

        // Share achievement buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.share-achievement-btn')) {
                e.stopPropagation();
                const achievementId = e.target.dataset.achievementId;
                this.shareAchievement(achievementId);
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshAchievements');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAchievements());
        }
    }

    /**
     * Load achievements data
     */
    async loadAchievementsData() {
        try {
            this.loadingManager.show('Loading achievements...');

            const [achievements, stats, categories] = await Promise.all([
                this.loadAchievements(),
                this.loadAchievementStats(),
                this.loadAchievementCategories()
            ]);

            this.achievementsData = {
                achievements,
                stats,
                categories,
                lastUpdated: new Date().toISOString()
            };

            this.updateAchievementsDisplay();
            stateManager.setState('achievements', this.achievementsData);

        } catch (error) {
            errorHandler.handleError(error, { context: 'load_achievements' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Load achievements list
     */
    async loadAchievements() {
        try {
            const response = await apiClient.achievements.getAll();
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load achievements:', error);
            return [];
        }
    }

    /**
     * Load achievement statistics
     */
    async loadAchievementStats() {
        try {
            const response = await apiClient.achievements.getStats();
            return response.data || {
                totalAchievements: 0,
                earnedAchievements: 0,
                totalPoints: 0,
                completionRate: 0,
                recentAchievements: []
            };
        } catch (error) {
            console.warn('Failed to load achievement stats:', error);
            return {
                totalAchievements: 0,
                earnedAchievements: 0,
                totalPoints: 0,
                completionRate: 0,
                recentAchievements: []
            };
        }
    }

    /**
     * Load achievement categories
     */
    async loadAchievementCategories() {
        try {
            const response = await apiClient.achievements.getCategories();
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load achievement categories:', error);
            return [];
        }
    }

    /**
     * Update achievements display
     */
    updateAchievementsDisplay() {
        this.updateStatsSection();
        this.updateAchievementsList();
        this.updateProgress();
    }

    /**
     * Update stats section
     */
    updateStatsSection() {
        const stats = this.achievementsData.stats;

        // Update stat values
        this.updateElement('totalAchievements', stats.totalAchievements);
        this.updateElement('earnedAchievements', stats.earnedAchievements);
        this.updateElement('totalPoints', stats.totalPoints);
        this.updateElement('completionRate', `${Math.round(stats.completionRate)}%`);

        // Update progress bar
        this.updateProgressBar('achievementProgressBar', stats.completionRate);

        // Update recent achievements
        this.updateRecentAchievements(stats.recentAchievements);
    }

    /**
     * Update recent achievements
     */
    updateRecentAchievements(recentAchievements) {
        const container = document.getElementById('recentAchievements');
        if (!container) return;

        if (recentAchievements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Complete assessments to earn your first achievements!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentAchievements.slice(0, 3).map(achievement => `
            <div class="recent-achievement-item">
                <div class="achievement-icon">${achievement.icon || '🏆'}</div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p class="achievement-date">${this.formatDate(achievement.earnedAt)}</p>
                </div>
                <div class="achievement-points">+${achievement.points}</div>
            </div>
        `).join('');
    }

    /**
     * Update achievements list
     */
    updateAchievementsList() {
        const achievements = this.achievementsData.achievements;
        this.displayAchievements(achievements);
    }

    /**
     * Display achievements with current filter
     */
    displayAchievements(achievements) {
        const container = document.getElementById('achievementsList');
        if (!container) return;

        // Apply filter
        const filteredAchievements = this.applyFilter(achievements, this.currentFilter);

        if (filteredAchievements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No achievements found</h3>
                    <p>Try a different filter or complete more assessments.</p>
                </div>
            `;
            return;
        }

        // Group achievements by category
        const groupedAchievements = this.groupAchievementsByCategory(filteredAchievements);

        container.innerHTML = Object.entries(groupedAchievements).map(([category, categoryAchievements]) => `
            <div class="achievement-category">
                <h3 class="category-title">${category}</h3>
                <div class="achievements-grid">
                    ${categoryAchievements.map(achievement => this.createAchievementCard(achievement)).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Create achievement card HTML
     */
    createAchievementCard(achievement) {
        const isEarned = achievement.earnedAt !== null;
        const progressPercentage = achievement.progress || 0;

        return `
            <div class="achievement-card ${isEarned ? 'earned' : 'locked'}" 
                 data-achievement-id="${achievement.id}">
                <div class="achievement-icon ${isEarned ? '' : 'grayscale'}">
                    ${achievement.icon || '🏆'}
                </div>
                <div class="achievement-content">
                    <h4 class="achievement-title">${achievement.title}</h4>
                    <p class="achievement-description">${achievement.description}</p>
                    
                    ${!isEarned && achievement.showProgress ? `
                        <div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                            <span class="progress-text">${progressPercentage}%</span>
                        </div>
                    ` : ''}
                    
                    <div class="achievement-meta">
                        <span class="achievement-category">${achievement.category}</span>
                        <span class="achievement-points">${achievement.points} pts</span>
                        ${achievement.rarity ? `<span class="achievement-rarity rarity-${achievement.rarity}">${achievement.rarity}</span>` : ''}
                    </div>
                    
                    ${isEarned ? `
                        <div class="achievement-earned">
                            <span class="earned-date">Earned ${this.formatDate(achievement.earnedAt)}</span>
                            <button class="share-achievement-btn" data-achievement-id="${achievement.id}">
                                Share
                            </button>
                        </div>
                    ` : `
                        <div class="achievement-requirements">
                            <small>${achievement.requirements || 'Complete more assessments to unlock'}</small>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Apply filter to achievements
     */
    applyFilter(achievements, filter) {
        switch (filter) {
            case 'earned':
                return achievements.filter(a => a.earnedAt !== null);
            case 'locked':
                return achievements.filter(a => a.earnedAt === null);
            case 'recent':
                return achievements
                    .filter(a => a.earnedAt !== null)
                    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
                    .slice(0, 10);
            default:
                return achievements;
        }
    }

    /**
     * Group achievements by category
     */
    groupAchievementsByCategory(achievements) {
        return achievements.reduce((groups, achievement) => {
            const category = achievement.category || 'General';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(achievement);
            return groups;
        }, {});
    }

    /**
     * Filter achievements
     */
    filterAchievements(filter) {
        this.currentFilter = filter;
        this.displayAchievements(this.achievementsData.achievements);
    }

    /**
     * Update active filter button
     */
    updateActiveFilter(activeButton) {
        // Remove active class from all filter buttons
        const buttons = document.querySelectorAll('[data-filter]');
        buttons.forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to clicked button
        activeButton.classList.add('active');
    }

    /**
     * Show achievement details
     */
    showAchievementDetails(achievementId) {
        const achievement = this.achievementsData.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        this.displayAchievementModal(achievement);
    }

    /**
     * Display achievement details modal
     */
    displayAchievementModal(achievement) {
        // Create or update achievement modal
        let modal = document.getElementById('achievementModal');
        if (!modal) {
            modal = this.createAchievementModal();
        }

        const isEarned = achievement.earnedAt !== null;
        const modalContent = modal.querySelector('.modal-body');
        
        modalContent.innerHTML = `
            <div class="achievement-details">
                <div class="achievement-header">
                    <div class="achievement-icon large ${isEarned ? '' : 'grayscale'}">
                        ${achievement.icon || '🏆'}
                    </div>
                    <div class="achievement-info">
                        <h3>${achievement.title}</h3>
                        <p class="achievement-description">${achievement.description}</p>
                        ${isEarned ? `
                            <p class="earned-date">Earned on ${this.formatFullDate(achievement.earnedAt)}</p>
                        ` : `
                            <p class="locked-text">Not earned yet</p>
                        `}
                    </div>
                </div>
                
                <div class="achievement-stats">
                    <div class="stat">
                        <span class="stat-label">Points</span>
                        <span class="stat-value">${achievement.points}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Category</span>
                        <span class="stat-value">${achievement.category}</span>
                    </div>
                    ${achievement.rarity ? `
                        <div class="stat">
                            <span class="stat-label">Rarity</span>
                            <span class="stat-value rarity-${achievement.rarity}">${achievement.rarity}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${!isEarned ? `
                    <div class="achievement-requirements">
                        <h4>Requirements</h4>
                        <p>${achievement.requirements || 'Complete assessments to unlock this achievement'}</p>
                        ${achievement.showProgress ? `
                            <div class="progress-section">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${achievement.progress || 0}%"></div>
                                </div>
                                <span class="progress-text">${achievement.progress || 0}% complete</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="achievement-actions">
                        <button class="btn btn-primary" onclick="window.achievements.shareAchievement('${achievement.id}')">
                            Share Achievement
                        </button>
                    </div>
                `}
            </div>
        `;

        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Create achievement details modal
     */
    createAchievementModal() {
        const modalHtml = `
            <div id="achievementModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Achievement Details</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('achievementModal');
        
        // Add close functionality
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        return modal;
    }

    /**
     * Share achievement
     */
    async shareAchievement(achievementId) {
        const achievement = this.achievementsData.achievements.find(a => a.id === achievementId);
        if (!achievement || !achievement.earnedAt) return;

        try {
            const shareData = {
                title: `I earned the "${achievement.title}" achievement on SkillForge!`,
                text: `${achievement.description} - ${achievement.points} points earned!`,
                url: window.location.origin
            };

            if (navigator.share) {
                await navigator.share(shareData);
                notifications.success('Achievement shared!');
            } else {
                // Fallback: copy to clipboard
                const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
                await navigator.clipboard.writeText(shareText);
                notifications.success('Achievement details copied to clipboard!');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                errorHandler.handleError(error, { context: 'share_achievement' });
            }
        }
    }

    /**
     * Update progress section
     */
    updateProgress() {
        // Update level progress if available
        const userLevel = stateManager.getState('auth.user.level') || 1;
        const userExp = stateManager.getState('auth.user.experience') || 0;
        const nextLevelExp = stateManager.getState('auth.user.nextLevelExp') || 100;

        this.updateElement('userLevel', userLevel);
        this.updateElement('userExp', userExp);
        this.updateElement('nextLevelExp', nextLevelExp);

        const levelProgress = (userExp / nextLevelExp) * 100;
        this.updateProgressBar('levelProgressBar', levelProgress);
    }

    /**
     * Initialize animations
     */
    initializeAnimations() {
        // Add intersection observer for achievement cards
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        // Observe achievement cards
        document.querySelectorAll('.achievement-card').forEach(card => {
            observer.observe(card);
        });
    }

    /**
     * Helper methods
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateProgressBar(id, percentage) {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 48) return 'Yesterday';
        
        return date.toLocaleDateString();
    }

    formatFullDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Refresh achievements data
     */
    async refreshAchievements() {
        notifications.info('Refreshing achievements...');
        await this.loadAchievementsData();
        this.initializeAnimations();
        notifications.success('Achievements updated');
    }
}

// Initialize achievements page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.achievements = new AchievementsPage();
    });
} else {
    window.achievements = new AchievementsPage();
}

export default AchievementsPage;
