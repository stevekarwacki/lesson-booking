const bcrypt = require('bcrypt');

const createAdminUser = async (models) => {
    try {
        // Check if admin already exists
        const existingAdmin = await models.User.findOne({
            where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' }
        });

        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
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

        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
        throw error;
    }
};

module.exports = createAdminUser; 