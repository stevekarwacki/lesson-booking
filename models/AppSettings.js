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
            isIn: [['business', 'theme', 'email', 'branding', 'lessons']]
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
    if (!value || typeof value !== 'string') {
        return null; // Allow empty values for optional fields
    }

    const trimmedValue = value.trim();
    
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
            
        default:
            // Allow other keys without specific validation
            if (trimmedValue.length > 1000) {
                throw new Error('Value must be 1000 characters or less');
            }
    }
    
    return trimmedValue;
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
            if (typeof value === 'boolean') {
                return value.toString();
            }
            if (typeof value === 'string') {
                const lowerValue = value.toLowerCase().trim();
                if (lowerValue === 'true' || lowerValue === 'false') {
                    return lowerValue;
                }
            }
            throw new Error('In-person payment setting must be true or false');
            
        default:
            throw new Error(`Unknown lesson setting: ${key}`);
    }
};

module.exports = { AppSettings };
