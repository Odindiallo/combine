/**
 * Loading Component for SkillForge
 * Provides various loading indicators and overlays
 */
class LoadingSpinner {
    constructor() {
        this.activeSpinners = new Set();
        this.loadingQueue = [];
    }

    /**
     * Show loading spinner in a container
     * @param {HTMLElement|string} container - Container element or selector
     * @param {object} options - Configuration options
     * @returns {string} Spinner ID for removal
     */
    show(container, options = {}) {
        const element = typeof container === 'string' 
            ? document.querySelector(container)
            : container;

        if (!element) {
            console.warn('Loading container not found:', container);
            return null;
        }

        const config = {
            size: 'medium', // small, medium, large
            type: 'spinner', // spinner, dots, pulse, skeleton
            text: null,
            overlay: false,
            color: 'primary',
            ...options
        };

        const spinnerId = this.generateId();
        const spinnerElement = this.createSpinner(config, spinnerId);

        // Add to container
        if (config.overlay) {
            element.style.position = 'relative';
            spinnerElement.classList.add('loading-overlay');
        }

        element.appendChild(spinnerElement);
        this.activeSpinners.add(spinnerId);

        return spinnerId;
    }

    /**
     * Hide loading spinner
     * @param {string} spinnerId - Spinner ID returned from show()
     */
    hide(spinnerId) {
        if (!spinnerId || !this.activeSpinners.has(spinnerId)) {
            return;
        }

        const spinner = document.querySelector(`[data-spinner-id="${spinnerId}"]`);
        if (spinner) {
            spinner.remove();
        }

        this.activeSpinners.delete(spinnerId);
    }

    /**
     * Hide loading spinner from container
     * @param {HTMLElement|string} container - Container element or selector
     */
    hideInContainer(container) {
        const element = typeof container === 'string' 
            ? document.querySelector(container)
            : container;

        if (!element) return;

        const spinners = element.querySelectorAll('[data-spinner-id]');
        spinners.forEach(spinner => {
            const spinnerId = spinner.getAttribute('data-spinner-id');
            this.activeSpinners.delete(spinnerId);
            spinner.remove();
        });
    }

    /**
     * Show global loading overlay
     * @param {object} options - Configuration options
     * @returns {string} Spinner ID
     */
    showGlobal(options = {}) {
        const config = {
            text: 'Loading...',
            backdrop: true,
            zIndex: 9999,
            ...options
        };

        return this.show(document.body, {
            ...config,
            overlay: true,
            type: 'spinner'
        });
    }

    /**
     * Hide global loading overlay
     * @param {string} spinnerId - Spinner ID
     */
    hideGlobal(spinnerId) {
        this.hide(spinnerId);
    }

    /**
     * Create spinner element
     * @param {object} config - Spinner configuration
     * @param {string} spinnerId - Spinner ID
     * @returns {HTMLElement} Spinner element
     */
    createSpinner(config, spinnerId) {
        const wrapper = document.createElement('div');
        wrapper.className = `loading-wrapper loading-${config.size}`;
        wrapper.setAttribute('data-spinner-id', spinnerId);
        wrapper.setAttribute('role', 'status');
        wrapper.setAttribute('aria-label', config.text || 'Loading');

        let spinnerHTML = '';
        
        switch (config.type) {
            case 'dots':
                spinnerHTML = this.createDotsSpinner(config);
                break;
            case 'pulse':
                spinnerHTML = this.createPulseSpinner(config);
                break;
            case 'skeleton':
                spinnerHTML = this.createSkeletonLoader(config);
                break;
            default:
                spinnerHTML = this.createRotatingSpinner(config);
        }

        wrapper.innerHTML = `
            <div class="loading-content">
                ${spinnerHTML}
                ${config.text ? `<div class="loading-text">${config.text}</div>` : ''}
            </div>
        `;

        return wrapper;
    }

    /**
     * Create rotating spinner
     * @param {object} config - Configuration
     * @returns {string} HTML string
     */
    createRotatingSpinner(config) {
        const sizeClass = `spinner-${config.size}`;
        const colorClass = `spinner-${config.color}`;
        
        return `
            <div class="loading-spinner ${sizeClass} ${colorClass}">
                <svg viewBox="0 0 50 50" class="spinner-svg">
                    <circle 
                        cx="25" 
                        cy="25" 
                        r="20" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="4" 
                        stroke-linecap="round"
                        stroke-dasharray="31.416" 
                        stroke-dashoffset="31.416"
                        class="spinner-circle"
                    />
                </svg>
            </div>
        `;
    }

