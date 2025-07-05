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

    getSkillLevelClass(level) {
        const levelMap = {
            'Beginner': 'level-beginner',
            'Intermediate': 'level-intermediate',
            'Advanced': 'level-advanced',
            'Expert': 'level-expert',
            'Master': 'level-master'
        };
        return levelMap[level] || 'level-beginner';
    }

    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 80) return 'score-good';
        if (score >= 70) return 'score-average';
        return 'score-needs-improvement';
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

    formatTimeSpent(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    /**
     * Refresh progress data
     */
    async refreshProgress() {
        notifications.info('Refreshing progress...');
        await this.loadProgressData();
        this.initializeCharts();
        notifications.success('Progress updated');
    }

    /**
     * Export progress data
     */
    async exportProgress() {
        try {
            const response = await apiClient.progress.export();
            
            // Create and download file
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `skillforge-progress-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            notifications.success('Progress data exported');
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'export_progress' });
        }
    }
}

// Initialize progress page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ProgressPage());
} else {
    new ProgressPage();
}

export default ProgressPage;
