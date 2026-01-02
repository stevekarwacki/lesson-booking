const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const AppSettings = sequelize.define('AppSettings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['business', 'theme', 'email', 'branding', 'lessons', 'storage']]
        }
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 100]
        }
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'app_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['category', 'key']
        }
    ]
});

// Static methods for easier CRUD operations
AppSettings.getSetting = async function(category, key) {
    const setting = await this.findOne({
        where: { category, key }
    });
    return setting ? setting.value : null;
};

AppSettings.setSetting = async function(category, key, value, updatedBy) {
    // Input sanitization
    const sanitizedValue = typeof value === 'string' ? value.trim() : value;
    
    const [setting, created] = await this.upsert({
        category,
        key,
        value: sanitizedValue,
        updated_by: updatedBy
    });
    
    return setting;
};

AppSettings.deleteSetting = async function(category, key) {
    const result = await this.destroy({
        where: { category, key }
    });
    return result > 0; // Returns true if a record was deleted
};

AppSettings.getSettingsByCategory = async function(category) {
    const settings = await this.findAll({
        where: { category },
        order: [['key', 'ASC']]
    });
    
    // Convert to key-value object
    const result = {};
    settings.forEach(setting => {
        result[setting.key] = setting.value;
    });
    
    return result;
};

AppSettings.setMultipleSettings = async function(category, keyValuePairs, updatedBy) {
    const transaction = await sequelize.transaction();
    
    try {
        const results = [];
        
        for (const [key, value] of Object.entries(keyValuePairs)) {
            const sanitizedValue = typeof value === 'string' ? value.trim() : value;
            
            const [setting] = await this.upsert({
                category,
                key,
                value: sanitizedValue,
                updated_by: updatedBy
            }, { transaction });
            
            results.push(setting);
        }
        
        await transaction.commit();
        return results;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// Validation helpers
AppSettings.validateBusinessSetting = function(key, value) {
    // Convert value to string and handle null/undefined
    const stringValue = value == null ? '' : String(value);
    const trimmedValue = stringValue.trim();
    
    switch (key) {
        case 'company_name':
            if (trimmedValue.length < 1) {
                throw new Error('Company name is required');
            }
            if (trimmedValue.length > 100) {
                throw new Error('Company name must be 100 characters or less');
            }
            break;
            
        case 'contact_email':
            if (trimmedValue.length < 1) {
                throw new Error('Contact email is required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedValue)) {
                throw new Error('Please enter a valid email address');
            }
            break;
            
        case 'phone_number':
            if (trimmedValue.length > 0) {
                // Basic phone validation - allows various formats
                const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)\.]{7,20}$/;
                if (!phoneRegex.test(trimmedValue)) {
                    throw new Error('Please enter a valid phone number');
                }
            }
            break;
            
        case 'base_url':
            if (trimmedValue.length > 0) {
                try {
                    new URL(trimmedValue);
                } catch {
                    throw new Error('Please enter a valid URL (e.g., https://example.com)');
                }
            }
            break;
            
        case 'address':
            if (trimmedValue.length > 500) {
                throw new Error('Address must be 500 characters or less');
            }
            break;
            
        case 'social_media_facebook':
        case 'social_media_twitter':
        case 'social_media_instagram':
        case 'social_media_linkedin':
        case 'social_media_youtube':
            if (trimmedValue.length > 0) {
                try {
                    const url = new URL(trimmedValue);
                    // Basic validation that it's a proper URL
                    if (!['http:', 'https:'].includes(url.protocol)) {
                        throw new Error('Social media URL must use http or https');
                    }
                } catch (error) {
                    // If it's our protocol error, re-throw it
                    if (error.message === 'Social media URL must use http or https') {
                        throw error;
                    }
                    // Otherwise it's a URL parsing error
                    throw new Error('Please enter a valid URL (e.g., https://youtube.com/yourchannel)');
                }
            }
            break;
            
        case 'timezone':
            if (!trimmedValue) {
                throw new Error('Business timezone is required');
            }
            // Validate timezone using Intl API
            try {
                Intl.DateTimeFormat(undefined, { timeZone: trimmedValue });
            } catch (error) {
                throw new Error('Invalid timezone identifier. Please select a valid timezone.');
            }
            break;
            
        default:
            // Allow other keys without specific validation
            if (trimmedValue.length > 1000) {
                throw new Error('Value must be 1000 characters or less');
            }
    }
    
    // Return null for empty optional fields, trimmed value otherwise
    return trimmedValue.length === 0 ? null : trimmedValue;
};

// Static method to get default lesson duration
AppSettings.getDefaultLessonDuration = async function() {
    try {
        const setting = await this.findOne({
            where: {
                category: 'lessons',
                key: 'default_duration_minutes'
            }
        });
        
        if (!setting) {
            // Fallback to 30 minutes if setting doesn't exist
            return 30;
        }
        
        const duration = parseInt(setting.value);
        return isNaN(duration) ? 30 : duration;
    } catch (error) {
        console.error('Error getting default lesson duration:', error);
        // Fallback to 30 minutes on error
        return 30;
    }
};

// Static method to get in-person payment enabled setting
AppSettings.getInPersonPaymentEnabled = async function() {
    try {
        const setting = await this.findOne({
            where: {
                category: 'lessons',
                key: 'in_person_payment_enabled'
            }
        });
        
        if (!setting) {
            // Default to false if setting doesn't exist
            return false;
        }
        
        // Convert string to boolean
        return setting.value === 'true';
    } catch (error) {
        console.error('Error getting in-person payment enabled setting:', error);
        // Default to false on error
        return false;
    }
};

// Static method to get card payment on behalf enabled setting
AppSettings.getCardPaymentOnBehalfEnabled = async function() {
    try {
        const setting = await this.findOne({
            where: {
                category: 'lessons',
                key: 'card_payment_on_behalf_enabled'
            }
        });
        
        if (!setting) {
            // Default to false if setting doesn't exist
            return false;
        }
        
        // Convert string to boolean
        return setting.value === 'true';
    } catch (error) {
        console.error('Error getting card payment on behalf enabled setting:', error);
        // Default to false on error
        return false;
    }
};

// Validation helper for lesson settings
AppSettings.validateLessonSetting = function(key, value) {
    switch (key) {
        case 'default_duration_minutes':
            const duration = parseInt(value);
            if (isNaN(duration) || duration < 15 || duration > 180) {
                throw new Error('Duration must be between 15 and 180 minutes');
            }
            if (![15, 30, 45, 60, 90, 120].includes(duration)) {
                throw new Error('Invalid duration value');
            }
            return duration.toString();
            
        case 'in_person_payment_enabled':
        case 'card_payment_on_behalf_enabled':
            if (typeof value === 'boolean') {
                return value.toString();
            }
            if (typeof value === 'string') {
                const lowerValue = value.toLowerCase().trim();
                if (lowerValue === 'true' || lowerValue === 'false') {
                    return lowerValue;
                }
            }
            throw new Error('Payment setting must be true or false');
            
        default:
            throw new Error(`Unknown lesson setting: ${key}`);
    }
};

// Validation helper for storage settings
AppSettings.validateStorageSetting = function(key, value) {
    // Convert value to string and handle null/undefined
    const stringValue = value == null ? '' : String(value).trim();
    
    switch (key) {
        case 'storage_type':
            const validTypes = ['local', 'spaces'];
            if (!validTypes.includes(stringValue)) {
                throw new Error(`Storage type must be one of: ${validTypes.join(', ')}`);
            }
            return stringValue;
            
        case 'storage_endpoint':
            if (stringValue.length > 0) {
                // Basic validation that it looks like a domain
                if (!/^[\w.-]+\.[\w]{2,}$/.test(stringValue)) {
                    throw new Error('Storage endpoint must be a valid domain (e.g., nyc3.digitaloceanspaces.com)');
                }
            }
            return stringValue || null;
            
        case 'storage_region':
            if (stringValue.length > 0) {
                // Basic validation - allow alphanumeric and hyphens
                if (!/^[a-z0-9-]+$/.test(stringValue)) {
                    throw new Error('Storage region must contain only lowercase letters, numbers, and hyphens');
                }
            }
            return stringValue || null;
            
        case 'storage_bucket':
            if (stringValue.length > 0) {
                // Bucket name validation - S3/Spaces compatible
                if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(stringValue) || stringValue.length > 63) {
                    throw new Error('Bucket name must be 3-63 lowercase characters, starting/ending with alphanumeric, with hyphens allowed');
                }
            }
            return stringValue || null;
            
        case 'storage_cdn_url':
            if (stringValue.length > 0) {
                try {
                    new URL(stringValue);
                } catch {
                    throw new Error('Storage CDN URL must be a valid URL (e.g., https://cdn.example.com)');
                }
            }
            return stringValue || null;
            
        default:
            throw new Error(`Unknown storage setting: ${key}`);
    }
};

module.exports = { AppSettings };
