/**
 * Form Validation Utility
 * Provides comprehensive form validation with real-time feedback
 */

export class Validator {
    constructor() {
        this.rules = new Map();
        this.messages = new Map();
        this.setupDefaultRules();
        this.setupDefaultMessages();
    }

    /**
     * Set up default validation rules
     */
    setupDefaultRules() {
        this.addRule('required', (value) => {
            return value !== null && value !== undefined && String(value).trim() !== '';
        });

        this.addRule('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !value || emailRegex.test(value);
        });

        this.addRule('minLength', (value, params) => {
            const minLength = parseInt(params);
            return !value || String(value).length >= minLength;
        });

        this.addRule('maxLength', (value, params) => {
            const maxLength = parseInt(params);
            return !value || String(value).length <= maxLength;
        });

        this.addRule('min', (value, params) => {
            const min = parseFloat(params);
            return !value || parseFloat(value) >= min;
        });

        this.addRule('max', (value, params) => {
            const max = parseFloat(params);
            return !value || parseFloat(value) <= max;
        });

        this.addRule('pattern', (value, params) => {
            const regex = new RegExp(params);
            return !value || regex.test(value);
        });

        this.addRule('match', (value, params, allValues) => {
            return !value || value === allValues[params];
        });

        this.addRule('password', (value) => {
            // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            return !value || passwordRegex.test(value);
        });

        this.addRule('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return !value;
            }
        });

        this.addRule('number', (value) => {
            return !value || !isNaN(value) && !isNaN(parseFloat(value));
        });

        this.addRule('integer', (value) => {
            return !value || (Number.isInteger(parseFloat(value)) && !isNaN(value));
        });
    }

    /**
     * Set up default error messages
     */
    setupDefaultMessages() {
        this.setMessage('required', 'This field is required');
        this.setMessage('email', 'Please enter a valid email address');
        this.setMessage('minLength', 'Must be at least {0} characters long');
        this.setMessage('maxLength', 'Must be no more than {0} characters long');
        this.setMessage('min', 'Must be at least {0}');
        this.setMessage('max', 'Must be no more than {0}');
        this.setMessage('pattern', 'Please enter a valid format');
        this.setMessage('match', 'Fields do not match');
        this.setMessage('password', 'Password must be at least 8 characters with uppercase, lowercase, and number');
        this.setMessage('url', 'Please enter a valid URL');
        this.setMessage('number', 'Please enter a valid number');
        this.setMessage('integer', 'Please enter a valid integer');
    }

    /**
     * Add a custom validation rule
     * @param {string} name - Rule name
     * @param {Function} validator - Validation function
     */
    addRule(name, validator) {
        this.rules.set(name, validator);
    }

    /**
     * Set error message for a rule
     * @param {string} rule - Rule name
     * @param {string} message - Error message template
     */
    setMessage(rule, message) {
        this.messages.set(rule, message);
    }

    /**
     * Validate a single value
     * @param {any} value - Value to validate
     * @param {Object} rules - Validation rules
     * @param {Object} allValues - All form values (for match validation)
     * @returns {Array} Array of error messages
     */
    validateValue(value, rules = {}, allValues = {}) {
        const errors = [];

        for (const [ruleName, ruleParams] of Object.entries(rules)) {
            const rule = this.rules.get(ruleName);
            
            if (!rule) {
                console.warn(`Validation rule '${ruleName}' not found`);
                continue;
            }

            const isValid = rule(value, ruleParams, allValues);
            
            if (!isValid) {
                const message = this.getErrorMessage(ruleName, ruleParams);
                errors.push(message);
            }
        }

        return errors;
    }

    /**
     * Validate an entire form
     * @param {Object} values - Form values
     * @param {Object} schema - Validation schema
     * @returns {Object} Validation result
     */
    validateForm(values, schema) {
        const errors = {};
        let isValid = true;

        for (const [fieldName, fieldRules] of Object.entries(schema)) {
            const fieldValue = values[fieldName];
            const fieldErrors = this.validateValue(fieldValue, fieldRules, values);
            
            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
                isValid = false;
            }
        }

        return {
            isValid,
            errors,
            firstError: isValid ? null : this.getFirstError(errors)
        };
    }

    /**
     * Get formatted error message
     * @param {string} rule - Rule name
     * @param {any} params - Rule parameters
     * @returns {string} Formatted error message
     */
    getErrorMessage(rule, params) {
        const template = this.messages.get(rule) || 'Invalid value';
        
        if (typeof params === 'string' || typeof params === 'number') {
            return template.replace('{0}', params);
        }
        
        return template;
    }

    /**
     * Get first error from validation result
     * @param {Object} errors - Errors object
     * @returns {Object} First error with field and message
     */
    getFirstError(errors) {
        for (const [field, messages] of Object.entries(errors)) {
            if (messages && messages.length > 0) {
                return { field, message: messages[0] };
            }
        }
        return null;
    }
}

/**
 * Form Validator Class - manages form validation with UI integration
 */
export class FormValidator {
    constructor(form, schema, options = {}) {
        this.form = typeof form === 'string' ? document.querySelector(form) : form;
        this.schema = schema;
        this.validator = new Validator();
        this.options = {
            validateOnInput: true,
            validateOnBlur: true,
            showErrorsInline: true,
            errorClass: 'field-error',
            errorMessageClass: 'error-message',
            ...options
        };

        this.fields = new Map();
        this.errors = {};
        
        this.init();
    }

