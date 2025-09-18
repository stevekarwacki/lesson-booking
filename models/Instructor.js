const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { User } = require('./User');

const Instructor = sequelize.define('Instructor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    specialties: {
        type: DataTypes.STRING,
        allowNull: true
    },
    hourly_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'instructors',
    timestamps: false
});

// Hooks to manage user role
Instructor.afterCreate(async (instructor) => {
    await User.updateUserRole(instructor.user_id, 'instructor');
});

Instructor.afterDestroy(async (instructor) => {
    await User.updateUserRole(instructor.user_id, 'student');
});

// Static methods
Instructor.createInstructor = async function(data) {
    const instructor = await this.create(data);
    return instructor;
};

Instructor.getInstructorByUserId = async function(userId) {
    return this.findOne({ where: { user_id: userId } });
};

Instructor.getAllInstructors = async function() {
    return this.findAll({
        include: [{
            model: User,
            attributes: ['name', 'email']
        }]
    });
};

Instructor.updateInstructor = async function(instructorId, updates) {
    const instructor = await this.findByPk(instructorId);
    if (!instructor) {
        throw new Error('Instructor not found');
    }
    await instructor.update(updates);
    return instructor;
};

Instructor.deleteInstructor = async function(instructorId) {
    const instructor = await this.findByPk(instructorId);
    if (!instructor) {
        throw new Error('Instructor not found');
    }
    await instructor.destroy();
};

Instructor.toggleActive = async function(id) {
    const instructor = await this.findByPk(id);
    if (!instructor) {
        throw new Error('Instructor not found');
    }
    await instructor.update({ is_active: !instructor.is_active });
    return instructor;
};

Instructor.getAll = async function() {
    return this.findAll({
        include: [{
            model: User,
            attributes: ['name', 'email']
        }]
    });
};

Instructor.getAllActive = async function() {
    return this.findAll({
        where: { is_active: true },
        include: [{
            model: User,
            attributes: ['name', 'email']
        }]
    });
};

Instructor.findByUserId = async function(userId) {
    const instructor = await this.findOne({
        where: { user_id: userId },
        include: [{
            model: User,
            attributes: ['name', 'email']
        }]
    });
    
    if (!instructor) return null;
    
    // Normalize to include flat instructor_name
    const instructorData = instructor.toJSON();
    return {
        ...instructorData,
        name: instructorData.User?.name || null,
        email: instructorData.User?.email || null
    };
};

module.exports = { Instructor }; 