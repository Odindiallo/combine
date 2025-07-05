/**
 * API Client for SkillForge
 * Handles all communication with the backend API
 */
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.token = localStorage.getItem('skillforge_token');
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
    }

    /**
     * Get default headers for requests
     * @returns {object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
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
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error || 'Request failed');
            error.code = data.code || response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    /**
     * Make HTTP request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {object} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, config);
                return await this.handleResponse(response);
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except timeouts
                if (error.code >= 400 && error.code < 500 && error.code !== 408) {
                    throw error;
                }

                // Wait before retrying
                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }

        // Throw network error with code 2000
        const networkError = new Error('Network connection failed after retries');
        networkError.code = 2000;
        throw networkError;
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @returns {object} Response data
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {object} Response data
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {object} Response data
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {object} Response data
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication methods
    async register(email, password) {
        const response = await this.post('/auth/register', { email, password });
        if (response.success && response.data.token) {
            this.setToken(response.data.token);
        }
        return response;
    }

    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        if (response.success && response.data.token) {
            this.setToken(response.data.token);
        }
        return response;
    }

    async logout() {
        try {
            await this.get('/auth/logout');
        } finally {
            this.setToken(null);
        }
    }

    async verifyToken() {
        return this.get('/auth/verify');
    }

    // Skills methods
    async getSkillCategories() {
        return this.get('/skills/categories');
    }

    async getSkill(id) {
        return this.get(`/skills/${id}`);
    }

    async createSkill(skillData) {
        return this.post('/skills/create', skillData);
    }

    async updateSkill(id, skillData) {
        return this.put(`/skills/${id}`, skillData);
    }

    async deleteSkill(id) {
        return this.delete(`/skills/${id}`);
    }

    // Assessment methods
    async generateAssessment(skillId, level, questionCount = 5) {
        return this.post('/assessment/generate', {
            skill_id: skillId,
            level,
            question_count: questionCount
        });
    }

    async submitAssessment(assessmentId, answers, totalTime) {
        return this.post('/assessment/submit', {
            assessment_id: assessmentId,
            answers,
            total_time: totalTime
        });
    }

    async getAssessmentHistory(userId) {
        return this.get(`/assessment/history/${userId}`);
    }

    // Progress methods
    async getProgress(userId, skillId) {
        return this.get(`/progress/${userId}/${skillId}`);
    }

    async updateProgress(userId, skillId, xpGained, streakMaintained = false) {
        return this.post('/progress/update', {
            user_id: userId,
            skill_id: skillId,
            xp_gained: xpGained,
            streak_maintained: streakMaintained
        });
    }

    // Achievement methods
    async getUserAchievements(userId) {
        return this.get(`/achievements/${userId}`);
    }
}

// Export the class
export default APIClient;