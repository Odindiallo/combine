/**
 * Notification System
 * Manages toast notifications, alerts, and user feedback
 */

export class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.defaultConfig = {
            duration: 5000,
            position: 'top-right',
            maxNotifications: 5,
            showProgress: true,
            allowDuplicates: false
        };
        
        this.init();
    }

    /**
     * Initialize the notification system
     */
    init() {
        this.createContainer();
        this.setupEventListeners();
    }

    /**
     * Create the notification container
     */
    createContainer() {
        // Check if container already exists
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Listen for global notification events
        window.addEventListener('show-notification', (event) => {
            this.show(event.detail);
        });

        window.addEventListener('hide-notification', (event) => {
            if (event.detail.id) {
                this.hide(event.detail.id);
            }
        });
    }

    /**
     * Show a notification
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    show(options = {}) {
        const config = { ...this.defaultConfig, ...options };
        const id = this.generateId();

        // Check for duplicates if not allowed
        if (!config.allowDuplicates && this.isDuplicate(config.message)) {
            return null;
        }

        // Remove oldest notification if at max capacity
        if (this.notifications.size >= config.maxNotifications) {
            this.removeOldest();
        }

        const notification = this.createNotification(id, config);
        this.notifications.set(id, {
            element: notification,
            config: config,
            createdAt: Date.now()
        });

        this.container.appendChild(notification);
        
        // Trigger enter animation
        requestAnimationFrame(() => {
            notification.classList.add('toast-enter');
        });

        // Auto-hide if duration is set
        if (config.duration > 0) {
            this.scheduleHide(id, config.duration);
        }

        // Dispatch show event
        this.dispatchEvent('notification:show', { id, config });

        return id;
    }

    /**
     * Create notification element
     * @param {string} id - Notification ID
     * @param {Object} config - Notification configuration
     * @returns {HTMLElement} Notification element
     */
    createNotification(id, config) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${config.type || 'info'}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('data-notification-id', id);

        // Create notification content
        const content = document.createElement('div');
        content.className = 'toast-content';

        // Add icon based on type
        const icon = this.getIcon(config.type);
        if (icon) {
            const iconEl = document.createElement('div');
            iconEl.className = 'toast-icon';
            iconEl.innerHTML = icon;
            content.appendChild(iconEl);
        }

        // Add message
        const message = document.createElement('div');
        message.className = 'toast-message';
        message.textContent = config.message || 'Notification';
        content.appendChild(message);

        // Add title if provided
        if (config.title) {
            const title = document.createElement('div');
            title.className = 'toast-title';
            title.textContent = config.title;
            content.insertBefore(title, message);
        }

        toast.appendChild(content);

        // Add actions if provided
        if (config.actions && config.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'toast-actions';
            
            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'toast-action';
                button.textContent = action.text;
                button.addEventListener('click', () => {
                    if (action.action) {
                        if (typeof action.action === 'function') {
                            action.action(id);
                        } else if (action.action === 'retry') {
                            this.dispatchEvent('notification:retry', { id, config });
                        }
                    }
                    this.hide(id);
                });
                actions.appendChild(button);
            });
            
            toast.appendChild(actions);
        }

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => this.hide(id));
        toast.appendChild(closeBtn);

        // Add progress bar if enabled
        if (config.showProgress && config.duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'toast-progress';
            progress.style.animationDuration = `${config.duration}ms`;
            toast.appendChild(progress);
        }

        return toast;
    }

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || null;
    }

    /**
     * Hide a notification
     * @param {string} id - Notification ID
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const element = notification.element;
        
        // Add exit animation
        element.classList.add('toast-exit');
        
        // Remove after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
            this.dispatchEvent('notification:hide', { id });
        }, 300); // Match CSS animation duration
    }

    /**
     * Schedule automatic hiding of notification
     * @param {string} id - Notification ID
     * @param {number} duration - Duration in milliseconds
     */
    scheduleHide(id, duration) {
        setTimeout(() => {
            this.hide(id);
        }, duration);
    }

    /**
     * Remove the oldest notification
     */
    removeOldest() {
        let oldestId = null;
        let oldestTime = Infinity;

        for (const [id, notification] of this.notifications) {
            if (notification.createdAt < oldestTime) {
                oldestTime = notification.createdAt;
                oldestId = id;
            }
        }

        if (oldestId) {
            this.hide(oldestId);
        }
    }

    /**
     * Check if notification is duplicate
     * @param {string} message - Message to check
     * @returns {boolean} True if duplicate exists
     */
    isDuplicate(message) {
        for (const notification of this.notifications.values()) {
            if (notification.config.message === message) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all notifications
     */
    clear() {
        for (const id of this.notifications.keys()) {
            this.hide(id);
        }
    }

    /**
     * Get notification count
     * @returns {number} Number of active notifications
     */
    getCount() {
        return this.notifications.size;
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, manager: this },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    // Convenience methods for different notification types

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    success(message, options = {}) {
        return this.show({
            type: 'success',
            message,
            duration: 3000,
            ...options
        });
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    error(message, options = {}) {
        return this.show({
            type: 'error',
            message,
            duration: 6000,
            ...options
        });
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    warning(message, options = {}) {
        return this.show({
            type: 'warning',
            message,
            duration: 5000,
            ...options
        });
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    info(message, options = {}) {
        return this.show({
            type: 'info',
            message,
            duration: 4000,
            ...options
        });
    }
}

// Create and export singleton instance
export const notifications = new NotificationManager();

// Export convenience functions
export const showNotification = (options) => notifications.show(options);
export const hideNotification = (id) => notifications.hide(id);
export const clearNotifications = () => notifications.clear();
