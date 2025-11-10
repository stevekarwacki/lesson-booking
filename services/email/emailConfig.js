const nodemailerProvider = require('./nodemailerProvider');
const gmailProvider = require('./gmailProvider');

const PROVIDER_RULES = [
    {
        name: 'gmail_for_instructors',
        test: (ctx) => ctx.instructorId && process.env.USE_OAUTH_EMAIL === 'true',
        provider: gmailProvider
    },
    {
        name: 'nodemailer_default',
        test: () => true, // Always matches as fallback
        provider: nodemailerProvider
    }
];

const selectProvider = (context) => {
    const rule = PROVIDER_RULES.find(rule => rule.test(context));
    return rule.provider;
};

module.exports = {
    selectProvider,
    PROVIDER_RULES // Export for testing
};