    /**
     * Initialize form validation
     */
    init() {
        if (!this.form) return;

        this.setupFields();
        this.setupEventListeners();
    }

    /**
     * Set up form fields
     */
    setupFields() {
        for (const fieldName of Object.keys(this.schema)) {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.fields.set(fieldName, field);
                this.setupFieldValidation(fieldName, field);
            }
        }
    }

    /**
     * Set up validation for a specific field
     * @param {string} fieldName - Field name
     * @param {HTMLElement} field - Field element
     */
    setupFieldValidation(fieldName, field) {
        // Add ARIA attributes
        field.setAttribute('aria-describedby', `${fieldName}-error`);

        if (this.options.validateOnInput) {
            field.addEventListener('input', () => {
                this.validateField(fieldName);
            });
        }

        if (this.options.validateOnBlur) {
            field.addEventListener('blur', () => {
                this.validateField(fieldName);
            });
        }
    }

    /**
     * Set up form event listeners
     */
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            const isValid = this.validateAll();
            if (!isValid) {
                e.preventDefault();
                this.focusFirstError();
            }
        });
    }

    /**
     * Validate a specific field
     * @param {string} fieldName - Field name
     * @returns {boolean} Whether the field is valid
     */
    validateField(fieldName) {
        const field = this.fields.get(fieldName);
        const rules = this.schema[fieldName];
        
        if (!field || !rules) return true;

        const value = this.getFieldValue(field);
        const allValues = this.getFormValues();
        const errors = this.validator.validateValue(value, rules, allValues);

        if (errors.length > 0) {
            this.errors[fieldName] = errors;
            this.showFieldError(fieldName, errors[0]);
            return false;
        } else {
            delete this.errors[fieldName];
            this.clearFieldError(fieldName);
            return true;
        }
    }

    /**
     * Validate all form fields
     * @returns {boolean} Whether the entire form is valid
     */
    validateAll() {
        const values = this.getFormValues();
        const result = this.validator.validateForm(values, this.schema);
        
        this.errors = result.errors;
        
        // Update UI for all fields
        this.clearAllErrors();
        for (const [fieldName, errors] of Object.entries(result.errors)) {
            this.showFieldError(fieldName, errors[0]);
        }

        return result.isValid;
    }

    /**
     * Get value from form field
     * @param {HTMLElement} field - Form field element
     * @returns {any} Field value
     */
    getFieldValue(field) {
        switch (field.type) {
            case 'checkbox':
                return field.checked;
            case 'radio':
                const radioGroup = this.form.querySelectorAll(`[name="${field.name}"]`);
                for (const radio of radioGroup) {
                    if (radio.checked) return radio.value;
                }
                return null;
            case 'select-multiple':
                return Array.from(field.selectedOptions).map(option => option.value);
            default:
                return field.value;
        }
    }

    /**
     * Get all form values
     * @returns {Object} Form values
     */
    getFormValues() {
        const values = {};
        for (const [fieldName, field] of this.fields) {
            values[fieldName] = this.getFieldValue(field);
        }
        return values;
    }

    /**
     * Show error for a specific field
     * @param {string} fieldName - Field name
     * @param {string} message - Error message
     */
    showFieldError(fieldName, message) {
        const field = this.fields.get(fieldName);
        if (!field || !this.options.showErrorsInline) return;

        // Add error class to field
        field.classList.add(this.options.errorClass);
        field.setAttribute('aria-invalid', 'true');

        // Create or update error message element
        let errorElement = document.getElementById(`${fieldName}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldName}-error`;
            errorElement.className = this.options.errorMessageClass;
            errorElement.setAttribute('role', 'alert');
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /**
     * Clear error for a specific field
     * @param {string} fieldName - Field name
     */
    clearFieldError(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return;

        // Remove error class from field
        field.classList.remove(this.options.errorClass);
        field.setAttribute('aria-invalid', 'false');

        // Hide error message
        const errorElement = document.getElementById(`${fieldName}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Clear all field errors
     */
    clearAllErrors() {
        for (const fieldName of this.fields.keys()) {
            this.clearFieldError(fieldName);
        }
    }

    /**
     * Focus the first field with an error
     */
    focusFirstError() {
        for (const fieldName of Object.keys(this.errors)) {
            const field = this.fields.get(fieldName);
            if (field) {
                field.focus();
                break;
            }
        }
    }

    /**
     * Get current validation state
     * @returns {Object} Current validation state
     */
    getValidationState() {
        return {
            isValid: Object.keys(this.errors).length === 0,
            errors: { ...this.errors },
            fields: Array.from(this.fields.keys())
        };
    }

    /**
     * Add custom validation rule
     * @param {string} name - Rule name
     * @param {Function} validator - Validation function
     */
    addRule(name, validator) {
        this.validator.addRule(name, validator);
    }

    /**
     * Set custom error message
     * @param {string} rule - Rule name
     * @param {string} message - Error message
     */
    setMessage(rule, message) {
        this.validator.setMessage(rule, message);
    }
}

// Export validator instance
export const validator = new Validator();

// Utility functions
export const validateValue = (value, rules, allValues) => validator.validateValue(value, rules, allValues);
export const validateForm = (values, schema) => validator.validateForm(values, schema);
