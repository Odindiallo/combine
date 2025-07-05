/**
 * Enhanced API Client for SkillForge
 * Handles all communication with the backend API with robust error handling,
 * retry logic, and comprehensive endpoint coverage
 */
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.timeout = 10000; // 10 seconds
        this.token = localStorage.getItem('skillforge_token');
        this.requestQueue = new Map(); // For deduplication
        this.eventHandlers = new Map(); // For custom events
    }

    /**
     * Set authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('skillforge_token', token);
        } else {
            localStorage.removeItem('skillforge_token');
        }
        this.emit('tokenChanged', token);
    }

    /**
     * Get current token
     * @returns {string|null} Current JWT token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get default headers for requests
     * @returns {object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Handle response and check for errors
     * @param {Response} response - Fetch response object
     * @returns {object} Parsed response data
     */
    async handleResponse(response) {
        let data;
        
        try {
            const text = await response.text();
            data = text ? JSON.parse(text) : {};
        } catch (error) {
            throw this.createError(2000, 'Invalid JSON response from server');
        }

        if (!response.ok) {
            // Handle specific HTTP status codes
            if (response.status === 401) {
                this.setToken(null);
                this.emit('unauthorized');
            } else if (response.status === 429) {
                throw this.createError(1005, 'Rate limit exceeded. Please slow down.');
            } else if (response.status === 408) {
                throw this.createError(2001, 'Request timeout');
            }

            const error = this.createError(
                data.code || response.status,
                data.error || `HTTP ${response.status}: ${response.statusText}`
            );
            error.data = data;
            throw error;
        }

        return data;
    }

    /**
     * Create standardized error object
     * @param {number} code - Error code
     * @param {string} message - Error message
     * @returns {Error} Enhanced error object
     */
    createError(code, message) {
        const error = new Error(message);
        error.code = code;
        error.timestamp = new Date().toISOString();
        return error;
    }

    /**
     * Check if error is retryable
     * @param {Error} error - Error object
     * @returns {boolean} Whether the error is retryable
     */
    isRetryableError(error) {
        // Don't retry on client errors (4xx) except timeouts
        if (error.code >= 400 && error.code < 500 && error.code !== 408) {
            return false;
        }
        // Don't retry on authentication errors
        if (error.code === 1002 || error.code === 1003) {
            return false;
        }
        return true;
    }

    /**
     * Create request signature for deduplication
     * @param {string} endpoint - API endpoint
     * @param {object} options - Request options
     * @returns {string} Request signature
     */
    createRequestSignature(endpoint, options) {
        return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}`;
    }

    /**
     * Make HTTP request with retry logic and deduplication
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {object} Response data
     */
    async request(endpoint, options = {}) {
        const signature = this.createRequestSignature(endpoint, options);
        
        // Check if request is already in progress
        if (this.requestQueue.has(signature)) {
            return this.requestQueue.get(signature);
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            timeout: this.timeout,
            ...options,
        };

        const requestPromise = this.executeRequest(url, config, signature);
        this.requestQueue.set(signature, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.requestQueue.delete(signature);
        }
    }

    /**
     * Execute the actual HTTP request with retry logic
     * @param {string} url - Full URL
     * @param {object} config - Request configuration
     * @param {string} signature - Request signature
     * @returns {object} Response data
     */
    async executeRequest(url, config, signature) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                this.emit('requestStart', { url, attempt, signature });

                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const data = await this.handleResponse(response);
                
                this.emit('requestSuccess', { url, attempt, data, signature });
                return data;

            } catch (error) {
                lastError = error;
                
                // Handle abort/timeout
                if (error.name === 'AbortError') {
                    lastError = this.createError(2001, 'Request timeout');
                }

                this.emit('requestError', { url, attempt, error: lastError, signature });

                // Don't retry if error is not retryable
                if (!this.isRetryableError(lastError)) {
                    break;
                }

                // Wait before retrying with exponential backoff
                if (attempt < this.retryAttempts) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    this.emit('requestRetry', { url, attempt: attempt + 1, delay, signature });
                }
            }
        }

        // If all retries failed, throw appropriate error
        if (lastError.code >= 2000) {
            throw lastError;
        } else {
            throw this.createError(2000, 'Network connection failed after retries');
        }
    }

    /**
     * Event system for API client
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * HTTP method shortcuts
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // ============================================
    // AUTHENTICATION ENDPOINTS
    // ============================================

    /**
     * Register new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<object>} Registration response
     */
    async register(email, password) {
        try {
            const response = await this.post('/auth/register', { email, password });
            if (response.success && response.data.token) {
                this.setToken(response.data.token);
                this.emit('userRegistered', response.data.user);
            }
            return response;
        } catch (error) {
            this.emit('authError', { type: 'register', error });
            throw error;
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<object>} Login response
     */
    async login(email, password) {
        try {
            const response = await this.post('/auth/login', { email, password });
            if (response.success && response.data.token) {
                this.setToken(response.data.token);
                this.emit('userLoggedIn', response.data.user);
            }
            return response;
        } catch (error) {
            this.emit('authError', { type: 'login', error });
            throw error;
        }
    }

    /**
     * Logout user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            if (this.token) {
                await this.get('/auth/logout');
            }
        } catch (error) {
            // Continue with logout even if request fails
            console.warn('Logout request failed:', error);
        } finally {
            this.setToken(null);
            this.emit('userLoggedOut');
        }
    }

    /**
     * Verify current token
     * @returns {Promise<object>} Verification response
     */
    async verifyToken() {
        if (!this.token) {
            throw this.createError(1003, 'No authentication token available');
        }
        
        try {
            const response = await this.get('/auth/verify');
            if (response.success) {
                this.emit('tokenVerified', response.data.user);
            }
            return response;
        } catch (error) {
            if (error.code === 1002 || error.code === 1003) {
                this.setToken(null);
            }
            throw error;
        }
    }

    // ============================================
    // SKILLS ENDPOINTS
    // ============================================

    /**
     * Get all skill categories
     * @returns {Promise<object>} Categories response
     */
    async getSkillCategories() {
        return this.get('/skills/categories');
    }

    /**
     * Get specific skill details
     * @param {number} id - Skill ID
     * @returns {Promise<object>} Skill details
     */
    async getSkill(id) {
        return this.get(`/skills/${id}`);
    }

    /**
     * Create new skill
     * @param {object} skillData - Skill data
     * @returns {Promise<object>} Created skill
     */
    async createSkill(skillData) {
        return this.post('/skills/create', skillData);
    }

    /**
     * Update existing skill
     * @param {number} id - Skill ID
     * @param {object} skillData - Updated skill data
     * @returns {Promise<object>} Updated skill
     */
    async updateSkill(id, skillData) {
        return this.put(`/skills/${id}`, skillData);
    }

    /**
     * Delete skill
     * @param {number} id - Skill ID
     * @returns {Promise<object>} Deletion response
     */
    async deleteSkill(id) {
        return this.delete(`/skills/${id}`);
    }

    // ============================================
    // ASSESSMENT ENDPOINTS
    // ============================================

    /**
     * Generate new assessment
     * @param {number} skillId - Skill ID
     * @param {number} level - Difficulty level (1-5)
     * @param {number} questionCount - Number of questions
     * @returns {Promise<object>} Generated assessment
     */
    async generateAssessment(skillId, level, questionCount = 5) {
        const response = await this.post('/assessment/generate', {
            skill_id: skillId,
            level,
            question_count: questionCount
        });
        
        if (response.success) {
            this.emit('assessmentGenerated', response.data.assessment);
        }
        
        return response;
    }

    /**
     * Submit assessment answers
     * @param {number} assessmentId - Assessment ID
     * @param {Array} answers - Array of answer objects
     * @param {number} totalTime - Total time spent in seconds
     * @returns {Promise<object>} Assessment results
     */
    async submitAssessment(assessmentId, answers, totalTime) {
        const response = await this.post('/assessment/submit', {
            assessment_id: assessmentId,
            answers,
            total_time: totalTime
        });
        
        if (response.success) {
            this.emit('assessmentSubmitted', response.data.results);
            
            // Emit specific events for achievements and level ups
            if (response.data.results.level_up) {
                this.emit('levelUp', response.data.results);
            }
            
            if (response.data.results.achievements_unlocked?.length > 0) {
                this.emit('achievementsUnlocked', response.data.results.achievements_unlocked);
            }
        }
        
        return response;
    }

    /**
     * Get user's assessment history
     * @param {number} userId - User ID
     * @returns {Promise<object>} Assessment history
     */
    async getAssessmentHistory(userId) {
        return this.get(`/assessment/history/${userId}`);
    }

    // ============================================
    // PROGRESS ENDPOINTS
    // ============================================

    /**
     * Get user's progress for specific skill
     * @param {number} userId - User ID
     * @param {number} skillId - Skill ID
     * @returns {Promise<object>} Progress data
     */
    async getProgress(userId, skillId) {
        return this.get(`/progress/${userId}/${skillId}`);
    }

    /**
     * Update user's progress
     * @param {number} userId - User ID
     * @param {number} skillId - Skill ID
     * @param {number} xpGained - XP gained
     * @param {boolean} streakMaintained - Whether streak was maintained
     * @returns {Promise<object>} Updated progress
     */
    async updateProgress(userId, skillId, xpGained, streakMaintained = false) {
        const response = await this.post('/progress/update', {
            user_id: userId,
            skill_id: skillId,
            xp_gained: xpGained,
            streak_maintained: streakMaintained
        });
        
        if (response.success) {
            this.emit('progressUpdated', response.data.progress);
            
            if (response.data.progress.level_up) {
                this.emit('levelUp', response.data.progress);
            }
            
            if (response.data.progress.achievements_unlocked?.length > 0) {
                this.emit('achievementsUnlocked', response.data.progress.achievements_unlocked);
            }
        }
        
        return response;
    }

    // ============================================
    // ACHIEVEMENTS ENDPOINTS
    // ============================================

    /**
     * Get user's achievements
     * @param {number} userId - User ID
     * @returns {Promise<object>} User achievements
     */
    async getUserAchievements(userId) {
        return this.get(`/achievements/${userId}`);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get error message for display to user
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        // Map error codes to user-friendly messages
        const errorMessages = {
            // Backend errors (1000-1999)
            1000: 'Server error. Please try again later.',
            1001: 'Database connection failed. Please try again.',
            1002: 'Your session has expired. Please log in again.',
            1003: 'Please log in to continue.',
            1004: 'You don\'t have permission to perform this action.',
            1005: 'Too many requests. Please slow down.',
            1006: 'Invalid request data.',
            1007: 'Required fields are missing.',
            1008: 'User not found.',
            1009: 'Email already exists.',
            1010: 'Invalid email or password.',
            1011: 'Skill not found.',
            1012: 'Assessment not found.',
            1013: 'AI service is temporarily unavailable.',
            1014: 'Failed to generate questions. Please try again.',
            1015: 'Failed to update progress.',
            1016: 'Failed to unlock achievement.',
            1017: 'Invalid skill level.',
            1018: 'Assessment has expired.',
            1019: 'Data conflict. Please refresh and try again.',
            
            // Frontend errors (2000-2999)
            2000: 'Network connection error. Please check your internet.',
            2001: 'Request timeout. Please try again.',
            2002: 'Invalid form data.',
            2003: 'Please check your input and try again.',
            2004: 'Browser storage is not available.',
            2005: 'Your browser is not supported.',
            2006: 'Failed to render graphics.',
            2007: 'Failed to load images.',
            2008: 'Real-time connection failed.',
            2009: 'Audio playback failed.',
            2010: 'File upload failed.',
            2011: 'Failed to load images.',
            2012: 'Failed to display charts.',
            2013: 'Failed to open dialog.',
            2014: 'Navigation error.',
            2015: 'Failed to sync data.'
        };

        return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
    }

    /**
     * Clear all pending requests
     */
    clearRequestQueue() {
        this.requestQueue.clear();
    }

    /**
     * Get current request queue size
     * @returns {number} Number of pending requests
     */
    getPendingRequestCount() {
        return this.requestQueue.size;
    }
}

// Export the class
export default APIClient;