// Contact page functionality

let emailJsReady = false;

const CONTACT_SUBJECT_LABELS = {
    general: 'General Inquiry',
    order: 'Order Support',
    returns: 'Returns & Exchanges',
    sizing: 'Sizing Help',
    collaboration: 'Brand Collaboration',
    press: 'Press & Media',
    other: 'Other'
};

function getContactSubjectLabel(subjectValue) {
    const key = String(subjectValue || '').trim().toLowerCase();
    return CONTACT_SUBJECT_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'General Inquiry');
}

function getEmailJsConfig() {
    const cfg = window.UT_EMAILJS_CONFIG || {};

    return {
        publicKey: String(cfg.publicKey || '').trim(),
        serviceId: String(cfg.serviceId || '').trim(),
        templateId: String(cfg.templateId || '').trim(),
        toEmail: String(cfg.toEmail || 'support@urbanthreads.com').trim()
    };
}

function initEmailJs() {
    if (emailJsReady) return true;

    const { publicKey } = getEmailJsConfig();
    const hasValidKey = publicKey && !publicKey.startsWith('YOUR_');

    if (!hasValidKey || !window.emailjs) {
        return false;
    }

    window.emailjs.init({ publicKey });
    emailJsReady = true;
    return true;
}

async function sendContactEmail(data) {
    const config = getEmailJsConfig();
    const hasConfig =
        config.publicKey && !config.publicKey.startsWith('YOUR_') &&
        config.serviceId && !config.serviceId.startsWith('YOUR_') &&
        config.templateId && !config.templateId.startsWith('YOUR_');

    if (!hasConfig || !window.emailjs || !initEmailJs()) {
        throw new Error('Email service is not configured yet. Please set your EmailJS keys in contact.html.');
    }

    const templateParams = {
        brand_name: 'URBAN THREADS',
        from_name: data.name,
        from_email: data.email,
        subject: data.subjectLabel || getContactSubjectLabel(data.subject),
        subject_value: data.subject,
        message: data.message,
        message_preview: String(data.message || '').trim().slice(0, 180),
        submitted_at: data.submittedAt,
        website_url: window.location.origin || 'https://urbanthreads.com',
        support_email: config.toEmail,
        reply_to: data.email,
        to_email: config.toEmail,
        theme_primary: '#1a1a1a',
        theme_accent: '#C9A96E',
        theme_bg: '#F5F0E8'
    };

    await window.emailjs.send(config.serviceId, config.templateId, templateParams);
}

// Initialize contact page
function initContact() {
    initEmailJs();
    initContactForm();
}

// Initialize contact form
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', handleContactSubmit);
    
    // Form validation
    const inputs = contactForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// Handle contact form submission
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const subjectLabel = getContactSubjectLabel(data.subject);
    const payload = {
        ...data,
        subjectLabel,
        submittedAt: new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Kolkata'
        })
    };
    
    // Validate form
    if (!validateContactForm(payload)) {
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
        await sendContactEmail(payload);

        // Reset form
        e.target.reset();

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Show success message
        showMessage('Thank you! Your message has been sent successfully. We\'ll get back to you shortly.', 'success');

        // Optional: Auto-scroll to top to show message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        showMessage(error.message || 'Unable to send message right now. Please try again.', 'error');
    }
}

// Validate contact form
function validateContactForm(data) {
    let isValid = true;
    const errors = {};
    
    // Name validation
    if (!data.name || data.name.trim().length < 2) {
        errors.name = 'Please enter your full name (at least 2 characters)';
        isValid = false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
    }
    
    // Subject validation
    if (!data.subject) {
        errors.subject = 'Please select a subject';
        isValid = false;
    }
    
    // Message validation
    if (!data.message || data.message.trim().length < 10) {
        errors.message = 'Please enter a message (at least 10 characters)';
        isValid = false;
    }
    
    // Display errors
    Object.keys(errors).forEach(field => {
        displayFieldError(field, errors[field]);
    });
    
    return isValid;
}

// Validate individual field
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    let error = '';
    
    switch(field.name) {
        case 'name':
            if (!value || value.length < 2) {
                error = 'Please enter your full name (at least 2 characters)';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value || !emailRegex.test(value)) {
                error = 'Please enter a valid email address';
            }
            break;
            
        case 'subject':
            if (!value) {
                error = 'Please select a subject';
            }
            break;
            
        case 'message':
            if (!value || value.length < 10) {
                error = 'Please enter a message (at least 10 characters)';
            }
            break;
    }
    
    if (error) {
        displayFieldError(field.name, error);
    } else {
        clearFieldError(field);
    }
}

// Display field error
function displayFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    // Remove existing error
    const existingError = formGroup.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error class
    field.classList.add('error');
    
    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    `;
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert error after field
    formGroup.appendChild(errorEl);
}

// Clear field error
function clearFieldError(e) {
    const field = e.target || e;
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    // Remove error class
    field.classList.remove('error');
    
    // Remove error message
    const errorEl = formGroup.querySelector('.field-error');
    if (errorEl) {
        errorEl.remove();
    }
}

// Character counter for message field
function initCharacterCounter() {
    const messageField = document.getElementById('message');
    if (!messageField) return;
    
    const maxLength = 500;
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.style.cssText = `
        text-align: right;
        font-size: 0.875rem;
        color: #666;
        margin-top: 0.25rem;
    `;
    
    const updateCounter = () => {
        const remaining = maxLength - messageField.value.length;
        counter.textContent = `${remaining} characters remaining`;
        counter.style.color = remaining < 50 ? '#dc3545' : '#666';
    };
    
    messageField.addEventListener('input', updateCounter);
    messageField.setAttribute('maxlength', maxLength);
    messageField.parentNode.appendChild(counter);
    
    updateCounter();
}

// Initialize FAQ functionality if on contact page
function initContactFAQ() {
    // FAQ functionality is already initialized in main.js
    // This could be extended for contact-specific FAQ features
}

// Add CSS for form validation
const contactStyle = document.createElement('style');
contactStyle.textContent = `
    .form-group input.error,
    .form-group select.error,
    .form-group textarea.error {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
    }
    
    .field-error {
        animation: slideInDown 0.3s ease;
    }
    
    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(contactStyle);

// Initialize contact page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('contact.html')) {
        initContact();
        initCharacterCounter();
        initContactFAQ();
    }
});