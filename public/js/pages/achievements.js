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
        this.setupAchievementComparison();
        this.setupAchievementLeaderboard();
        this.setupAchievementChallenges();
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
     * Enhanced achievement unlock animation with celebration effects
     */
    static showAchievementUnlock(achievement) {
        // Create full-screen achievement notification
        const overlay = document.createElement('div');
        overlay.className = 'achievement-unlock-overlay';
        overlay.innerHTML = `
            <div class="achievement-unlock-modal">
                <div class="unlock-animation">
                    <div class="achievement-burst">
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                        <div class="burst-ray"></div>
                    </div>
                    <div class="achievement-badge-unlock">
                        <div class="badge-glow"></div>
                        <div class="badge-icon-unlock">${achievement.icon || '🏆'}</div>
                    </div>
                </div>
                <div class="unlock-content">
                    <h1 class="unlock-title">Achievement Unlocked!</h1>
                    <h2 class="achievement-name">${achievement.name}</h2>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-rewards">
                        <div class="xp-reward">
                            <span class="xp-icon">⭐</span>
                            <span class="xp-amount">+${achievement.xpReward} XP</span>
                        </div>
                        ${achievement.bonusReward ? `
                            <div class="bonus-reward">
                                <span class="bonus-icon">${achievement.bonusReward.icon}</span>
                                <span class="bonus-text">${achievement.bonusReward.text}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="unlock-actions">
                        <button class="btn btn-primary" onclick="this.closest('.achievement-unlock-overlay').remove()">
                            Awesome!
                        </button>
                        <button class="btn btn-outline" onclick="achievementsPage.shareUnlock('${achievement.id}')">
                            Share Achievement
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trigger celebration effects
        this.triggerCelebrationEffects();

        // Auto-remove after 10 seconds if not closed
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }
        }, 10000);
    }

    /**
     * Trigger celebration effects (confetti, particles, sound)
     */
    static triggerCelebrationEffects() {
        // Create confetti explosion
        for (let i = 0; i < 100; i++) {
            this.createConfettiParticle();
        }

        // Create sparkle effects
        for (let i = 0; i < 50; i++) {
            this.createSparkleParticle();
        }

        // Trigger achievement sound (if enabled)
        this.playAchievementSound();
    }

    /**
     * Create confetti particle animation
     */
    static createConfettiParticle() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = this.getRandomConfettiColor();
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 3) + 's';

        document.body.appendChild(confetti);

        // Remove after animation
        setTimeout(() => confetti.remove(), 5000);
    }

    /**
     * Create sparkle particle animation
     */
    static createSparkleParticle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-particle';
        sparkle.innerHTML = '✨';
        sparkle.style.left = Math.random() * 100 + 'vw';
        sparkle.style.top = Math.random() * 100 + 'vh';
        sparkle.style.animationDelay = Math.random() * 2 + 's';

        document.body.appendChild(sparkle);

        setTimeout(() => sparkle.remove(), 3000);
    }

    /**
     * Interactive achievement comparison tool
     */
    setupAchievementComparison() {
        const compareBtn = document.getElementById('compareAchievementsBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.showComparisonModal());
        }
    }

    /**
     * Show achievement comparison modal
     */
    showComparisonModal() {
        modal.show({
            title: 'Compare Achievements',
            size: 'large',
            content: `
                <div class="achievement-comparison">
                    <div class="comparison-selector">
                        <h4>Select achievements to compare</h4>
                        <div class="user-selector">
                            <input type="text" id="compareUsername" placeholder="Enter username to compare with" />
                            <button class="btn btn-outline" onclick="achievementsPage.loadUserForComparison()">
                                Load User
                            </button>
                        </div>
                    </div>
                    <div id="comparisonResults" class="comparison-results">
                        <!-- Comparison results will be loaded here -->
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Close',
                    action: () => modal.hide()
                }
            ]
        });
    }

    /**
     * Enhanced achievement progress tracking with micro-interactions
     */
    updateAchievementProgress(achievementId, newProgress) {
        const achievementCard = document.querySelector(`[data-achievement-id="${achievementId}"]`);
        if (!achievementCard) return;

        const progressBar = achievementCard.querySelector('.achievement-progress .progress-fill');
        const progressText = achievementCard.querySelector('.progress-text');

        if (progressBar && progressText) {
            // Animate progress bar
            const currentWidth = parseFloat(progressBar.style.width) || 0;
            this.animateProgress(progressBar, currentWidth, newProgress);

            // Update progress text with count-up animation
            this.animateProgressText(progressText, Math.round(currentWidth), Math.round(newProgress));

            // Add glow effect if near completion
            if (newProgress >= 90) {
                achievementCard.classList.add('near-completion');
            }

            // Trigger unlock if completed
            if (newProgress >= 100) {
                setTimeout(() => {
                    this.unlockAchievement(achievementId);
                }, 1000);
            }
        }
    }

    /**
     * Animate progress bar with easing
     */
    animateProgress(element, from, to) {
        const duration = 1000;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out-cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = from + (to - from) * easeOut;

            element.style.width = currentValue + '%';

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Animate progress text with count-up effect
     */
    animateProgressText(element, from, to) {
        const duration = 1000;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = Math.round(from + (to - from) * progress);
            element.textContent = currentValue + '% complete';

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Achievement leaderboard functionality
     */
    setupAchievementLeaderboard() {
        const leaderboardBtn = document.getElementById('viewLeaderboardBtn');
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => this.showLeaderboardModal());
        }
    }

    /**
     * Show achievement leaderboard modal
     */
    showLeaderboardModal() {
        modal.show({
            title: '🏆 Achievement Leaderboard',
            size: 'large',
            content: `
                <div class="achievement-leaderboard">
                    <div class="leaderboard-filters">
                        <select id="leaderboardCategory">
                            <option value="all">All Categories</option>
                            <option value="learning">Learning</option>
                            <option value="assessment">Assessment</option>
                            <option value="progress">Progress</option>
                            <option value="social">Social</option>
                        </select>
                        <select id="leaderboardTimeframe">
                            <option value="all-time">All Time</option>
                            <option value="month">This Month</option>
                            <option value="week">This Week</option>
                        </select>
                    </div>
                    <div id="leaderboardContent" class="leaderboard-content">
                        <div class="loading-spinner">Loading leaderboard...</div>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Close',
                    action: () => modal.hide()
                }
            ]
        });

        this.loadLeaderboardData();
    }

    /**
     * Interactive achievement hunt/challenges
     */
    setupAchievementChallenges() {
        const challengesBtn = document.getElementById('activeChallengesBtn');
        if (challengesBtn) {
            challengesBtn.addEventListener('click', () => this.showActiveChallenges());
        }
    }

    /**
     * Show active achievement challenges
     */
    showActiveChallenges() {
        modal.show({
            title: '🎯 Active Challenges',
            content: `
                <div class="achievement-challenges">
                    <div class="challenges-header">
                        <p>Complete these special challenges to earn exclusive achievements!</p>
                    </div>
                    <div id="challengesList" class="challenges-list">
                        ${this.generateChallengesList()}
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Close',
                    action: () => modal.hide()
                }
            ]
        });
    }

    /**
     * Generate active challenges list
     */
    generateChallengesList() {
        const challenges = [
            {
                id: 'weekly_assessor',
                title: 'Weekly Assessor',
                description: 'Complete 5 assessments this week',
                progress: 2,
                target: 5,
                reward: '🏅 Assessment Master Badge',
                timeLeft: '3 days'
            },
            {
                id: 'streak_maintainer',
                title: 'Streak Maintainer',
                description: 'Maintain a 7-day learning streak',
                progress: 4,
                target: 7,
                reward: '🔥 Streak Champion Badge',
                timeLeft: '3 days'
            },
            {
                id: 'skill_explorer',
                title: 'Skill Explorer',
                description: 'Try assessments in 3 different categories',
                progress: 1,
                target: 3,
                reward: '🌟 Explorer Badge',
                timeLeft: '1 week'
            }
        ];

        return challenges.map(challenge => `
            <div class="challenge-card">
                <div class="challenge-header">
                    <h4>${challenge.title}</h4>
                    <span class="time-left">${challenge.timeLeft} left</span>
                </div>
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(challenge.progress / challenge.target) * 100}%"></div>
                    </div>
                    <span class="progress-text">${challenge.progress}/${challenge.target}</span>
                </div>
                <div class="challenge-reward">
                    <span class="reward-icon">🎁</span>
                    <span class="reward-text">${challenge.reward}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Achievement sharing with social integration
     */
    shareUnlock(achievementId) {
        const achievement = this.achievementsData.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        modal.show({
            title: 'Share Your Achievement',
            content: `
                <div class="achievement-share">
                    <div class="share-preview">
                        <div class="achievement-card-share">
                            <div class="achievement-badge">${achievement.icon || '🏆'}</div>
                            <h3>I just unlocked "${achievement.name}"!</h3>
                            <p>${achievement.description}</p>
                            <div class="share-stats">
                                <span>+${achievement.xpReward} XP earned</span>
                                <span>SkillForge Learning Platform</span>
                            </div>
                        </div>
                    </div>
                    <div class="share-options">
                        <div class="share-buttons">
                            <button class="share-btn social-twitter" onclick="achievementsPage.shareToSocial('twitter', '${achievementId}')">
                                🐦 Share on Twitter
                            </button>
                            <button class="share-btn social-linkedin" onclick="achievementsPage.shareToSocial('linkedin', '${achievementId}')">
                                💼 Share on LinkedIn
                            </button>
                            <button class="share-btn social-copy" onclick="achievementsPage.copyShareText('${achievementId}')">
                                📋 Copy Share Text
                            </button>
                        </div>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Done',
                    primary: true,
                    action: () => modal.hide()
                }
            ]
        });
    }

    /**
     * Share to social media platforms
     */
    shareToSocial(platform, achievementId) {
        const achievement = this.achievementsData.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        const shareText = `I just unlocked "${achievement.name}" on SkillForge! ${achievement.description} 🎉`;
        const shareUrl = `${window.location.origin}/achievements?highlight=${achievementId}`;

        let shareUrlPlatform;
        switch (platform) {
            case 'twitter':
                shareUrlPlatform = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'linkedin':
                shareUrlPlatform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            default:
                return;
        }

        window.open(shareUrlPlatform, '_blank', 'width=600,height=400');
    }

    /**
     * Copy share text to clipboard
     */
    copyShareText(achievementId) {
        const achievement = this.achievementsData.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        const shareText = `I just unlocked "${achievement.name}" on SkillForge! ${achievement.description} 🎉\n\nJoin me at ${window.location.origin}`;

        navigator.clipboard.writeText(shareText).then(() => {
            notifications.show({
                type: 'success',
                message: 'Share text copied to clipboard!'
            });
        }).catch(() => {
            notifications.show({
                type: 'error',
                message: 'Failed to copy share text'
            });
        });
    }

    /**
     * Helper methods for animations and effects
     */
    static getRandomConfettiColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static playAchievementSound() {
        // Check if user has sound enabled
        const soundEnabled = localStorage.getItem('achievementSounds') !== 'false';
        if (!soundEnabled) return;

        // Create and play achievement sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvnApAJUi7uH/Vgfl');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignore errors if audio can't play
        });
    }
}

// Global reference for onclick handlers
window.achievementsPage = null;

// Initialize achievements page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.achievementsPage = new AchievementsPage();
    });
} else {
    window.achievementsPage = new AchievementsPage();
}
