const createDefaultAppSettings = async (models) => {
    try {
        const { AppSettings } = models;
        
        // Get the admin user to use as updated_by
        const adminUser = await models.User.findOne({
            where: { role: 'admin' }
        });
        
        if (!adminUser) {
            console.warn('No admin user found, skipping app settings seed');
            return;
        }
        
        // Define default settings
        const defaultSettings = [
            {
                category: 'lessons',
                key: 'default_duration_minutes',
                value: '30',
                description: 'Default lesson duration in minutes'
            },
            {
                category: 'lessons',
                key: 'in_person_payment_enabled',
                value: 'false',
                description: 'Enable in-person payment option'
            },
            {
                category: 'business',
                key: 'timezone',
                value: 'UTC',
                description: 'Business timezone'
            },
            {
                category: 'business',
                key: 'user_approval_required',
                value: 'false',
                description: 'Require admin approval for new users before they can book lessons'
            }
        ];
        
        // Create settings if they don't exist
        for (const setting of defaultSettings) {
            const existing = await AppSettings.getSetting(setting.category, setting.key);
            
            if (!existing) {
                await AppSettings.setSetting(
                    setting.category,
                    setting.key,
                    setting.value,
                    adminUser.id
                );
            }
        }
        
    } catch (error) {
        console.error('Error creating default app settings:', error);
        throw error;
    }
};

module.exports = createDefaultAppSettings;
