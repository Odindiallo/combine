/**
 * Modal Component
 * Manages modal dialogs with accessibility and event handling
 */

export class Modal {
    constructor(element) {
        this.element = typeof element === 'string' ? document.getElementById(element) : element;
        this.isOpen = false;
        this.focusableElements = [];
        this.previousFocus = null;
        
        this.init();
    }

    /**
     * Initialize the modal with event listeners and accessibility
     */
    init() {
        if (!this.element) return;

        // Add modal attributes for accessibility
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('tabindex', '-1');

        // Find modal content and close buttons
        this.content = this.element.querySelector('.modal-content');
        this.closeButtons = this.element.querySelectorAll('.modal-close, [data-modal-close]');

        // Set up event listeners
        this.setupEventListeners();
        
        // Set initial state
        this.element.style.display = 'none';
        this.element.setAttribute('aria-hidden', 'true');
    }

    /**
     * Set up all event listeners for the modal
     */
    setupEventListeners() {
        // Close button clicks
        this.closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
            });
        });

        // Background click to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Trap focus within modal
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isOpen) {
                this.handleTabKey(e);
            }
        });
    }

    /**
     * Open the modal
     * @param {Object} options - Options for opening the modal
     */
    open(options = {}) {
        if (this.isOpen) return;

        this.isOpen = true;
        this.previousFocus = document.activeElement;

        // Show modal
        this.element.style.display = 'flex';
        this.element.setAttribute('aria-hidden', 'false');

        // Animate in
        requestAnimationFrame(() => {
            this.element.classList.add('modal-open');
        });

        // Set focus and manage focusable elements
        this.updateFocusableElements();
        this.setInitialFocus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Dispatch open event
        this.dispatchEvent('modal:open', options);
    }

    /**
     * Close the modal
     * @param {Object} options - Options for closing the modal
     */
    close(options = {}) {
        if (!this.isOpen) return;

        this.isOpen = false;

        // Animate out
        this.element.classList.remove('modal-open');

        // Wait for animation to complete
        setTimeout(() => {
            this.element.style.display = 'none';
            this.element.setAttribute('aria-hidden', 'true');
        }, 300); // Match CSS transition duration

        // Restore body scroll
        document.body.style.overflow = '';

        // Restore focus
        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }

        // Dispatch close event
        this.dispatchEvent('modal:close', options);
    }

    /**
     * Toggle modal open/close state
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Update the list of focusable elements
     */
    updateFocusableElements() {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        this.focusableElements = Array.from(
            this.element.querySelectorAll(focusableSelectors.join(', '))
        ).filter(el => {
            return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hidden;
        });
    }

    /**
     * Set initial focus within the modal
     */
    setInitialFocus() {
        if (this.focusableElements.length === 0) {
            this.element.focus();
            return;
        }

        // Look for autofocus element first
        const autofocusElement = this.element.querySelector('[autofocus]');
        if (autofocusElement && this.focusableElements.includes(autofocusElement)) {
            autofocusElement.focus();
            return;
        }

        // Focus first focusable element
        this.focusableElements[0].focus();
    }

    /**
     * Handle Tab key for focus trapping
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleTabKey(e) {
        if (this.focusableElements.length === 0) return;

        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Set the modal content
     * @param {string|HTMLElement} content - The content to set
     */
    setContent(content) {
        if (!this.content) return;

        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.content.innerHTML = '';
            this.content.appendChild(content);
        }

        // Update focusable elements after content change
        if (this.isOpen) {
            this.updateFocusableElements();
        }
    }

    /**
     * Set the modal title
     * @param {string} title - The title to set
     */
    setTitle(title) {
        const titleElement = this.element.querySelector('.modal-title, .modal-header h1, .modal-header h2');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Dispatch a custom event
     * @param {string} eventName - The event name
     * @param {Object} detail - Event detail data
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { modal: this, ...detail },
            bubbles: true
        });
        this.element.dispatchEvent(event);
    }

    /**
     * Destroy the modal and clean up event listeners
     */
    destroy() {
        if (this.isOpen) {
            this.close();
        }

        // Remove event listeners would require storing references
        // For now, just remove the element
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

/**
 * Modal Manager - manages multiple modals
 */
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
    }

    /**
     * Register a modal
     * @param {string} id - Modal ID
     * @param {Modal|string} modal - Modal instance or element selector
     */
    register(id, modal) {
        if (typeof modal === 'string') {
            modal = new Modal(modal);
        }
        
        this.modals.set(id, modal);

        // Listen for modal events
        modal.element.addEventListener('modal:open', () => {
            this.activeModal = modal;
        });

        modal.element.addEventListener('modal:close', () => {
            if (this.activeModal === modal) {
                this.activeModal = null;
            }
        });
    }

    /**
     * Open a modal by ID
     * @param {string} id - Modal ID
     * @param {Object} options - Options for opening
     */
    open(id, options = {}) {
        const modal = this.modals.get(id);
        if (modal) {
            // Close any other open modal first
            if (this.activeModal && this.activeModal !== modal) {
                this.activeModal.close();
            }
            modal.open(options);
        }
    }

    /**
     * Close a modal by ID
     * @param {string} id - Modal ID
     * @param {Object} options - Options for closing
     */
    close(id, options = {}) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.close(options);
        }
    }

    /**
     * Close the currently active modal
     */
    closeActive() {
        if (this.activeModal) {
            this.activeModal.close();
        }
    }

    /**
     * Get a modal by ID
     * @param {string} id - Modal ID
     * @returns {Modal|undefined} The modal instance
     */
    get(id) {
        return this.modals.get(id);
    }

    /**
     * Check if any modal is currently open
     * @returns {boolean} True if a modal is open
     */
    hasOpenModal() {
        return this.activeModal !== null;
    }
}

// Create and export singleton instance
export const modalManager = new ModalManager();

// Utility functions
export const openModal = (id, options) => modalManager.open(id, options);
export const closeModal = (id, options) => modalManager.close(id, options);
export const registerModal = (id, modal) => modalManager.register(id, modal);
