/**
 * Global Error Handler Utility
 * Provides centralized error handling, logging, and user-friendly error messages
 */

export class ErrorHandler {
    constructor() {
        this.errorTypes = {
            NETWORK: 'network',
            AUTH: 'authentication', 
            VALIDATION: 'validation',
            SERVER: 'server',
            CLIENT: 'client'
        };

        this.setupGlobalHandlers();
    }

    /**
     * Set up global error handlers for unhandled errors
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError(event.reason, { type: this.errorTypes.CLIENT });
            event.preventDefault();
        });

        // Handle general JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError(event.error, { 
                type: this.errorTypes.CLIENT,
                source: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });
    }

    /**
     * Handle and categorize errors
     * @param {Error|string} error - The error to handle
     * @param {Object} context - Additional context about the error
     * @returns {Object} Processed error information
     */
    handleError(error, context = {}) {
        const errorInfo = this.processError(error, context);
        this.logError(errorInfo.original, errorInfo);
        
        // Show user-friendly message
        this.showUserMessage(errorInfo);
        
        return errorInfo;
    }

    /**
     * Process and categorize error
     * @param {Error|string} error - The error to process
     * @param {Object} context - Additional context
     * @returns {Object} Processed error information
     */
    processError(error, context = {}) {
        const errorInfo = {
            original: error,
            message: this.getErrorMessage(error),
            type: this.getErrorType(error, context),
            timestamp: new Date().toISOString(),
            context: context,
            userMessage: '',
            shouldRetry: false
        };

        // Determine user-friendly message based on error type
        switch (errorInfo.type) {
            case this.errorTypes.NETWORK:
                errorInfo.userMessage = 'Connection problem. Please check your internet and try again.';
                errorInfo.shouldRetry = true;
                break;
            case this.errorTypes.AUTH:
                errorInfo.userMessage = 'Authentication required. Please log in again.';
                errorInfo.shouldRetry = false;
                break;
            case this.errorTypes.VALIDATION:
                errorInfo.userMessage = errorInfo.message || 'Please check your input and try again.';
                errorInfo.shouldRetry = false;
                break;
            case this.errorTypes.SERVER:
                errorInfo.userMessage = 'Server error. Please try again in a moment.';
                errorInfo.shouldRetry = true;
                break;
            default:
                errorInfo.userMessage = 'Something went wrong. Please try again.';
                errorInfo.shouldRetry = true;
        }

        return errorInfo;
    }

    /**
     * Get error message from various error types
     * @param {Error|string|Object} error - The error
     * @returns {string} Error message
     */
    getErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.error?.message) return error.error.message;
        if (error?.details) return error.details;
        return 'An unknown error occurred';
    }

    /**
     * Determine error type from error object
     * @param {Error|Object} error - The error
     * @param {Object} context - Additional context
     * @returns {string} Error type
     */
    getErrorType(error, context = {}) {
        // Check context first
        if (context.type) return context.type;

        // Check error properties
        if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
            return this.errorTypes.NETWORK;
        }

        // Check HTTP status codes
        if (error?.status || error?.statusCode) {
            const status = error.status || error.statusCode;
            if (status === 401 || status === 403) return this.errorTypes.AUTH;
            if (status >= 400 && status < 500) return this.errorTypes.VALIDATION;
            if (status >= 500) return this.errorTypes.SERVER;
        }

        // Check error messages for patterns
        const message = this.getErrorMessage(error).toLowerCase();
        if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
            return this.errorTypes.NETWORK;
        }
        if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('authentication')) {
            return this.errorTypes.AUTH;
        }
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return this.errorTypes.VALIDATION;
        }

        return this.errorTypes.CLIENT;
    }

    /**
     * Log error to console and potentially to external service
     * @param {Error} error - The original error
     * @param {Object} errorInfo - Processed error information
     */
    logError(error, errorInfo) {
        // Console logging with appropriate level
        const logLevel = errorInfo.type === this.errorTypes.CLIENT ? 'error' : 'warn';
        console[logLevel]('Error handled:', {
            type: errorInfo.type,
            message: errorInfo.message,
            timestamp: errorInfo.timestamp,
            context: errorInfo.context,
            original: error
        });

        // In production, you might want to send to external logging service
        // this.sendToLoggingService(errorInfo);
    }

    /**
     * Show user-friendly error message
     * @param {Object} errorInfo - Processed error information
     */
    showUserMessage(errorInfo) {
        // Dispatch custom event for notification system to handle
        window.dispatchEvent(new CustomEvent('show-notification', {
            detail: {
                type: 'error',
                message: errorInfo.userMessage,
                duration: errorInfo.shouldRetry ? 5000 : 3000,
                actions: errorInfo.shouldRetry ? [{ text: 'Retry', action: 'retry' }] : []
            }
        }));
    }

    /**
     * Create a retry-enabled error handler
     * @param {Function} operation - The operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Delay between retries in ms
     * @returns {Function} Wrapped operation with retry logic
     */
    withRetry(operation, maxRetries = 3, delay = 1000) {
        return async (...args) => {
            let lastError;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    return await operation(...args);
                } catch (error) {
                    lastError = error;
                    const errorInfo = this.processError(error);
                    
                    // Don't retry on certain error types
                    if (!errorInfo.shouldRetry || attempt === maxRetries) {
                        throw error;
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
                }
            }
            
            throw lastError;
        };
    }

    /**
     * Wrap async operations with error handling
     * @param {Promise} promise - The promise to wrap
     * @param {Object} context - Additional context
     * @returns {Promise} Wrapped promise
     */
    async wrapAsync(promise, context = {}) {
        try {
            return await promise;
        } catch (error) {
            this.handleError(error, context);
            throw error;
        }
    }

    /**
     * Create an error boundary for components
     * @param {Function} component - Component function
     * @param {Function} fallback - Fallback render function
     * @returns {Function} Protected component
     */
    createErrorBoundary(component, fallback) {
        return (...args) => {
            try {
                return component(...args);
            } catch (error) {
                this.handleError(error, { context: 'component_render' });
                return fallback ? fallback(error) : null;
            }
        };
    }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

// Export utility functions
export const handleError = (error, context) => errorHandler.handleError(error, context);
export const withRetry = (operation, maxRetries, delay) => errorHandler.withRetry(operation, maxRetries, delay);
export const wrapAsync = (promise, context) => errorHandler.wrapAsync(promise, context);
