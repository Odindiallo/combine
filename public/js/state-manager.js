/**
 * State Manager for SkillForge
 * Central state management with pub/sub pattern
 */
class StateManager {
    constructor() {
        this.state = {
            user: null,
            isAuthenticated: false,
            skills: [],
            skillCategories: [],
            currentAssessment: null,
            userProgress: {},
            achievements: [],
            notifications: [],
            ui: {
                currentPage: 'index',
                loading: false,
                modals: {},
                theme: 'light'
            }
        };
        
        this.subscribers = {};
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Subscribe to state changes
     * @param {string|Array} paths - State path(s) to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(paths, callback) {
        if (typeof paths === 'string') {
            paths = [paths];
        }

        const subscriptionId = this.generateId();
        
        paths.forEach(path => {
            if (!this.subscribers[path]) {
                this.subscribers[path] = {};
            }
            this.subscribers[path][subscriptionId] = callback;
        });

        // Return unsubscribe function
        return () => {
            paths.forEach(path => {
                if (this.subscribers[path]) {
                    delete this.subscribers[path][subscriptionId];
                    if (Object.keys(this.subscribers[path]).length === 0) {
                        delete this.subscribers[path];
                    }
                }
            });
        };
    }

    /**
     * Set state value
     * @param {string} path - State path
     * @param {*} value - New value
     * @param {boolean} silent - Whether to skip notifications
     */
    setState(path, value, silent = false) {
        const oldValue = this.getState(path);
        
        // Set the value
        this.setNestedValue(this.state, path, value);
        
        // Add to history
        this.addToHistory(path, oldValue, value);
        
        // Notify subscribers
        if (!silent) {
            this.notifySubscribers(path, value, oldValue);
        }
    }

    /**
     * Get state value
     * @param {string} path - State path
     * @returns {*} State value
     */
    getState(path) {
        if (!path) return this.state;
        return this.getNestedValue(this.state, path);
    }

    /**
     * Update state by merging with existing value
     * @param {string} path - State path
     * @param {object} updates - Updates to merge
     */
    updateState(path, updates) {
        const currentValue = this.getState(path);
        const newValue = { ...currentValue, ...updates };
        this.setState(path, newValue);
    }

    /**
     * Clear state
     * @param {string} path - State path to clear
     */
    clearState(path) {
        if (path) {
            this.setState(path, null);
        } else {
            // Reset entire state
            this.state = this.getInitialState();
            this.notifyAllSubscribers();
        }
    }

    /**
     * Get nested value from object
     * @param {object} obj - Object to search
     * @param {string} path - Dot-separated path
     * @returns {*} Value at path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Set nested value in object
     * @param {object} obj - Object to modify
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Notify subscribers of state changes
     * @param {string} path - State path that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    notifySubscribers(path, newValue, oldValue) {
        // Notify exact path subscribers
        if (this.subscribers[path]) {
            Object.values(this.subscribers[path]).forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        }

        // Notify parent path subscribers
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.subscribers[parentPath]) {
                const parentValue = this.getState(parentPath);
                Object.values(this.subscribers[parentPath]).forEach(callback => {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (error) {
                        console.error('Error in state subscriber:', error);
                    }
                });
            }
        }
    }

    /**
     * Notify all subscribers
     */
    notifyAllSubscribers() {
        Object.keys(this.subscribers).forEach(path => {
            const value = this.getState(path);
            Object.values(this.subscribers[path]).forEach(callback => {
                try {
                    callback(value, undefined, path);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        });
    }

    /**
     * Add change to history
     * @param {string} path - State path
     * @param {*} oldValue - Old value
     * @param {*} newValue - New value
     */
    addToHistory(path, oldValue, newValue) {
        const change = {
            timestamp: Date.now(),
            path,
            oldValue,
            newValue
        };

        this.history.push(change);
        
        // Trim history if too long
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Get state change history
     * @param {string} path - Optional path filter
     * @returns {Array} History entries
     */
    getHistory(path) {
        if (path) {
            return this.history.filter(entry => entry.path === path);
        }
        return [...this.history];
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get initial state
     * @returns {object} Initial state
     */
    getInitialState() {
        return {
            user: null,
            isAuthenticated: false,
            skills: [],
            skillCategories: [],
            currentAssessment: null,
            userProgress: {},
            achievements: [],
            notifications: [],
            ui: {
                currentPage: 'index',
                loading: false,
                modals: {},
                theme: 'light'
            }
        };
    }

    // ============================================
    // CONVENIENCE METHODS FOR COMMON OPERATIONS
    // ============================================

    /**
     * Set user data
     * @param {object} user - User object
     */
    setUser(user) {
        this.setState('user', user);
        this.setState('isAuthenticated', !!user);
    }

    /**
     * Get current user
     * @returns {object|null} Current user
     */
    getUser() {
        return this.getState('user');
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.getState('isAuthenticated');
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this.setState('ui.loading', loading);
    }

    /**
     * Add notification
     * @param {object} notification - Notification object
     */
    addNotification(notification) {
        const notifications = this.getState('notifications') || [];
        const newNotification = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...notification
        };
        notifications.push(newNotification);
        this.setState('notifications', notifications);
    }

    /**
     * Remove notification
     * @param {string} id - Notification ID
     */
    removeNotification(id) {
        const notifications = this.getState('notifications') || [];
        const filtered = notifications.filter(n => n.id !== id);
        this.setState('notifications', filtered);
    }

    /**
     * Set current page
     * @param {string} page - Page name
     */
    setCurrentPage(page) {
        this.setState('ui.currentPage', page);
    }

    /**
     * Open modal
     * @param {string} modalId - Modal ID
     * @param {object} data - Modal data
     */
    openModal(modalId, data = {}) {
        this.setState(`ui.modals.${modalId}`, { open: true, data });
    }

    /**
     * Close modal
     * @param {string} modalId - Modal ID
     */
    closeModal(modalId) {
        this.setState(`ui.modals.${modalId}`, { open: false, data: {} });
    }

    /**
     * Set skills data
     * @param {Array} skills - Skills array
     */
    setSkills(skills) {
        this.setState('skills', skills);
    }

    /**
     * Set skill categories
     * @param {Array} categories - Categories array
     */
    setSkillCategories(categories) {
        this.setState('skillCategories', categories);
    }

    /**
     * Set current assessment
     * @param {object} assessment - Assessment object
     */
    setCurrentAssessment(assessment) {
        this.setState('currentAssessment', assessment);
    }

    /**
     * Update user progress for a skill
     * @param {number} skillId - Skill ID
     * @param {object} progress - Progress data
     */
    updateUserProgress(skillId, progress) {
        const currentProgress = this.getState('userProgress') || {};
        currentProgress[skillId] = progress;
        this.setState('userProgress', currentProgress);
    }

    /**
     * Set user achievements
     * @param {Array} achievements - Achievements array
     */
    setAchievements(achievements) {
        this.setState('achievements', achievements);
    }

    /**
     * Add new achievement
     * @param {object} achievement - Achievement object
     */
    addAchievement(achievement) {
        const achievements = this.getState('achievements') || [];
        achievements.push(achievement);
        this.setState('achievements', achievements);
        
        // Also add notification
        this.addNotification({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            message: achievement.name,
            data: achievement
        });
    }

    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
        this.setState('ui.theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Debug: Log current state
     */
    debug() {
        console.log('Current State:', this.state);
        console.log('Subscribers:', this.subscribers);
        console.log('History:', this.history);
    }
}

// Create and export singleton instance
const stateManager = new StateManager();
export default stateManager;
