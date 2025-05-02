const bcrypt = require('bcrypt');

const createAdminUser = async (models) => {
    try {
        // Check if any admin user exists
        const existingAdmin = await models.User.findOne({
            where: { role: 'admin' }
        });

        if (existingAdmin) {
            console.log('An admin user already exists');
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
            credits: 0
        });

        console.log('Default admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
        throw error;
    }
};

module.exports = createAdminUser; 