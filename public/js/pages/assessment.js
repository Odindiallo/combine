/**
 * Assessment Page Specific JavaScript
 * Handles assessment functionality and question management
 */

import { apiClient } from '../api-client.js';
import { stateManager } from '../state-manager.js';
import { errorHandler } from '../utils/error-handler.js';
import { notifications } from '../components/notifications.js';
import { modalManager, Modal } from '../components/modal.js';
import { LoadingManager } from '../components/loading.js';

class AssessmentPage {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.currentAssessment = null;
        this.currentQuestionIndex = 0;
        this.answers = new Map();
        this.timer = null;
        this.timeRemaining = 0;
        this.init();
    }

    /**
     * Initialize assessment page
     */
    async init() {
        try {
            // Wait for app to be ready
            if (stateManager.getState('app.isInitialized')) {
                this.setupAssessment();
            } else {
                window.addEventListener('app:ready', () => this.setupAssessment());
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'assessment_init' });
        }
    }

    /**
     * Set up assessment functionality
     */
    async setupAssessment() {
        this.setupEventListeners();
        this.setupModals();
        await this.loadInitialData();
        this.handleUrlParams();
        this.setupAssessmentSelection();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitAssessmentBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitAssessment());
        }

        // Start assessment buttons
        const startBtns = document.querySelectorAll('.start-assessment-btn');
        startBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const assessmentId = btn.dataset.assessmentId;
                this.startAssessment(assessmentId);
            });
        });

        // Answer selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="answer"]')) {
                this.saveAnswer(e.target.value);
            }
        });

        // Prevent accidental navigation during assessment
        window.addEventListener('beforeunload', (e) => {
            if (this.currentAssessment && this.currentAssessment.status === 'in_progress') {
                e.preventDefault();
                e.returnValue = 'You have an assessment in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Set up modals
     */
    setupModals() {
        // Create submit confirmation modal if it doesn't exist
        if (!document.getElementById('submitConfirmModal')) {
            const modalHtml = `
                <div id="submitConfirmModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Submit Assessment</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to submit this assessment?</p>
                            <p class="text-muted">You won't be able to change your answers after submission.</p>
                        </div>
                        <div class="modal-footer">
                            <button id="cancelSubmit" class="btn btn-outline">Cancel</button>
                            <button id="confirmSubmit" class="btn btn-primary">Submit Assessment</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        modalManager.register('submitConfirm', new Modal('submitConfirmModal'));

        // Set up modal event listeners
        const cancelSubmit = document.getElementById('cancelSubmit');
        const confirmSubmit = document.getElementById('confirmSubmit');

        if (cancelSubmit) {
            cancelSubmit.addEventListener('click', () => {
                modalManager.close('submitConfirm');
            });
        }

        if (confirmSubmit) {
            confirmSubmit.addEventListener('click', () => {
                modalManager.close('submitConfirm');
                this.confirmSubmitAssessment();
            });
        }
    }

    /**
     * Handle URL parameters
     */
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const assessmentId = urlParams.get('id');
        const viewId = urlParams.get('view');

        if (assessmentId) {
            this.startAssessment(assessmentId);
        } else if (viewId) {
            this.viewAssessmentResults(viewId);
        } else {
            this.showAssessmentList();
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this.loadingManager.show('Loading assessments...');
            
            const response = await apiClient.assessments.getAvailable();
            const assessments = response.data || [];
            
            this.updateAssessmentList(assessments);
            stateManager.setState('assessments.available', assessments);
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'load_assessments' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Update assessment list display
     */
    updateAssessmentList(assessments) {
        const container = document.getElementById('assessmentList');
        if (!container) return;

        if (assessments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No assessments available</h3>
                    <p>Check back later for new assessments.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = assessments.map(assessment => `
            <div class="assessment-card" data-assessment-id="${assessment.id}">
                <div class="assessment-header">
                    <h3>${assessment.title}</h3>
                    <span class="skill-tag">${assessment.skill}</span>
                </div>
                <div class="assessment-details">
                    <p>${assessment.description}</p>
                    <div class="assessment-meta">
                        <span><i class="icon-clock"></i> ${assessment.duration} minutes</span>
                        <span><i class="icon-questions"></i> ${assessment.questionCount} questions</span>
                        <span class="difficulty difficulty-${assessment.difficulty}">${assessment.difficulty}</span>
                    </div>
                </div>
                <div class="assessment-actions">
                    <button class="btn btn-primary start-assessment-btn" data-assessment-id="${assessment.id}">
                        Start Assessment
                    </button>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners
        container.querySelectorAll('.start-assessment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const assessmentId = btn.dataset.assessmentId;
                this.startAssessment(assessmentId);
            });
        });
    }

    /**
     * Start an assessment
     */
    async startAssessment(assessmentId) {
        try {
            this.loadingManager.show('Starting assessment...');
            
            const response = await apiClient.assessments.start(assessmentId);
            this.currentAssessment = response.data;
            
            this.currentQuestionIndex = 0;
            this.answers.clear();
            
            this.showAssessmentInterface();
            this.loadCurrentQuestion();
            this.startTimer();
            
            notifications.success('Assessment started! Good luck!');
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'start_assessment' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Show assessment interface
     */
    showAssessmentInterface() {
        // Hide assessment list
        const listContainer = document.getElementById('assessmentListContainer');
        if (listContainer) {
            listContainer.style.display = 'none';
        }

        // Show assessment interface
        const assessmentContainer = document.getElementById('assessmentContainer');
        if (assessmentContainer) {
            assessmentContainer.style.display = 'block';
        }

        // Update assessment header
        this.updateAssessmentHeader();
    }

    /**
     * Update assessment header
     */
    updateAssessmentHeader() {
        const titleElement = document.getElementById('assessmentTitle');
        const progressElement = document.getElementById('assessmentProgress');
        const timerElement = document.getElementById('assessmentTimer');

        if (titleElement && this.currentAssessment) {
            titleElement.textContent = this.currentAssessment.title;
        }

        if (progressElement && this.currentAssessment) {
            const progress = ((this.currentQuestionIndex + 1) / this.currentAssessment.questions.length) * 100;
            progressElement.style.width = `${progress}%`;
            
            const progressText = document.getElementById('progressText');
            if (progressText) {
                progressText.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.currentAssessment.questions.length}`;
            }
        }
    }

    /**
     * Load current question
     */
    loadCurrentQuestion() {
        if (!this.currentAssessment || !this.currentAssessment.questions) return;

        const question = this.currentAssessment.questions[this.currentQuestionIndex];
        if (!question) return;

        this.updateQuestionDisplay(question);
        this.updateNavigationButtons();
        this.updateAssessmentHeader();
        this.updateQuestionNavigation();
    }

    /**
     * Update question display
     */
    updateQuestionDisplay(question) {
        const questionContainer = document.getElementById('questionContainer');
        if (!questionContainer) return;

        const savedAnswer = this.answers.get(question.id);

        questionContainer.innerHTML = `
            <div class="question">
                <h3 class="question-text">${question.text}</h3>
                ${question.code ? `<pre class="code-block"><code>${question.code}</code></pre>` : ''}
                <div class="answer-options">
                    ${question.options.map((option, index) => `
                        <label class="answer-option">
                            <input type="radio" 
                                   name="answer" 
                                   value="${option.id}" 
                                   ${savedAnswer === option.id ? 'checked' : ''}>
                            <span class="option-text">${option.text}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Update navigation buttons
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitAssessmentBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }

        if (nextBtn && submitBtn) {
            const isLastQuestion = this.currentQuestionIndex === this.currentAssessment.questions.length - 1;
            nextBtn.style.display = isLastQuestion ? 'none' : 'block';
            submitBtn.style.display = isLastQuestion ? 'block' : 'none';
        }
    }

    /**
     * Enhanced assessment selection with real-time filtering and search
     */
    setupAssessmentSelection() {
        const searchInput = document.getElementById('assessmentSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const difficultyFilter = document.getElementById('difficultyFilter');

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAssessments(e.target.value);
            });
        }

        // Category filtering
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        // Difficulty filtering
        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', (e) => {
                this.filterByDifficulty(e.target.value);
            });
        }
    }

    /**
     * Filter assessments by search term
     */
    filterAssessments(searchTerm) {
        const assessmentCards = document.querySelectorAll('.assessment-card');
        const term = searchTerm.toLowerCase();

        assessmentCards.forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.assessment-description')?.textContent.toLowerCase() || '';
            
            if (title.includes(term) || description.includes(term)) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });

        this.updateResultsCount();
    }

    /**
     * Enhanced question navigation with progress visualization
     */
    updateQuestionNavigation() {
        if (!this.currentAssessment) return;

        const { questions } = this.currentAssessment;
        const currentIndex = this.currentQuestionIndex;
        
        // Update progress bar
        const progressBar = document.querySelector('.question-progress-fill');
        if (progressBar) {
            const progress = ((currentIndex + 1) / questions.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Update question counter
        const questionCounter = document.getElementById('questionCounter');
        if (questionCounter) {
            questionCounter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitAssessmentBtn');

        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
            prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        }

        if (nextBtn && submitBtn) {
            const isLastQuestion = currentIndex === questions.length - 1;
            nextBtn.style.display = isLastQuestion ? 'none' : 'block';
            submitBtn.style.display = isLastQuestion ? 'block' : 'none';
        }

        // Update question navigation dots
        this.updateQuestionDots();
    }

    /**
     * Create interactive question navigation dots
     */
    updateQuestionDots() {
        if (!this.currentAssessment) return;

        const dotsContainer = document.getElementById('questionDots');
        if (!dotsContainer) return;

        const { questions } = this.currentAssessment;
        
        dotsContainer.innerHTML = questions.map((_, index) => {
            const isActive = index === this.currentQuestionIndex;
            const isAnswered = this.answers.has(index);
            
            return `
                <button 
                    class="question-dot ${isActive ? 'active' : ''} ${isAnswered ? 'answered' : ''}"
                    onclick="assessmentPage.goToQuestion(${index})"
                    title="Question ${index + 1}"
                >
                    ${index + 1}
                </button>
            `;
        }).join('');
    }

    /**
     * Go to specific question
     */
    goToQuestion(questionIndex) {
        if (!this.currentAssessment || questionIndex < 0 || questionIndex >= this.currentAssessment.questions.length) {
            return;
        }

        this.currentQuestionIndex = questionIndex;
        this.displayCurrentQuestion();
        this.updateQuestionNavigation();
    }

    /**
     * Enhanced answer selection with immediate feedback
     */
    setupAnswerHandlers() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="answer"]')) {
                this.handleAnswerSelection(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.answer-option') || e.target.closest('.answer-option')) {
                const option = e.target.closest('.answer-option');
                const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                if (input) {
                    input.checked = !input.checked;
                    this.handleAnswerSelection(input);
                }
            }
        });
    }

    /**
     * Handle answer selection with visual feedback
     */
    handleAnswerSelection(input) {
        const questionIndex = this.currentQuestionIndex;
        const value = input.value;
        
        // Save answer
        if (input.type === 'radio') {
            this.answers.set(questionIndex, value);
        } else if (input.type === 'checkbox') {
            const currentAnswers = this.answers.get(questionIndex) || [];
            if (input.checked) {
                currentAnswers.push(value);
            } else {
                const index = currentAnswers.indexOf(value);
                if (index > -1) currentAnswers.splice(index, 1);
            }
            this.answers.set(questionIndex, currentAnswers);
        }

        // Visual feedback
        const option = input.closest('.answer-option');
        if (option) {
            option.classList.add('selected');
            
            // Remove selected class from other options for radio buttons
            if (input.type === 'radio') {
                const allOptions = document.querySelectorAll('.answer-option');
                allOptions.forEach(opt => {
                    if (opt !== option) {
                        opt.classList.remove('selected');
                    }
                });
            }
        }

        // Update progress
        this.updateQuestionDots();
        this.updateAnswerProgress();
        
        // Save to localStorage for persistence
        this.saveProgressLocally();
    }

    /**
     * Setup timer functionality with visual countdown
     */
    setupTimer(duration) {
        this.timeRemaining = duration;
        this.updateTimerDisplay();

        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            // Warning when time is running low
            if (this.timeRemaining <= 300) { // 5 minutes
                this.showTimeWarning();
            }

            if (this.timeRemaining <= 0) {
                this.handleTimeExpired();
            }
        }, 1000);
    }

    /**
     * Update timer display with visual indicators
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('assessmentTimer');
        if (!timerElement) return;

        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        timerElement.textContent = timeString;

        // Color coding based on remaining time
        const percentage = this.timeRemaining / (this.currentAssessment?.duration || 1800);
        if (percentage > 0.5) {
            timerElement.className = 'timer-normal';
        } else if (percentage > 0.25) {
            timerElement.className = 'timer-warning';
        } else {
            timerElement.className = 'timer-danger';
        }
    }

    /**
     * Show time warning notification
     */
    showTimeWarning() {
        if (this.timeRemaining === 300) { // Show once at 5 minutes
            notifications.show({
                type: 'warning',
                title: 'Time Warning',
                message: '5 minutes remaining! Please review your answers.',
                duration: 10000
            });
        }
    }

    /**
     * Handle time expiration
     */
    handleTimeExpired() {
        clearInterval(this.timer);
        notifications.show({
            type: 'error',
            title: 'Time Expired',
            message: 'Assessment time has ended. Submitting your answers.',
            duration: 5000
        });
        
        setTimeout(() => {
            this.submitAssessment(true); // Auto-submit
        }, 2000);
    }

    /**
     * Update answer progress indicator
     */
    updateAnswerProgress() {
        const progressElement = document.getElementById('answerProgress');
        if (!progressElement || !this.currentAssessment) return;

        const totalQuestions = this.currentAssessment.questions.length;
        const answeredQuestions = this.answers.size;
        const percentage = (answeredQuestions / totalQuestions) * 100;

        progressElement.innerHTML = `
            <div class="progress-text">
                ${answeredQuestions} of ${totalQuestions} questions answered
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    }

    /**
     * Save progress locally for persistence
     */
    saveProgressLocally() {
        if (!this.currentAssessment) return;

        const progressData = {
            assessmentId: this.currentAssessment.id,
            currentQuestionIndex: this.currentQuestionIndex,
            answers: Array.from(this.answers.entries()),
            timeRemaining: this.timeRemaining,
            timestamp: Date.now()
        };

        localStorage.setItem('assessment_progress', JSON.stringify(progressData));
    }

    /**
     * Restore progress from local storage
     */
    restoreProgressFromLocal() {
        const saved = localStorage.getItem('assessment_progress');
        if (!saved) return false;

        try {
            const progressData = JSON.parse(saved);
            
            // Check if saved progress is for current assessment and recent
            if (progressData.assessmentId === this.currentAssessment?.id &&
                Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
                
                this.currentQuestionIndex = progressData.currentQuestionIndex;
                this.answers = new Map(progressData.answers);
                this.timeRemaining = progressData.timeRemaining;
                
                return true;
            }
        } catch (error) {
            console.error('Failed to restore progress:', error);
        }

        return false;
    }

    /**
     * Submit assessment (show confirmation)
     */
    submitAssessment() {
        const unansweredCount = this.currentAssessment.questions.length - this.answers.size;
        
        if (unansweredCount > 0) {
            const message = `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`;
            if (!confirm(message)) {
                return;
            }
        }

        modalManager.open('submitConfirm');
    }

    /**
     * Confirm and submit assessment
     */
    async confirmSubmitAssessment() {
        try {
            this.loadingManager.show('Submitting assessment...');
            this.stopTimer();

            const submission = {
                assessmentId: this.currentAssessment.id,
                answers: Object.fromEntries(this.answers),
                timeSpent: this.currentAssessment.duration * 60 - this.timeRemaining
            };

            const response = await apiClient.assessments.submit(submission);
            
            this.showResults(response.data);
            notifications.success('Assessment submitted successfully!');
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'submit_assessment' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Show assessment results
     */
    showResults(results) {
        // Hide assessment interface
        const assessmentContainer = document.getElementById('assessmentContainer');
        if (assessmentContainer) {
            assessmentContainer.style.display = 'none';
        }

        // Show results
        this.displayResults(results);
    }

    /**
     * Display assessment results
     */
    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer') || this.createResultsContainer();
        
        resultsContainer.innerHTML = `
            <div class="results-header">
                <h2>Assessment Complete!</h2>
                <div class="score-display">
                    <div class="score-circle">
                        <span class="score-value">${results.score}%</span>
                    </div>
                    <p class="score-message">${this.getScoreMessage(results.score)}</p>
                </div>
            </div>
            
            <div class="results-details">
                <div class="stat-card">
                    <h4>Correct Answers</h4>
                    <p>${results.correctAnswers} / ${results.totalQuestions}</p>
                </div>
                <div class="stat-card">
                    <h4>Time Spent</h4>
                    <p>${this.formatTime(results.timeSpent)}</p>
                </div>
                <div class="stat-card">
                    <h4>Skill Level</h4>
                    <p>${results.skillLevel}</p>
                </div>
            </div>

            <div class="results-actions">
                <button class="btn btn-primary" onclick="window.location.href='/dashboard.html'">
                    Back to Dashboard
                </button>
                <button class="btn btn-outline" onclick="window.location.href='/progress.html'">
                    View Progress
                </button>
            </div>
        `;

        resultsContainer.style.display = 'block';
    }

    /**
     * Create results container
     */
    createResultsContainer() {
        const container = document.createElement('div');
        container.id = 'resultsContainer';
        container.className = 'results-container';
        document.querySelector('.main-content').appendChild(container);
        return container;
    }

    /**
     * Get score message
     */
    getScoreMessage(score) {
        if (score >= 90) return 'Excellent work! You have mastered this skill.';
        if (score >= 80) return 'Great job! You have a strong understanding.';
        if (score >= 70) return 'Good work! Keep practicing to improve.';
        if (score >= 60) return 'Not bad! Review the topics and try again.';
        return 'Keep studying and practice more. You can do it!';
    }

    /**
     * Start assessment timer
     */
    startTimer() {
        if (!this.currentAssessment) return;

        this.timeRemaining = this.currentAssessment.duration * 60; // Convert to seconds
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    /**
     * Stop assessment timer
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('assessmentTimer');
        if (timerElement) {
            timerElement.textContent = this.formatTime(this.timeRemaining);
            
            // Add warning class when time is running low
            if (this.timeRemaining <= 300) { // 5 minutes
                timerElement.classList.add('timer-warning');
            }
        }
    }

    /**
     * Handle time up
     */
    timeUp() {
        this.stopTimer();
        notifications.warning('Time is up! Submitting assessment automatically.');
        this.confirmSubmitAssessment();
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Show assessment list
     */
    showAssessmentList() {
        const listContainer = document.getElementById('assessmentListContainer');
        const assessmentContainer = document.getElementById('assessmentContainer');
        const resultsContainer = document.getElementById('resultsContainer');

        if (listContainer) listContainer.style.display = 'block';
        if (assessmentContainer) assessmentContainer.style.display = 'none';
        if (resultsContainer) resultsContainer.style.display = 'none';
    }

    /**
     * View assessment results
     */
    async viewAssessmentResults(assessmentId) {
        try {
            this.loadingManager.show('Loading results...');
            
            const response = await apiClient.assessments.getResults(assessmentId);
            this.displayResults(response.data);
            
        } catch (error) {
            errorHandler.handleError(error, { context: 'load_results' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopTimer();
    }
}

// Initialize assessment page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AssessmentPage());
} else {
    new AssessmentPage();
}

export default AssessmentPage;
