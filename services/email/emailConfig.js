const nodemailerProvider = require('./nodemailerProvider');
const gmailProvider = require('./gmailProvider');
const config = require('../../config');

const PROVIDER_RULES = [
    {
        name: 'gmail_for_instructors',
        test: (ctx) => ctx.instructorId && config.features.oauthEmail,
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
