const bcrypt = require('bcrypt');

const createAdminUser = async (models) => {
    try {
        // Check if any admin user exists
        const existingAdmin = await models.User.findOne({
            where: { role: 'admin' }
        });

        if (existingAdmin) {
            return;
        }

        // Create default admin user
        const hashedPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD || 'admin123',
            10
        );

        await models.User.create({
            name: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            is_approved: true
        });

    } catch (error) {
        // Handle unique constraint errors gracefully
        if (error.name === 'SequelizeUniqueConstraintError') {
            return;
        }
        
        console.error('Error creating admin user:', error);
        throw error;
    }
};

module.exports = createAdminUser; 