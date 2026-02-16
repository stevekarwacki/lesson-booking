/**
 * SMTP Configuration Validation Schema
 * 
 * Shared validation between frontend and backend for SMTP settings.
 */

import { z } from 'zod';

export const smtpConfigSchema = z.object({
    email_host: z.string()
        .trim()
        .min(1, 'SMTP host is required')
        .max(255, 'SMTP host must be 255 characters or less')
        .refine(
            (val) => {
                // Basic domain validation (allows subdomains, not strict)
                return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(val);
            },
            { message: 'Must be a valid hostname (e.g., smtp.gmail.com)' }
        ),
    
    email_port: z.coerce.number()
        .int('Port must be an integer')
        .min(1, 'Port must be between 1 and 65535')
        .max(65535, 'Port must be between 1 and 65535'),
    
    email_secure: z.boolean(),
    
    email_user: z.string()
        .trim()
        .min(1, 'Email username is required')
        .max(255, 'Email username must be 255 characters or less')
        .email('Must be a valid email address'),
    
    email_password: z.string()
        .max(500, 'Email password must be 500 characters or less')
        .optional()
        .or(z.literal('')),
    
    email_from_name: z.string()
        .trim()
        .max(100, 'From name must be 100 characters or less')
        .optional()
        .or(z.literal('')),
    
    email_from_address: z.string()
        .trim()
        .max(255, 'From address must be 255 characters or less')
        .email('Must be a valid email address')
        .optional()
        .or(z.literal(''))
}).refine(
    (data) => {
        // If from_address is provided, it should be a valid email
        if (data.email_from_address && data.email_from_address.trim()) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_from_address);
        }
        return true;
    },
    { 
        message: 'From address must be a valid email address',
        path: ['email_from_address']
    }
);

/**
 * Schema for test email
 */
export const smtpTestSchema = z.object({
    recipient_email: z.string()
        .trim()
        .email('Must be a valid email address')
});
