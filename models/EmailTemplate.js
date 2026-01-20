const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const EmailTemplate = sequelize.define('EmailTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    template_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    subject_template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    body_template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    default_subject_template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    default_body_template: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    available_variables: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    last_edited_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'email_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

EmailTemplate.findByKey = async function(templateKey) {
    return this.findOne({ 
        where: { 
            template_key: templateKey,
            is_active: true
        }
    });
};

EmailTemplate.getAllActive = async function() {
    return this.findAll({
        where: { is_active: true },
        order: [['category', 'ASC'], ['name', 'ASC']]
    });
};

EmailTemplate.getByCategory = async function(category) {
    return this.findAll({
        where: { 
            category,
            is_active: true
        },
        order: [['name', 'ASC']]
    });
};

EmailTemplate.updateTemplate = async function(templateKey, updates, userId) {
    const template = await this.findByKey(templateKey);
    if (!template) {
        throw new Error('Template not found');
    }
    
    const updateData = {
        ...updates,
        last_edited_by: userId
    };
    
    await template.update(updateData);
    return template;
};

EmailTemplate.resetToDefault = async function(templateKey, userId) {
    const template = await this.findByKey(templateKey);
    if (!template) {
        throw new Error('Template not found');
    }
    
    await template.update({
        subject_template: template.default_subject_template,
        body_template: template.default_body_template,
        last_edited_by: userId
    });
    
    return template;
};

EmailTemplate.isModified = function(template) {
    return template.subject_template !== template.default_subject_template ||
           template.body_template !== template.default_body_template;
};

EmailTemplate.validateTemplate = function(subjectTemplate, bodyTemplate) {
    const errors = [];
    
    const checkUnclosedBrackets = (text, field) => {
        const openCount = (text.match(/\{\{/g) || []).length;
        const closeCount = (text.match(/\}\}/g) || []).length;
        
        if (openCount !== closeCount) {
            errors.push(`${field} has unclosed Handlebars brackets`);
        }
    };
    
    checkUnclosedBrackets(subjectTemplate, 'Subject');
    checkUnclosedBrackets(bodyTemplate, 'Body');
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const setupAssociations = (models) => {
    EmailTemplate.belongsTo(models.User, {
        foreignKey: 'last_edited_by',
        as: 'Editor'
    });
};

module.exports = { EmailTemplate, setupAssociations };