/**
 * SkillForge Main Application Entry Point
 * Initializes the application and handles page routing
 */
import APIClient from './api-client.js';

class SkillForgeApp {
    constructor() {
        this.apiClient = new APIClient();
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthentication();
        this.showPage();
    }

    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        const token = localStorage.getItem('skillforge_token');
        if (token) {
            try {
                const response = await this.apiClient.verifyToken();
                if (response.success) {
                    this.currentUser = response.data.user;
                    this.redirectToDashboard();
                } else {
                    this.apiClient.setToken(null);
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                this.apiClient.setToken(null);
            }
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('registerBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('getStartedBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('learnMoreBtn').addEventListener('click', () => this.scrollToFeatures());

        // Modal event listeners
        this.setupModalEventListeners();

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Modal switching
        document.getElementById('switchToRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('loginModal');
            this.showRegisterModal();
        });

        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('registerModal');
            this.showLoginModal();
        });

        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    /**
     * Set up modal event listeners
     */
    setupModalEventListeners() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Close button
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => this.hideModal(modal.id));

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.forEach(modal => {
                    if (!modal.classList.contains('hidden')) {
                        this.hideModal(modal.id);
                    }
                });
            }
        });
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        this.showModal('loginModal');
        document.getElementById('loginEmail').focus();
    }

    /**
     * Show register modal
     */
    showRegisterModal() {
        this.showModal('registerModal');
        document.getElementById('registerEmail').focus();
    }

    /**
     * Show modal
     * @param {string} modalId - Modal element ID
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide modal
     * @param {string} modalId - Modal element ID
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear form data
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    /**
     * Handle login form submission
     * @param {Event} e - Form submit event
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (!password) {
            this.showToast('Please enter your password', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiClient.login(email, password);
            
            if (response.success) {
                this.currentUser = response.data.user;
                this.showToast('Login successful! Redirecting...', 'success');
                this.hideModal('loginModal');
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1000);
            } else {
                this.showToast(response.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(this.getErrorMessage(error), 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle register form submission
     * @param {Event} e - Form submit event
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showToast('Password must be at least 8 characters with uppercase, lowercase, and number', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiClient.register(email, password);
            
            if (response.success) {
                this.currentUser = response.data.user;
                this.showToast('Registration successful! Welcome to SkillForge!', 'success');
                this.hideModal('registerModal');
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1000);
            } else {
                this.showToast(response.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(this.getErrorMessage(error), 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} Is valid password
     */
    validatePassword(password) {
        if (password.length < 8) return false;
        if (!/[a-z]/.test(password)) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        return true;
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        const errorMessages = {
            2000: 'Network connection failed. Please check your internet connection.',
            2001: 'Request timed out. Please try again.',
            1008: 'User not found. Please check your credentials.',
            1009: 'An account with this email already exists.',
            1010: 'Invalid email or password.',
            1005: 'Too many attempts. Please try again later.'
        };

        return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
    }

    /**
     * Show loading spinner
     * @param {boolean} show - Whether to show spinner
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Toast type (success, error, warning, info)
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);
    }

    /**
     * Scroll to features section
     */
    scrollToFeatures() {
        document.getElementById('features').scrollIntoView({
            behavior: 'smooth'
        });
    }

    /**
     * Show appropriate page based on authentication
     */
    showPage() {
        if (this.currentUser) {
            this.redirectToDashboard();
        }
        // Landing page is already shown by default
    }

    /**
     * Redirect to dashboard
     */
    redirectToDashboard() {
        window.location.href = '/dashboard.html';
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SkillForgeApp();
});