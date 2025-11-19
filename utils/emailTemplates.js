const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { DEFAULTS, BUTTON_TEXT, URL_PATHS } = require('./emailConstants');
const config = require('../config');

/**
 * Consistent time formatting helper
 * Converts slot-based time (0 = 00:00 UTC) to readable 12-hour format
 */
function formatTimeFromSlot(slot) {
    const hour = Math.floor(slot / 4);
    const minute = (slot % 4) * 15;
    
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

/**
 * Build business context object from settings
 * Centralizes the business settings mapping with fallbacks
 * @param {Object} businessSettings - Business settings from database
 * @returns {Object} Standardized business context for templates
 */
function buildBusinessContext(businessSettings) {
    return {
        name: businessSettings.company_name || DEFAULTS.BUSINESS_NAME,
        contact_email: businessSettings.contact_email || config.email.user,
        phone_number: businessSettings.phone_number || DEFAULTS.PLACEHOLDER_EMPTY,
        logo_url: businessSettings.logo_url || DEFAULTS.PLACEHOLDER_EMPTY,
        website: businessSettings.base_url || DEFAULTS.PLACEHOLDER_URL,
        support_email: businessSettings.contact_email || config.email.user,
        purchase_url: businessSettings.base_url ? `${businessSettings.base_url}${URL_PATHS.CREDITS}` : DEFAULTS.PLACEHOLDER_URL
    };
}

// Template cache and initialization state
const templateCache = new Map();
let handlebarsInitialized = false;

/**
 * Initialize Handlebars with partials and helpers
 */
async function initializeHandlebars() {
    if (handlebarsInitialized) {
        return;
    }

    try {
        // Register partials
        const partialsDir = path.join(__dirname, '..', 'email-templates', 'partials');
        const partialFiles = await fs.readdir(partialsDir);
        
        for (const file of partialFiles) {
            if (file.endsWith('.html')) {
                const partialName = path.basename(file, '.html');
                const partialPath = path.join(partialsDir, file);
                const partialContent = await fs.readFile(partialPath, 'utf8');
                handlebars.registerPartial(partialName, partialContent);
            }
        }

        // Register custom helpers
        handlebars.registerHelper('formatCurrency', function(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        });

        handlebars.registerHelper('formatDate', function(dateString) {
            if (!dateString) return DEFAULTS.DATE_NOT_SPECIFIED;
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        });

        // Note: Time formatting is handled in JavaScript via formatTimeFromSlot()
        // before passing data to templates, so no formatTime helper is needed here

        handlebarsInitialized = true;
        logger.email('Handlebars initialized successfully with partials and helpers');
    } catch (error) {
        logger.email('Failed to initialize Handlebars:', error);
        throw error;
    }
}

/**
 * Load and compile a template from the templates directory
 */
async function loadTemplate(templateName, templateFile = 'template.html') {
    // Ensure Handlebars is initialized
    await initializeHandlebars();

    const cacheKey = `${templateName}:${templateFile}`;
    
    // Return cached template if available
    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    try {
        const templatePath = path.join(__dirname, '..', 'email-templates', templateName, templateFile);
        const templateContent = await fs.readFile(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(templateContent);
        
        // Cache the compiled template
        templateCache.set(cacheKey, compiledTemplate);
        return compiledTemplate;
    } catch (error) {
        logger.email(`Failed to load template ${templateName}/${templateFile}:`, error);
        throw error;
    }
}

/**
 * Load content template (from database or filesystem)
 */
async function loadContentTemplate(templateName) {
    // Ensure Handlebars is initialized
    await initializeHandlebars();

    const cacheKey = `content:${templateName}`;
    
    // Return cached template if available
    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    try {
        // First try to load from database
        const { EmailTemplate } = require('../models/EmailTemplate');
        const dbTemplate = await EmailTemplate.findByKey(templateName);
        
        if (dbTemplate && dbTemplate.content) {
            const compiledTemplate = handlebars.compile(dbTemplate.content);
            templateCache.set(cacheKey, compiledTemplate);
            return compiledTemplate;
        }
        
        // Fallback to filesystem
        const templatePath = path.join(__dirname, '..', 'email-templates', 'contents', `${templateName}.html`);
        const templateContent = await fs.readFile(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(templateContent);
        
        // Cache the compiled template
        templateCache.set(cacheKey, compiledTemplate);
        return compiledTemplate;
    } catch (error) {
        logger.email(`Failed to load content template ${templateName}:`, error);
        throw error;
    }
}

/**
 * Load base template and render with content
 */
async function loadBaseTemplate(contentTemplate, templateData) {
    // Ensure Handlebars is initialized
    await initializeHandlebars();

    const cacheKey = 'base:email-layout';
    
    let baseTemplate;
    if (templateCache.has(cacheKey)) {
        baseTemplate = templateCache.get(cacheKey);
    } else {
        const basePath = path.join(__dirname, '..', 'email-templates', 'base', 'email-layout.html');
        const baseContent = await fs.readFile(basePath, 'utf8');
        baseTemplate = handlebars.compile(baseContent);
        templateCache.set(cacheKey, baseTemplate);
    }

    // Render content with data
    const renderedContent = contentTemplate(templateData);
    
    // Render base template with content
    return baseTemplate({
        ...templateData,
        content: renderedContent
    });
}

/**
 * Get template subject from database with fallback
 */
async function getTemplateSubject(templateKey, defaultSubject) {
    try {
        const { EmailTemplate } = require('../models/EmailTemplate');
        const template = await EmailTemplate.findByKey(templateKey);
        
        if (template && template.subject) {
            return template.subject;
        }
        
        return defaultSubject;
    } catch (error) {
        logger.email(`Failed to get template subject for ${templateKey}:`, error);
        return defaultSubject;
    }
}

/**
 * Generate purchase confirmation HTML
 */
async function generatePurchaseConfirmationHTML(user, planDetails, transactionDetails, businessSettings) {
    // Load the content template
    const contentTemplate = await loadContentTemplate('purchase-confirmation');
    
    const templateData = {
        user: {
            name: user.name,
            email: user.email
        },
        plan: {
            name: planDetails.name,
            price: planDetails.price,
            credits_30min: planDetails.credits_30min,
            credits_60min: planDetails.credits_60min,
            description: planDetails.description
        },
        transaction: {
            id: transactionDetails.id,
            amount: transactionDetails.amount,
            date: new Date().toLocaleDateString(),
            paymentMethod: transactionDetails.paymentMethod || DEFAULTS.PAYMENT_METHOD_CARD
        },
        business: buildBusinessContext(businessSettings),
        headerTitle: 'Purchase Confirmed',
        headerSubtitle: 'Your lesson credits are ready to use'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Generate low balance warning HTML
 */
async function generateLowBalanceHTML(user, creditsRemaining, businessSettings) {
    // Load the content template
    const contentTemplate = await loadContentTemplate('low-balance-warning');
    
    const templateData = {
        user: {
            name: user.name,
            email: user.email
        },
        credits: {
            remaining_30min: creditsRemaining.credits_30min || 0,
            remaining_60min: creditsRemaining.credits_60min || 0,
            total: (creditsRemaining.credits_30min || 0) + (creditsRemaining.credits_60min || 0)
        },
        business: buildBusinessContext(businessSettings),
        headerTitle: 'Low Credit Balance',
        headerSubtitle: 'Time to restock your lesson credits'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Generate credits exhausted HTML
 */
async function generateCreditsExhaustedHTML(user, totalLessonsCompleted, businessSettings) {
    // Load the content template
    const contentTemplate = await loadContentTemplate('credits-exhausted');
    
    const templateData = {
        user: {
            name: user.name,
            email: user.email
        },
        stats: {
            totalLessonsCompleted: totalLessonsCompleted || 0
        },
        business: buildBusinessContext(businessSettings),
        headerTitle: 'Credits Exhausted',
        headerSubtitle: 'Purchase more credits to continue booking lessons'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Generate booking confirmation HTML
 */
async function generateBookingConfirmationHTML(booking, paymentMethod, businessSettings) {
    // Load the content template
    const contentTemplate = await loadContentTemplate('booking-confirmation');
    
    const business = buildBusinessContext(businessSettings);
    
    const templateData = {
        student: {
            name: booking.student?.name || booking.Student?.name || DEFAULTS.USER_LABEL_STUDENT,
            email: booking.student?.email || booking.Student?.email
        },
        instructor: {
            name: booking.Instructor?.User?.name || booking.instructor?.name || DEFAULTS.USER_LABEL_INSTRUCTOR,
            email: booking.Instructor?.User?.email || booking.instructor?.email
        },
        booking: {
            id: booking.id,
            date: booking.date,
            startTime: formatTimeFromSlot(booking.start_slot),
            endTime: formatTimeFromSlot(booking.start_slot + booking.duration),
            duration: booking.duration * 15, // Convert slots to minutes
            paymentMethod: paymentMethod === 'credits' ? DEFAULTS.PAYMENT_METHOD_CREDITS : DEFAULTS.PAYMENT_METHOD_CARD
        },
        business,
        buttons: {
            primary: {
                url: businessSettings.base_url ? `${businessSettings.base_url}${URL_PATHS.BOOKINGS}` : DEFAULTS.PLACEHOLDER_URL,
                text: BUTTON_TEXT.VIEW_BOOKINGS,
                style: 'primary'
            },
            secondary: {
                url: business.phone_number ? `tel:${business.phone_number}` : DEFAULTS.PLACEHOLDER_URL,
                text: business.phone_number ? `${BUTTON_TEXT.CALL_PREFIX}${business.phone_number}` : BUTTON_TEXT.CONTACT_SUPPORT,
                style: 'secondary'
            }
        },
        headerTitle: 'Booking Confirmed',
        headerSubtitle: 'Your lesson has been scheduled'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Generate rescheduling confirmation HTML
 */
async function generateReschedulingHTML(oldBooking, newBooking, recipientType, businessSettings) {
    // Load the content template based on recipient type
    const templateKey = recipientType === 'student' ? 'rescheduling-student' : 'rescheduling-instructor';
    const contentTemplate = await loadContentTemplate(templateKey);
    
    const business = buildBusinessContext(businessSettings);
    
    const templateData = {
        student: {
            name: newBooking.student?.name || newBooking.Student?.name || DEFAULTS.USER_LABEL_STUDENT,
            email: newBooking.student?.email || newBooking.Student?.email
        },
        instructor: {
            name: newBooking.Instructor?.User?.name || newBooking.instructor?.name || DEFAULTS.USER_LABEL_INSTRUCTOR,
            email: newBooking.Instructor?.User?.email || newBooking.instructor?.email
        },
        oldBooking: {
            id: oldBooking.id,
            date: oldBooking.date,
            startTime: formatTimeFromSlot(oldBooking.start_slot),
            endTime: formatTimeFromSlot(oldBooking.start_slot + oldBooking.duration),
            duration: oldBooking.duration * 15
        },
        newBooking: {
            id: newBooking.id,
            date: newBooking.date,
            startTime: formatTimeFromSlot(newBooking.start_slot),
            endTime: formatTimeFromSlot(newBooking.start_slot + newBooking.duration),
            duration: newBooking.duration * 15
        },
        business,
        buttons: {
            primary: {
                url: businessSettings.base_url ? `${businessSettings.base_url}${URL_PATHS.BOOKINGS}` : DEFAULTS.PLACEHOLDER_URL,
                text: BUTTON_TEXT.MANAGE_LESSONS,
                style: 'primary'
            },
            secondary: {
                url: business.phone_number ? `tel:${business.phone_number}` : DEFAULTS.PLACEHOLDER_URL,
                text: business.phone_number ? `${BUTTON_TEXT.CALL_PREFIX}${business.phone_number}` : BUTTON_TEXT.CONTACT_SUPPORT,
                style: 'secondary'
            }
        },
        headerTitle: 'Lesson Rescheduled',
        headerSubtitle: 'Your booking has been updated'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Generate absence notification HTML
 */
async function generateAbsenceNotificationHTML(booking, attendanceNotes, businessSettings) {
    // Load the content template
    const contentTemplate = await loadContentTemplate('absence-notification');
    
    const business = buildBusinessContext(businessSettings);
    
    const templateData = {
        student: {
            name: booking.student?.name || booking.Student?.name || DEFAULTS.USER_LABEL_STUDENT,
            email: booking.student?.email || booking.Student?.email
        },
        instructor: {
            name: booking.Instructor?.User?.name || booking.instructor?.name || DEFAULTS.USER_LABEL_INSTRUCTOR,
            email: booking.Instructor?.User?.email || booking.instructor?.email
        },
        booking: {
            id: booking.id,
            date: booking.date,
            startTime: formatTimeFromSlot(booking.start_slot),
            endTime: formatTimeFromSlot(booking.start_slot + booking.duration),
            duration: booking.duration * 15
        },
        attendance: {
            notes: attendanceNotes || 'No additional notes provided.'
        },
        business,
        buttons: {
            primary: {
                url: businessSettings.base_url ? `${businessSettings.base_url}${URL_PATHS.BOOKING}` : DEFAULTS.PLACEHOLDER_URL,
                text: BUTTON_TEXT.BOOK_NEW_LESSON,
                style: 'primary'
            },
            secondary: {
                url: business.contact_email ? `mailto:${business.contact_email}` : DEFAULTS.PLACEHOLDER_URL,
                text: BUTTON_TEXT.CONTACT_SUPPORT,
                style: 'secondary'
            }
        },
        headerTitle: 'Lesson Absence Noted',
        headerSubtitle: 'Book your next session when ready'
    };
    
    return await loadBaseTemplate(contentTemplate, templateData);
}

/**
 * Clear template cache (useful for when templates are updated)
 */
function clearTemplateCache() {
    templateCache.clear();
    logger.email('Template cache cleared');
}

/**
 * Clear specific template from cache
 */
function clearTemplateFromCache(templateKey) {
    const keysToRemove = [];
    for (const [key] of templateCache) {
        if (key.includes(templateKey)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => {
        templateCache.delete(key);
    });

    logger.email(`Template cache cleared for key: ${templateKey}`);
}

module.exports = {
    // Template loading functions
    loadTemplate,
    loadContentTemplate,
    loadBaseTemplate,
    getTemplateSubject,
    
    // HTML generation functions
    generatePurchaseConfirmationHTML,
    generateLowBalanceHTML,
    generateCreditsExhaustedHTML,
    generateBookingConfirmationHTML,
    generateReschedulingHTML,
    generateAbsenceNotificationHTML,
    
    // Cache management
    clearTemplateCache,
    clearTemplateFromCache,
    
    // Initialization
    initializeHandlebars
};
