/**
 * Main Application Entry Point
 * Initializes and orchestrates all frontend modules
 */

import { apiClient } from './api-client.js';
import { stateManager } from './state-manager.js';
import { router } from './router.js';
import { errorHandler } from './utils/error-handler.js';
import { notifications } from './components/notifications.js';
import { modalManager, registerModal, Modal } from './components/modal.js';
import { LoadingManager } from './components/loading.js';
import { FormValidator } from './utils/validation.js';

/**
 * Main Application Class
 */
class SkillForgeApp {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.loadingManager = new LoadingManager();
        
        // Bind methods
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
        this.handleApiError = this.handleApiError.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing SkillForge application...');

            // Initialize core services
            this.setupErrorHandling();
            this.setupStateManagement();
            this.setupRouting();
            this.setupModals();
            this.setupAuthentication();
            
            // Initialize page-specific features
            await this.initializePage();

            this.isInitialized = true;
            console.log('SkillForge application initialized successfully');

            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('app:ready'));

        } catch (error) {
            console.error('Failed to initialize application:', error);
            errorHandler.handleError(error, { context: 'app_initialization' });
        }
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Listen for API errors
        window.addEventListener('api:error', this.handleApiError);

        // Listen for network status changes
        window.addEventListener('online', () => {
            notifications.success('Connection restored');
            stateManager.setState('app.isOnline', true);
        });

        window.addEventListener('offline', () => {
            notifications.warning('Connection lost. Some features may be unavailable.');
            stateManager.setState('app.isOnline', false);
        });

        // Set initial online status
        stateManager.setState('app.isOnline', navigator.onLine);
    }

    /**
     * Set up state management
     */
    setupStateManagement() {
        // Subscribe to authentication state changes
        stateManager.subscribe('auth.user', this.handleAuthStateChange);
        stateManager.subscribe('auth.isAuthenticated', (isAuthenticated) => {
            if (!isAuthenticated) {
                // Clear user-specific data on logout
                stateManager.setState('user', null);
                stateManager.setState('assessments', []);
                stateManager.setState('progress', {});
            }
        });

        // Initialize app state
        stateManager.setState('app', {
            isInitialized: false,
            isOnline: navigator.onLine,
            currentPage: this.getCurrentPage(),
            version: '1.0.0'
        });
    }

    /**
     * Set up client-side routing
     */
    setupRouting() {
        // Define routes with guards and data loading
        router.addRoute('/', {
            title: 'SkillForge - AI-Powered Skill Assessment',
            guard: () => !stateManager.getState('auth.isAuthenticated'),
            redirect: '/dashboard.html'
        });

        router.addRoute('/dashboard.html', {
            title: 'Dashboard - SkillForge',
            guard: () => stateManager.getState('auth.isAuthenticated'),
            redirect: '/',
            beforeEnter: () => this.loadDashboardData()
        });

        router.addRoute('/assessment.html', {
            title: 'Assessment - SkillForge',
            guard: () => stateManager.getState('auth.isAuthenticated'),
            redirect: '/',
            beforeEnter: () => this.loadAssessmentData()
        });

        router.addRoute('/progress.html', {
            title: 'Progress - SkillForge',
            guard: () => stateManager.getState('auth.isAuthenticated'),
            redirect: '/',
            beforeEnter: () => this.loadProgressData()
        });

        router.addRoute('/achievements.html', {
            title: 'Achievements - SkillForge',
            guard: () => stateManager.getState('auth.isAuthenticated'),
            redirect: '/',
            beforeEnter: () => this.loadAchievementsData()
        });

        // Initialize router
        router.init();
    }

    /**
     * Set up modal dialogs
     */
    setupModals() {
        // Register authentication modals
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');

        if (loginModal) {
            registerModal('login', new Modal(loginModal));
            this.setupLoginForm();
        }

        if (registerModal) {
            registerModal('register', new Modal(registerModal));
            this.setupRegisterForm();
        }

        // Set up modal triggers
        this.setupModalTriggers();
    }

    /**
     * Set up authentication system
     */
    setupAuthentication() {
        // Check for existing session on startup
        this.checkAuthStatus();

        // Set up auth event listeners
        window.addEventListener('auth:login', (event) => {
            const { user, token } = event.detail;
            this.handleSuccessfulLogin(user, token);
        });

        window.addEventListener('auth:logout', () => {
            this.handleLogout();
        });
    }

    /**
     * Initialize page-specific features based on current page
     */
    async initializePage() {
        const page = this.getCurrentPage();
        stateManager.setState('app.currentPage', page);

        switch (page) {
            case 'index':
                await this.initializeHomePage();
                break;
            case 'dashboard':
                await this.initializeDashboard();
                break;
            case 'assessment':
                await this.initializeAssessment();
                break;
            case 'progress':
                await this.initializeProgress();
                break;
            case 'achievements':
                await this.initializeAchievements();
                break;
        }
    }

    /**
     * Get current page from URL
     * @returns {string} Current page name
     */
    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('index.html')) return 'index';
        if (path.endsWith('dashboard.html')) return 'dashboard';
        if (path.endsWith('assessment.html')) return 'assessment';
        if (path.endsWith('progress.html')) return 'progress';
        if (path.endsWith('achievements.html')) return 'achievements';
        return 'unknown';
    }

    /**
     * Handle authentication state changes
     * @param {Object} user - User object
     */
    handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            // Update UI for authenticated user
            this.updateUserInterface(user);
        } else {
            // Handle unauthenticated state
            this.clearUserInterface();
        }
    }

    /**
     * Handle API errors globally
     * @param {CustomEvent} event - API error event
     */
    handleApiError(event) {
        const { error, context } = event.detail;
        
        // Handle specific error types
        if (error.status === 401) {
            // Unauthorized - redirect to login
            stateManager.setState('auth.isAuthenticated', false);
            stateManager.setState('auth.user', null);
            
            if (this.getCurrentPage() !== 'index') {
                router.navigate('/');
            }
        } else if (error.status >= 500) {
            // Server error
            notifications.error('Server error. Please try again later.');
        } else if (!navigator.onLine) {
            // Network error
            notifications.error('No internet connection. Please check your network.');
        }
    }

    /**
     * Set up login form
     */
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const validator = new FormValidator(loginForm, {
            email: { required: true, email: true },
            password: { required: true, minLength: 8 }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validator.validateAll()) return;

            const formData = new FormData(loginForm);
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            await this.handleLogin(credentials);
        });
    }

    /**
     * Set up register form
     */
    setupRegisterForm() {
        const registerForm = document.getElementById('registerForm');
        if (!registerForm) return;

        const validator = new FormValidator(registerForm, {
            email: { required: true, email: true },
            password: { required: true, password: true },
            confirmPassword: { required: true, match: 'password' }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validator.validateAll()) return;

            const formData = new FormData(registerForm);
            const userData = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            await this.handleRegister(userData);
        });
    }

    /**
     * Set up modal trigger buttons
     */
    setupModalTriggers() {
        // Login modal triggers
        const loginBtns = document.querySelectorAll('[data-modal="login"], #loginBtn');
        loginBtns.forEach(btn => {
            btn.addEventListener('click', () => modalManager.open('login'));
        });

        // Register modal triggers
        const registerBtns = document.querySelectorAll('[data-modal="register"], #registerBtn');
        registerBtns.forEach(btn => {
            btn.addEventListener('click', () => modalManager.open('register'));
        });

        // Modal switching
        const switchToRegister = document.getElementById('switchToRegister');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                modalManager.close('login');
                modalManager.open('register');
            });
        }

        const switchToLogin = document.getElementById('switchToLogin');
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                modalManager.close('register');
                modalManager.open('login');
            });
        }

    }

    /**
     * Handle login submission
     * @param {Object} credentials - Login credentials
     */
    async handleLogin(credentials) {
        try {
            this.loadingManager.show('Signing in...');
            
            const response = await apiClient.auth.login(credentials);
            
            if (response.success) {
                await this.handleSuccessfulLogin(response.user, response.token);
                modalManager.close('login');
                notifications.success(`Welcome back, ${response.user.email}!`);
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'login' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Handle registration submission
     * @param {Object} userData - Registration data
     */
    async handleRegister(userData) {
        try {
            this.loadingManager.show('Creating account...');
            
            const response = await apiClient.auth.register(userData);
            
            if (response.success) {
                await this.handleSuccessfulLogin(response.user, response.token);
                modalManager.close('register');
                notifications.success('Account created successfully! Welcome to SkillForge!');
            }
        } catch (error) {
            errorHandler.handleError(error, { context: 'register' });
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * Handle successful authentication
     * @param {Object} user - User object
     * @param {string} token - Auth token
     */
    async handleSuccessfulLogin(user, token) {
        // Store auth data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));

        // Update state
        stateManager.setState('auth.isAuthenticated', true);
        stateManager.setState('auth.user', user);
        stateManager.setState('auth.token', token);

        // Configure API client with token
        apiClient.setAuthToken(token);

        // Navigate to dashboard if on landing page
        if (this.getCurrentPage() === 'index') {
            router.navigate('/dashboard.html');
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await apiClient.auth.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            // Clear local auth data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');

            // Clear state
            stateManager.setState('auth.isAuthenticated', false);
            stateManager.setState('auth.user', null);
            stateManager.setState('auth.token', null);

            // Clear API client token
            apiClient.setAuthToken(null);

            // Navigate to home page
            router.navigate('/');
            
            notifications.info('You have been logged out');
        }
    }

    /**
     * Check authentication status on startup
     */
    async checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                apiClient.setAuthToken(token);

                // Verify token is still valid
                const response = await apiClient.auth.verify();
                
                if (response.valid) {
                    stateManager.setState('auth.isAuthenticated', true);
                    stateManager.setState('auth.user', user);
                    stateManager.setState('auth.token', token);
                } else {
                    // Token invalid, clear auth data
                    this.handleLogout();
                }
            } catch (error) {
                console.warn('Auth verification failed:', error);
                this.handleLogout();
            }
        }
    }

    /**
     * Update UI for authenticated user
     * @param {Object} user - User object
     */
    updateUserInterface(user) {
        // Update user email displays
        const userEmailElements = document.querySelectorAll('#userEmail, [data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });

        // Update user name displays
        const userNameElements = document.querySelectorAll('#userName, [data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = user.name || user.email.split('@')[0];
        });

        // Set up user menu
        this.setupUserMenu();
    }

    /**
     * Clear user interface
     */
    clearUserInterface() {
        // Reset user displays
        const userEmailElements = document.querySelectorAll('#userEmail, [data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = '';
        });

        const userNameElements = document.querySelectorAll('#userName, [data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = '';
        });
    }

    /**
     * Set up user menu dropdown
     */
    setupUserMenu() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', () => {
                userDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    // Page-specific initialization methods
    async initializeHomePage() {
        // Set up hero section interactions
        const getStartedBtn = document.getElementById('getStartedBtn');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                modalManager.open('register');
            });
        }

        const learnMoreBtn = document.getElementById('learnMoreBtn');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    async initializeDashboard() {
        // Load dashboard data will be implemented in page-specific files
        console.log('Dashboard initialized');
    }

    async initializeAssessment() {
        // Load assessment data will be implemented in page-specific files
        console.log('Assessment page initialized');
    }

    async initializeProgress() {
        // Load progress data will be implemented in page-specific files
        console.log('Progress page initialized');
    }

    async initializeAchievements() {
        // Load achievements data will be implemented in page-specific files
        console.log('Achievements page initialized');
    }

    // Data loading methods for route guards
    async loadDashboardData() {
        // This will be expanded in dashboard-specific implementation
        return true;
    }

    async loadAssessmentData() {
        // This will be expanded in assessment-specific implementation
        return true;
    }

    async loadProgressData() {
        // This will be expanded in progress-specific implementation
        return true;
    }

    async loadAchievementsData() {
        // This will be expanded in achievements-specific implementation
        return true;
    }
}

// Initialize application when DOM is ready
const app = new SkillForgeApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export app instance for debugging and testing
window.SkillForgeApp = app;
export default app;