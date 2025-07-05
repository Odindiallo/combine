/**
 * Client-side Router for SkillForge
 * Handles navigation between pages with support for authentication guards
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.guards = [];
        this.currentRoute = null;
        this.history = [];
        this.basePath = '';
        
        // Initialize router
        this.init();
    }

    /**
     * Initialize router
     */
    init() {
        // Listen for browser navigation
        window.addEventListener('popstate', (event) => {
            this.handleNavigation(window.location.pathname, false);
        });

        // Handle initial page load
        this.handleNavigation(window.location.pathname, false);
    }

    /**
     * Register a route
     * @param {string} path - Route path
     * @param {object} config - Route configuration
     */
    route(path, config) {
        this.routes.set(path, {
            path,
            component: config.component,
            title: config.title,
            requiresAuth: config.requiresAuth || false,
            meta: config.meta || {},
            beforeEnter: config.beforeEnter,
            afterEnter: config.afterEnter
        });
    }

    /**
     * Add navigation guard
     * @param {Function} guard - Guard function
     */
    addGuard(guard) {
        this.guards.push(guard);
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {boolean} pushState - Whether to push to browser history
     * @param {object} data - Optional data to pass to route
     */
    async navigate(path, pushState = true, data = {}) {
        try {
            await this.handleNavigation(path, pushState, data);
        } catch (error) {
            console.error('Navigation error:', error);
            this.handleNavigationError(error);
        }
    }

    /**
     * Handle navigation logic
     * @param {string} path - Route path
     * @param {boolean} pushState - Whether to push to browser history
     * @param {object} data - Optional data to pass to route
     */
    async handleNavigation(path, pushState = true, data = {}) {
        // Clean path
        path = this.cleanPath(path);
        
        // Find matching route
        const route = this.findRoute(path);
        if (!route) {
            throw new Error(`Route not found: ${path}`);
        }

        // Run guards
        const guardResult = await this.runGuards(route, data);
        if (guardResult !== true) {
            if (typeof guardResult === 'string') {
                // Redirect to different route
                return this.navigate(guardResult, pushState, data);
            }
            return; // Navigation blocked
        }

        // Run beforeEnter hook
        if (route.beforeEnter) {
            const result = await route.beforeEnter(route, data);
            if (result === false) {
                return; // Navigation blocked
            }
        }

        // Update browser history
        if (pushState && path !== window.location.pathname) {
            window.history.pushState({ path, data }, route.title, path);
        }

        // Update current route
        const previousRoute = this.currentRoute;
        this.currentRoute = { ...route, data, params: this.extractParams(path, route.path) };

        // Add to history
        this.addToHistory(this.currentRoute);

        // Update page title
        if (route.title) {
            document.title = `${route.title} - SkillForge`;
        }

        // Load the component/page
        await this.loadRoute(this.currentRoute, previousRoute);

        // Run afterEnter hook
        if (route.afterEnter) {
            await route.afterEnter(this.currentRoute, previousRoute);
        }

        // Emit navigation event
        this.emit('navigationComplete', {
            route: this.currentRoute,
            previousRoute
        });
    }

    /**
     * Find matching route
     * @param {string} path - Path to match
     * @returns {object|null} Matching route
     */
    findRoute(path) {
        // First try exact match
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }

        // Try pattern matching for routes with parameters
        for (const [routePath, route] of this.routes) {
            if (this.matchPath(path, routePath)) {
                return route;
            }
        }

        return null;
    }

    /**
     * Match path against route pattern
     * @param {string} path - Actual path
     * @param {string} pattern - Route pattern
     * @returns {boolean} Whether path matches pattern
     */
    matchPath(path, pattern) {
        const pathParts = path.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);

        if (pathParts.length !== patternParts.length) {
            return false;
        }

        return patternParts.every((part, index) => {
            return part.startsWith(':') || part === pathParts[index];
        });
    }

    /**
     * Extract parameters from path
     * @param {string} path - Actual path
     * @param {string} pattern - Route pattern
     * @returns {object} Extracted parameters
     */
    extractParams(path, pattern) {
        const pathParts = path.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);
        const params = {};

        patternParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.substring(1);
                params[paramName] = pathParts[index];
            }
        });

        return params;
    }

    /**
     * Run navigation guards
     * @param {object} route - Target route
     * @param {object} data - Navigation data
     * @returns {boolean|string} Guard result
     */
    async runGuards(route, data) {
        for (const guard of this.guards) {
            const result = await guard(route, this.currentRoute, data);
            if (result !== true) {
                return result;
            }
        }
        return true;
    }

    /**
     * Load route component
     * @param {object} route - Route to load
     * @param {object} previousRoute - Previous route
     */
    async loadRoute(route, previousRoute) {
        // Show loading if this is a page change
        if (!previousRoute || previousRoute.component !== route.component) {
            this.showLoading();
        }

        try {
            if (typeof route.component === 'function') {
                // Component is a function, call it
                await route.component(route, previousRoute);
            } else if (typeof route.component === 'string') {
                // Component is a page path, navigate to it
                await this.loadPage(route.component);
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load HTML page
     * @param {string} pageUrl - Page URL to load
     */
    async loadPage(pageUrl) {
        try {
            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.status}`);
            }

            const html = await response.text();
            
            // Parse the HTML to extract just the body content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const mainContent = doc.querySelector('main') || doc.body;

            // Replace current page content
            const currentMain = document.querySelector('main');
            if (currentMain && mainContent) {
                currentMain.innerHTML = mainContent.innerHTML;
                
                // Re-initialize any JavaScript for the new content
                this.initializePageScripts();
            }

        } catch (error) {
            console.error('Failed to load page:', error);
            throw error;
        }
    }

    /**
     * Initialize scripts for newly loaded content
     */
    initializePageScripts() {
        // Re-run any page-specific initialization
        const event = new CustomEvent('pageLoaded', {
            detail: { route: this.currentRoute }
        });
        document.dispatchEvent(event);
    }

    /**
     * Clean and normalize path
     * @param {string} path - Path to clean
     * @returns {string} Cleaned path
     */
    cleanPath(path) {
        // Remove base path if present
        if (this.basePath && path.startsWith(this.basePath)) {
            path = path.substring(this.basePath.length);
        }

        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Remove trailing slash (except for root)
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        return path;
    }

    /**
     * Add route to history
     * @param {object} route - Route object
     */
    addToHistory(route) {
        this.history.push({
            ...route,
            timestamp: Date.now()
        });

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }

    /**
     * Go forward in history
     */
    forward() {
        window.history.forward();
    }

    /**
     * Replace current route
     * @param {string} path - New path
     * @param {object} data - Optional data
     */
    replace(path, data = {}) {
        this.navigate(path, false, data);
        window.history.replaceState({ path, data }, '', path);
    }

    /**
     * Get current route
     * @returns {object|null} Current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Get route history
     * @returns {Array} Route history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        document.body.classList.add('loading');
        
        // Emit loading event
        this.emit('loadingStart');
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.body.classList.remove('loading');
        
        // Emit loading complete event
        this.emit('loadingEnd');
    }

    /**
     * Handle navigation errors
     * @param {Error} error - Navigation error
     */
    handleNavigationError(error) {
        console.error('Navigation error:', error);
        
        // Show error page or fallback
        this.emit('navigationError', error);
        
        // Try to navigate to error page
        const errorRoute = this.routes.get('/error');
        if (errorRoute) {
            this.navigate('/error', true, { error });
        }
    }

    /**
     * Event system
     */
    addEventListener(event, handler) {
        if (!this.eventHandlers) {
            this.eventHandlers = {};
        }
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    removeEventListener(event, handler) {
        if (this.eventHandlers && this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers && this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }
}

// Create and export router instance
const router = new Router();

// Setup default routes
router.route('/', {
    component: '/index.html',
    title: 'Home',
    requiresAuth: false
});

router.route('/dashboard', {
    component: '/dashboard.html',
    title: 'Dashboard',
    requiresAuth: true
});

router.route('/assessment', {
    component: '/assessment.html',
    title: 'Assessment',
    requiresAuth: true
});

router.route('/progress', {
    component: '/progress.html',
    title: 'Progress',
    requiresAuth: true
});

router.route('/achievements', {
    component: '/achievements.html',
    title: 'Achievements',
    requiresAuth: true
});

// Add authentication guard
router.addGuard(async (toRoute, fromRoute, data) => {
    if (toRoute.requiresAuth) {
        // Check if user is authenticated
        const token = localStorage.getItem('skillforge_token');
        if (!token) {
            // Redirect to login
            return '/';
        }
        
        // Could also verify token here
        // const isValid = await verifyToken();
        // if (!isValid) return '/';
    }
    return true;
});

export default router;
