/**
 * Progress Page Specific JavaScript
 * Handles progress tracking and skill development visualization
 */

import { apiClient } from '../api-client.js';
import { stateManager } from '../state-manager.js';
import { errorHandler } from '../utils/error-handler.js';
import { notifications } from '../components/notifications.js';
import { LoadingManager } from '../components/loading.js';

class ProgressPage {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.progressData = null;
        this.currentView = 'overview';
        this.init();
    }

    /**
     * Initialize progress page
     */
    async init() {
        try {
            // Wait for app to be ready
            if (stateManager.getState('app.isInitialized')) {
                this.setupProgress();
            } else {
                window.addEventListener('app:ready', () => this.setupProgress());
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'progress_init' });
        }
    }

    /**
     * Set up progress functionality
     */
    async setupProgress() {
        this.setupEventListeners();
        await this.loadProgressData();
        this.initializeCharts();
        this.setupSkillComparison();
        this.setupGoalTracking();
        this.setupExportHandlers();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // View toggle buttons
        const viewButtons = document.querySelectorAll('[data-view]');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                this.switchView(view);
                this.updateActiveButton(button);
            });
        });

        // Skill cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.skill-card')) {
                const skillCard = e.target.closest('.skill-card');
                const skillId = skillCard.dataset.skillId;
                this.showSkillDetails(skillId);
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshProgress');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshProgress());
        }

        // Export progress button
        const exportBtn = document.getElementById('exportProgress');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProgress());
        }
    }

    /**
     * Load progress data
     */
    async loadProgressData() {
        try {
            this.loadingManager.show('Loading progress data...');

            const [overview, skills, history] = await Promise.all([
                this.loadProgressOverview(),
                this.loadSkillProgress(),
                this.loadProgressHistory()
            ]);

            this.progressData = {
                overview,
                skills,
                history,
                lastUpdated: new Date().toISOString()
            };

            this.updateProgressDisplay();
            stateManager.setState('progress', this.progressData);

        } catch (error) {
            errorHandler.handleError(error, { context: 'load_progress' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Load progress overview
     */
    async loadProgressOverview() {
        try {
            const response = await apiClient.progress.getOverview();
            return response.data || {
                totalSkills: 0,
                completedSkills: 0,
                averageScore: 0,
                totalTime: 0,
                streak: 0,
                level: 1,
                experience: 0,
                nextLevelExp: 100
            };
        } catch (error) {
            console.warn('Failed to load progress overview:', error);
            return {
                totalSkills: 0,
                completedSkills: 0,
                averageScore: 0,
                totalTime: 0,
                streak: 0,
                level: 1,
                experience: 0,
                nextLevelExp: 100
            };
        }
    }

    /**
     * Load skill progress
     */
    async loadSkillProgress() {
        try {
            const response = await apiClient.progress.getSkills();
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load skill progress:', error);
            return [];
        }
    }

    /**
     * Load progress history
     */
    async loadProgressHistory() {
        try {
            const response = await apiClient.progress.getHistory();
            return response.data || [];
        } catch (error) {
            console.warn('Failed to load progress history:', error);
            return [];
        }
    }

    /**
     * Update progress display
     */
    updateProgressDisplay() {
        this.updateOverview();
        this.updateSkillsView();
        this.updateHistoryView();
    }

    /**
     * Update overview section
     */
    updateOverview() {
        const overview = this.progressData.overview;

        // Update stats
        this.updateElement('totalSkills', overview.totalSkills);
        this.updateElement('completedSkills', overview.completedSkills);
        this.updateElement('averageScore', `${Math.round(overview.averageScore)}%`);
        this.updateElement('totalTime', this.formatTimeSpent(overview.totalTime));
        this.updateElement('currentStreak', `${overview.streak} days`);

        // Update level and experience
        this.updateElement('currentLevel', overview.level);
        this.updateElement('currentExp', overview.experience);
        this.updateElement('nextLevelExp', overview.nextLevelExp);

        // Update experience progress bar
        const expProgress = (overview.experience / overview.nextLevelExp) * 100;
        this.updateProgressBar('expProgressBar', expProgress);

        // Update completion rate
        const completionRate = overview.totalSkills > 0 
            ? (overview.completedSkills / overview.totalSkills) * 100 
            : 0;
        this.updateProgressBar('completionProgressBar', completionRate);
    }

    /**
     * Update skills view
     */
    updateSkillsView() {
        const container = document.getElementById('skillsList');
        if (!container) return;

        const skills = this.progressData.skills;

        if (skills.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No skills tracked yet</h3>
                    <p>Complete assessments to start tracking your skill progress.</p>
                    <button class="btn btn-primary" onclick="window.location.href='/assessment.html'">
                        Start an Assessment
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = skills.map(skill => `
            <div class="skill-card" data-skill-id="${skill.id}">
                <div class="skill-header">
                    <h4>${skill.name}</h4>
                    <span class="skill-level ${this.getSkillLevelClass(skill.level)}">${skill.level}</span>
                </div>
                <div class="skill-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${skill.progress}%"></div>
                    </div>
                    <span class="progress-text">${skill.progress}%</span>
                </div>
                <div class="skill-stats">
                    <div class="stat">
                        <span class="stat-label">Assessments</span>
                        <span class="stat-value">${skill.assessmentCount}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Best Score</span>
                        <span class="stat-value">${skill.bestScore}%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Last Practiced</span>
                        <span class="stat-value">${this.formatDate(skill.lastPracticed)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update history view
     */
    updateHistoryView() {
        const container = document.getElementById('progressHistory');
        if (!container) return;

        const history = this.progressData.history;

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No progress history available.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(entry => `
            <div class="history-entry">
                <div class="history-date">${this.formatDate(entry.date)}</div>
                <div class="history-content">
                    <h5>${entry.title}</h5>
                    <p>${entry.description}</p>
                    ${entry.score ? `<span class="history-score ${this.getScoreClass(entry.score)}">${entry.score}%</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Switch between different views
     */
    switchView(view) {
        this.currentView = view;

        // Hide all view sections
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Show selected view
        const targetSection = document.getElementById(`${view}View`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }

    /**
     * Update active button state
     */
    updateActiveButton(activeButton) {
        // Remove active class from all buttons
        const buttons = document.querySelectorAll('[data-view]');
        buttons.forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to clicked button
        activeButton.classList.add('active');
    }

    /**
     * Show skill details
     */
    async showSkillDetails(skillId) {
        try {
            this.loadingManager.show('Loading skill details...');
            
            const response = await apiClient.progress.getSkillDetails(skillId);
            const skillDetails = response.data;
            
            this.displaySkillDetails(skillDetails);
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'load_skill_details' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Display skill details in modal or overlay
     */
    displaySkillDetails(skillDetails) {
        // Create or update skill details modal
        let modal = document.getElementById('skillDetailsModal');
        if (!modal) {
            modal = this.createSkillDetailsModal();
        }

        const modalContent = modal.querySelector('.modal-body');
        modalContent.innerHTML = `
            <div class="skill-details">
                <div class="skill-header">
                    <h3>${skillDetails.name}</h3>
                    <span class="skill-level ${this.getSkillLevelClass(skillDetails.level)}">${skillDetails.level}</span>
                </div>
                
                <div class="skill-chart-container">
                    <canvas id="skillProgressChart" width="400" height="200"></canvas>
                </div>
                
                <div class="skill-assessments">
                    <h4>Assessment History</h4>
                    ${skillDetails.assessments.map(assessment => `
                        <div class="assessment-entry">
                            <span class="assessment-date">${this.formatDate(assessment.date)}</span>
                            <span class="assessment-score ${this.getScoreClass(assessment.score)}">${assessment.score}%</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="skill-recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                        ${skillDetails.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        // Show modal
        modal.style.display = 'flex';
        
        // Draw skill progress chart
        this.drawSkillProgressChart(skillDetails.progressData);
    }

    /**
     * Create skill details modal
     */
    createSkillDetailsModal() {
        const modalHtml = `
            <div id="skillDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Skill Details</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('skillDetailsModal');
        
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
     * Initialize charts
     */
    initializeCharts() {
        this.drawOverallProgressChart();
        this.drawSkillDistributionChart();
    }

    /**
     * Draw overall progress chart
     */
    drawOverallProgressChart() {
        const canvas = document.getElementById('overallProgressChart');
        if (!canvas || !this.progressData.history) return;

        // Simple canvas-based chart implementation
        const ctx = canvas.getContext('2d');
        const data = this.progressData.history.slice(-30); // Last 30 entries

        if (data.length === 0) return;

        // Chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw axes
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw data line
        if (data.length > 1) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();

            data.forEach((point, index) => {
                const x = padding + (index / (data.length - 1)) * chartWidth;
                const y = canvas.height - padding - (point.score / 100) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }
    }

    /**
     * Draw skill distribution chart
     */
    drawSkillDistributionChart() {
        const canvas = document.getElementById('skillDistributionChart');
        if (!canvas || !this.progressData.skills) return;

        const ctx = canvas.getContext('2d');
        const skills = this.progressData.skills;

        if (skills.length === 0) return;

        // Group skills by level
        const levelCounts = skills.reduce((acc, skill) => {
            acc[skill.level] = (acc[skill.level] || 0) + 1;
            return acc;
        }, {});

        const levels = Object.keys(levelCounts);
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw pie chart
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        let startAngle = 0;
        const total = skills.length;

        levels.forEach((level, index) => {
            const count = levelCounts[level];
            const sliceAngle = (count / total) * 2 * Math.PI;

            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            startAngle += sliceAngle;
        });
    }

    /**
     * Enhanced interactive skill comparison and benchmarking
     */
    setupSkillComparison() {
        const compareBtn = document.getElementById('compareSkillsBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.showSkillComparisonModal());
        }
    }

    /**
     * Show skill comparison modal with interactive selection
     */
    showSkillComparisonModal() {
        const skills = this.progressData?.skills || [];
        
        modal.show({
            title: 'Compare Skills',
            size: 'large',
            content: `
                <div class="skill-comparison-selector">
                    <h4>Select Skills to Compare (2-4 skills)</h4>
                    <div class="skills-grid">
                        ${skills.map(skill => `
                            <label class="skill-selector">
                                <input type="checkbox" name="compareSkills" value="${skill.id}" />
                                <div class="skill-option">
                                    <h5>${skill.name}</h5>
                                    <div class="skill-progress-mini">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${skill.masteryLevel || 0}%"></div>
                                        </div>
                                        <span>${skill.masteryLevel || 0}%</span>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div id="comparisonChart" class="comparison-chart"></div>
            `,
            actions: [
                {
                    text: 'Compare Selected',
                    primary: true,
                    action: () => {
                        const selected = Array.from(document.querySelectorAll('input[name="compareSkills"]:checked'))
                            .map(input => input.value);
                        
                        if (selected.length >= 2 && selected.length <= 4) {
                            this.generateSkillComparison(selected);
                        } else {
                            notifications.show({
                                type: 'warning',
                                message: 'Please select 2-4 skills to compare'
                            });
                        }
                    }
                },
                {
                    text: 'Cancel',
                    action: () => modal.hide()
                }
            ]
        });

        // Setup real-time chart preview
        document.addEventListener('change', (e) => {
            if (e.target.name === 'compareSkills') {
                this.updateComparisonPreview();
            }
        });
    }

    /**
     * Generate interactive skill comparison chart
     */
    generateSkillComparison(skillIds) {
        const selectedSkills = this.progressData.skills.filter(skill => 
            skillIds.includes(skill.id));
        
        const chartContainer = document.getElementById('comparisonChart');
        if (!chartContainer) return;

        chartContainer.innerHTML = `
            <div class="comparison-chart-container">
                <canvas id="skillComparisonCanvas" width="600" height="400"></canvas>
                <div class="comparison-stats">
                    ${selectedSkills.map(skill => `
                        <div class="skill-stat">
                            <h5>${skill.name}</h5>
                            <div class="stat-details">
                                <span>Progress: ${skill.masteryLevel || 0}%</span>
                                <span>Assessments: ${skill.assessmentCount || 0}</span>
                                <span>Time Spent: ${skill.timeSpent || 0}h</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.drawComparisonChart(selectedSkills);
    }

    /**
     * Enhanced goal setting and tracking
     */
    setupGoalTracking() {
        const setGoalBtn = document.getElementById('setGoalBtn');
        if (setGoalBtn) {
            setGoalBtn.addEventListener('click', () => this.showGoalSettingModal());
        }

        // Load and display existing goals
        this.loadAndDisplayGoals();
    }

    /**
     * Show goal setting modal with smart suggestions
     */
    showGoalSettingModal() {
        const suggestions = this.generateGoalSuggestions();
        
        modal.show({
            title: 'Set Learning Goal',
            content: `
                <div class="goal-setting-form">
                    <div class="goal-suggestions">
                        <h4>🎯 Suggested Goals</h4>
                        <div class="suggestions-grid">
                            ${suggestions.map(suggestion => `
                                <div class="goal-suggestion" data-goal='${JSON.stringify(suggestion)}'>
                                    <div class="suggestion-icon">${suggestion.icon}</div>
                                    <div class="suggestion-content">
                                        <h5>${suggestion.title}</h5>
                                        <p>${suggestion.description}</p>
                                        <span class="suggestion-timeline">${suggestion.timeline}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="custom-goal-form">
                        <h4>📝 Custom Goal</h4>
                        <div class="form-group">
                            <label>Goal Type</label>
                            <select id="goalType">
                                <option value="skill_mastery">Skill Mastery</option>
                                <option value="assessment_score">Assessment Score</option>
                                <option value="learning_streak">Learning Streak</option>
                                <option value="time_spent">Time Spent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Target</label>
                            <input type="text" id="goalTarget" placeholder="e.g., 80% mastery, 30-day streak" />
                        </div>
                        <div class="form-group">
                            <label>Deadline</label>
                            <input type="date" id="goalDeadline" />
                        </div>
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <textarea id="goalNotes" placeholder="Why is this goal important to you?"></textarea>
                        </div>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Set Goal',
                    primary: true,
                    action: () => this.saveNewGoal()
                },
                {
                    text: 'Cancel',
                    action: () => modal.hide()
                }
            ]
        });

        // Setup suggestion selection
        document.addEventListener('click', (e) => {
            const suggestion = e.target.closest('.goal-suggestion');
            if (suggestion) {
                const goalData = JSON.parse(suggestion.dataset.goal);
                this.populateGoalForm(goalData);
            }
        });
    }

    /**
     * Generate smart goal suggestions based on user progress
     */
    generateGoalSuggestions() {
        const suggestions = [];
        const skills = this.progressData?.skills || [];
        
        // Find skills that are close to milestones
        skills.forEach(skill => {
            const progress = skill.masteryLevel || 0;
            
            if (progress >= 60 && progress < 80) {
                suggestions.push({
                    icon: '🎯',
                    title: `Master ${skill.name}`,
                    description: `Reach 80% mastery in ${skill.name}`,
                    timeline: '2-3 weeks',
                    type: 'skill_mastery',
                    target: skill.id,
                    value: 80
                });
            }
        });

        // Current streak suggestions
        const currentStreak = this.progressData?.streak || 0;
        if (currentStreak > 0 && currentStreak < 30) {
            suggestions.push({
                icon: '🔥',
                title: 'Build Learning Habit',
                description: 'Maintain a 30-day learning streak',
                timeline: `${30 - currentStreak} days`,
                type: 'learning_streak',
                value: 30
            });
        }

        // Assessment improvement suggestions
        const lowScoreSkills = skills.filter(skill => 
            (skill.lastAssessmentScore || 0) < 70);
        
        if (lowScoreSkills.length > 0) {
            suggestions.push({
                icon: '📈',
                title: 'Improve Assessment Scores',
                description: 'Achieve 80%+ on all assessments',
                timeline: '1-2 months',
                type: 'assessment_score',
                value: 80
            });
        }

        return suggestions.slice(0, 4); // Limit to 4 suggestions
    }

    /**
     * Enhanced learning insights with AI-powered recommendations
     */
    displayLearningInsights(insights) {
        const insightsContainer = document.getElementById('learningInsights');
        if (!insightsContainer) return;

        const enhancedInsights = this.generateEnhancedInsights(insights);
        
        insightsContainer.innerHTML = `
            <div class="insights-header">
                <h3>🧠 Your Learning Insights</h3>
                <button class="btn btn-outline btn-sm" onclick="progressPage.refreshInsights()">
                    Refresh
                </button>
            </div>
            <div class="insights-grid">
                ${enhancedInsights.map(insight => `
                    <div class="insight-card ${insight.type}">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-content">
                            <h4>${insight.title}</h4>
                            <p>${insight.description}</p>
                            ${insight.action ? `
                                <button class="btn btn-sm btn-primary" onclick="${insight.action}">
                                    ${insight.actionText}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Generate AI-powered learning insights
     */
    generateEnhancedInsights(baseInsights) {
        const insights = [...(baseInsights || [])];
        const skills = this.progressData?.skills || [];
        const recentActivity = this.progressData?.recentActivity || [];
        
        // Learning pattern analysis
        const studyTimes = recentActivity.map(activity => 
            new Date(activity.timestamp).getHours());
        
        if (studyTimes.length > 0) {
            const avgStudyTime = Math.round(
                studyTimes.reduce((sum, time) => sum + time, 0) / studyTimes.length
            );
            
            insights.push({
                type: 'pattern',
                icon: '⏰',
                title: 'Optimal Study Time',
                description: `You're most active around ${avgStudyTime}:00. Consider scheduling important study sessions during this time.`,
                actionText: 'Set Study Reminder',
                action: 'progressPage.setStudyReminder()'
            });
        }

        // Skill diversity analysis
        const categories = [...new Set(skills.map(skill => skill.category))];
        if (categories.length < 3) {
            insights.push({
                type: 'opportunity',
                icon: '🌟',
                title: 'Expand Your Horizons',
                description: 'You\'re focused on specific areas. Consider exploring new skill categories to become more well-rounded.',
                actionText: 'Explore Skills',
                action: 'window.location.href="/assessment.html"'
            });
        }

        // Progress momentum
        const recentProgress = skills.filter(skill => 
            skill.lastActivityDate && 
            new Date(skill.lastActivityDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        if (recentProgress.length === 0) {
            insights.push({
                type: 'motivation',
                icon: '🚀',
                title: 'Time to Get Back',
                description: 'You haven\'t practiced any skills recently. Small consistent steps lead to big improvements!',
                actionText: 'Start Learning',
                action: 'window.location.href="/dashboard.html"'
            });
        }

        return insights;
    }

    /**
     * Interactive learning path recommendations
     */
    setupLearningPaths() {
        const pathsContainer = document.getElementById('learningPaths');
        if (!pathsContainer) return;

        const recommendedPaths = this.generateLearningPaths();
        
        pathsContainer.innerHTML = `
            <div class="paths-header">
                <h3>🛤️ Recommended Learning Paths</h3>
                <p>Curated journeys based on your current progress</p>
            </div>
            <div class="paths-grid">
                ${recommendedPaths.map(path => `
                    <div class="learning-path-card">
                        <div class="path-header">
                            <div class="path-icon">${path.icon}</div>
                            <div class="path-info">
                                <h4>${path.title}</h4>
                                <p class="path-description">${path.description}</p>
                            </div>
                        </div>
                        <div class="path-progress">
                            <div class="path-stats">
                                <span>${path.completedSteps}/${path.totalSteps} steps</span>
                                <span>${path.estimatedTime}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${path.progress}%"></div>
                            </div>
                        </div>
                        <div class="path-actions">
                            <button class="btn btn-outline btn-sm" onclick="progressPage.viewPathDetails('${path.id}')">
                                View Details
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="progressPage.startPath('${path.id}')">
                                ${path.progress > 0 ? 'Continue' : 'Start Path'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Export progress data with multiple formats
     */
    setupExportHandlers() {
        const exportBtn = document.getElementById('exportProgressBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportOptions());
        }
    }

    /**
     * Show export options modal
     */
    showExportOptions() {
        modal.show({
            title: 'Export Your Progress',
            content: `
                <div class="export-options">
                    <h4>Choose Export Format</h4>
                    <div class="export-formats">
                        <label class="export-option">
                            <input type="radio" name="exportFormat" value="pdf" checked />
                            <div class="format-card">
                                <div class="format-icon">📄</div>
                                <h5>PDF Report</h5>
                                <p>Comprehensive progress report with charts</p>
                            </div>
                        </label>
                        <label class="export-option">
                            <input type="radio" name="exportFormat" value="csv" />
                            <div class="format-card">
                                <div class="format-icon">📊</div>
                                <h5>CSV Data</h5>
                                <p>Raw data for analysis in Excel/Sheets</p>
                            </div>
                        </label>
                        <label class="export-option">
                            <input type="radio" name="exportFormat" value="json" />
                            <div class="format-card">
                                <div class="format-icon">📁</div>
                                <h5>JSON Export</h5>
                                <p>Complete data backup</p>
                            </div>
                        </label>
                    </div>
                    
                    <div class="export-settings">
                        <h4>Export Settings</h4>
                        <label class="checkbox-option">
                            <input type="checkbox" checked /> Include assessment history
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" checked /> Include learning analytics
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" /> Include personal notes
                        </label>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Export',
                    primary: true,
                    action: () => this.performExport()
                },
                {
                    text: 'Cancel',
                    action: () => modal.hide()
                }
            ]
        });
    }

    /**
     * Perform the actual export based on selected format
     */
    performExport() {
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
        
        // Implementation would depend on chosen format
        notifications.show({
            type: 'success',
            message: `Exporting progress data as ${format.toUpperCase()}...`
        });
        
        modal.hide();
    }
}

// Global reference for onclick handlers
window.progressPage = progressPage;

// Initialize progress page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.progressPage = new ProgressPage();
    });
} else {
    window.progressPage = new ProgressPage();
}