    /**
     * Create dots spinner
     * @param {object} config - Configuration
     * @returns {string} HTML string
     */
    createDotsSpinner(config) {
        const sizeClass = `dots-${config.size}`;
        const colorClass = `dots-${config.color}`;
        
        return `
            <div class="loading-dots ${sizeClass} ${colorClass}">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
    }

    /**
     * Create pulse spinner
     * @param {object} config - Configuration
     * @returns {string} HTML string
     */
    createPulseSpinner(config) {
        const sizeClass = `pulse-${config.size}`;
        const colorClass = `pulse-${config.color}`;
        
        return `
            <div class="loading-pulse ${sizeClass} ${colorClass}">
                <div class="pulse-ring"></div>
                <div class="pulse-ring"></div>
                <div class="pulse-ring"></div>
            </div>
        `;
    }

    /**
     * Create skeleton loader
     * @param {object} config - Configuration
     * @returns {string} HTML string
     */
    createSkeletonLoader(config) {
        const lines = config.lines || 3;
        let skeletonHTML = '';
        
        for (let i = 0; i < lines; i++) {
            const width = i === lines - 1 ? '60%' : '100%';
            skeletonHTML += `<div class="skeleton-line" style="width: ${width}"></div>`;
        }
        
        return `
            <div class="loading-skeleton">
                ${skeletonHTML}
            </div>
        `;
    }

    /**
     * Show loading for async operation
     * @param {HTMLElement|string} container - Container for loading
     * @param {Promise} promise - Promise to wait for
     * @param {object} options - Loading options
     * @returns {Promise} Original promise result
     */
    async showFor(container, promise, options = {}) {
        const spinnerId = this.show(container, options);
        
        try {
            const result = await promise;
            return result;
        } finally {
            this.hide(spinnerId);
        }
    }

    /**
     * Show loading with automatic timeout
     * @param {HTMLElement|string} container - Container for loading
     * @param {number} timeout - Timeout in milliseconds
     * @param {object} options - Loading options
     * @returns {string} Spinner ID
     */
    showWithTimeout(container, timeout, options = {}) {
        const spinnerId = this.show(container, options);
        
        setTimeout(() => {
            this.hide(spinnerId);
        }, timeout);
        
        return spinnerId;
    }

    /**
     * Add loading state to button
     * @param {HTMLElement|string} button - Button element or selector
     * @param {object} options - Configuration options
     * @returns {Function} Function to restore button
     */
    loadingButton(button, options = {}) {
        const element = typeof button === 'string' 
            ? document.querySelector(button)
            : button;

        if (!element) {
            console.warn('Button not found:', button);
            return () => {};
        }

        const config = {
            text: 'Loading...',
            disabled: true,
            ...options
        };

        // Store original state
        const originalText = element.textContent;
        const originalDisabled = element.disabled;
        const originalHTML = element.innerHTML;

        // Apply loading state
        element.disabled = config.disabled;
        element.classList.add('loading');
        
        if (config.text) {
            element.innerHTML = `
                <span class="loading-spinner small">
                    <svg viewBox="0 0 50 50" class="spinner-svg">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" 
                                stroke-width="4" stroke-linecap="round"
                                stroke-dasharray="31.416" stroke-dashoffset="31.416"
                                class="spinner-circle"/>
                    </svg>
                </span>
                <span>${config.text}</span>
            `;
        }

        // Return restore function
        return () => {
            element.disabled = originalDisabled;
            element.classList.remove('loading');
            element.innerHTML = originalHTML;
        };
    }

    /**
     * Show progress bar
     * @param {HTMLElement|string} container - Container element
     * @param {number} progress - Progress percentage (0-100)
     * @param {object} options - Configuration options
     * @returns {object} Progress bar controller
     */
    showProgress(container, progress = 0, options = {}) {
        const element = typeof container === 'string' 
            ? document.querySelector(container)
            : container;

        if (!element) {
            console.warn('Container not found:', container);
            return null;
        }

        const config = {
            height: '4px',
            color: 'primary',
            animated: true,
            showText: false,
            ...options
        };

        const progressId = this.generateId();
        const progressHTML = `
            <div class="loading-progress" data-progress-id="${progressId}">
                <div class="progress-bar" style="height: ${config.height}">
                    <div class="progress-fill progress-${config.color} ${config.animated ? 'animated' : ''}" 
                         style="width: ${progress}%"></div>
                </div>
                ${config.showText ? `<div class="progress-text">${Math.round(progress)}%</div>` : ''}
            </div>
        `;

        element.insertAdjacentHTML('beforeend', progressHTML);

        // Return controller
        return {
            update: (newProgress) => {
                const progressEl = element.querySelector(`[data-progress-id="${progressId}"]`);
                if (progressEl) {
                    const fill = progressEl.querySelector('.progress-fill');
                    const text = progressEl.querySelector('.progress-text');
                    
                    fill.style.width = `${newProgress}%`;
                    if (text) {
                        text.textContent = `${Math.round(newProgress)}%`;
                    }
                }
            },
            remove: () => {
                const progressEl = element.querySelector(`[data-progress-id="${progressId}"]`);
                if (progressEl) {
                    progressEl.remove();
                }
            }
        };
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'loading_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Clear all active spinners
     */
    clearAll() {
        this.activeSpinners.forEach(spinnerId => {
            this.hide(spinnerId);
        });
        this.activeSpinners.clear();
    }

    /**
     * Get active spinner count
     * @returns {number} Number of active spinners
     */
    getActiveCount() {
        return this.activeSpinners.size;
    }
}

// Create and export singleton instance
const loadingSpinner = new LoadingSpinner();
export default loadingSpinner;
