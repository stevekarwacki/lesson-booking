const { DataTypes } = require('sequelize');
const sequelize = require('../db/index');
const cache = require('../db/cache');

const CACHE_KEYS = {
    allUsers: 'users:all',
    userById: (id) => `users:${id}`
};

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'student',
        validate: {
            isIn: [['student', 'instructor', 'admin']]
        }
    },
    is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods
const clearCache = async (userId = null) => {
    try {
        await cache.del(CACHE_KEYS.allUsers);
        if (userId) {
            await cache.del(CACHE_KEYS.userById(userId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

// Instance methods
User.findByEmail = async function(email) {
    return this.findOne({ where: { email } });
};

User.getUserName = async function(userId) {
    const user = await this.findByPk(userId, {
        attributes: ['name']
    });
    return user ? user.name : null;
};

User.getAllUsers = async function() {
    return this.findAll({
        attributes: { exclude: ['password'] }
    });
};

User.findById = async function(id) {
    return this.findByPk(id, {
        attributes: { exclude: ['password'] }
    });
};

User.updateUser = async function(id, updates) {
    const user = await this.findByPk(id);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update(updates);
    await clearCache(id);
    return user;
};

User.deleteUser = async function(id) {
    const user = await this.findByPk(id);
    if (!user) {
        throw new Error('User not found');
    }
    await user.destroy();
    await clearCache(id);
};

User.updateUserRole = async function(userId, role) {
    const user = await this.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update({ role });
    await clearCache(userId);
    return user;
};

User.setApprovalStatus = async function(userId, isApproved) {
    const user = await this.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update({ is_approved: isApproved });
    await clearCache(userId);
    return user;
};

// Add a method to get plain object representation
User.getPlainObject = function(user) {
    if (!user) return null;
    return user.get({ plain: true });
};

// Hooks
User.afterCreate(async (user) => {
    await clearCache();
});

User.afterUpdate(async (user) => {
    await clearCache(user.id);
});

User.afterDestroy(async (user) => {
    await clearCache(user.id);
});

module.exports = { User, clearCache }; 