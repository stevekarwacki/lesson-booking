const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock the AppSettings model
const mockAppSettings = {
    getSettingsByCategory: async (category) => {
        if (category === 'business') {
            return {
                company_name: 'Test Company',
                contact_email: 'test@company.com',
                phone_number: '555-0123',
                base_url: 'https://testcompany.com',
                address: '123 Test St',
                social_media_facebook: 'https://facebook.com/testcompany',
                social_media_twitter: 'https://twitter.com/testcompany',
                social_media_instagram: '',
                social_media_linkedin: 'https://linkedin.com/company/testcompany',
                social_media_youtube: 'https://youtube.com/testchannel'
            };
        }
        return {};
    }
};

// Mock the models/AppSettings module
require.cache[require.resolve('../models/AppSettings')] = {
    exports: { AppSettings: mockAppSettings }
};

// Import the router after mocking
const publicRoutes = require('../routes/public');

describe('Public API Routes', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        // Create mock request and response objects
        mockReq = {
            method: 'GET',
            url: '/business-info',
            headers: {}
        };
        
        mockRes = {
            statusCode: 200,
            headers: {},
            data: null,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.data = data;
                return this;
            },
            setHeader: function(name, value) {
                this.headers[name] = value;
                return this;
            }
        };
    });

    afterEach(() => {
        // Clean up any test-specific state
    });

    describe('GET /business-info', () => {
        it('should return business information with social media links', async () => {
            // Find the business-info route handler
            const businessInfoRoute = publicRoutes.stack.find(layer => 
                layer.route && layer.route.path === '/business-info'
            );
            
            assert(businessInfoRoute, 'business-info route should exist');
            
            const handler = businessInfoRoute.route.stack[0].handle;
            
            // Call the handler
            await handler(mockReq, mockRes);
            
            // Verify response
            assert.strictEqual(mockRes.statusCode, 200);
            assert.strictEqual(mockRes.data.companyName, 'Test Company');
            assert.strictEqual(mockRes.data.contactEmail, 'test@company.com');
            assert.strictEqual(mockRes.data.phoneNumber, '555-0123');
            assert.strictEqual(mockRes.data.website, 'https://testcompany.com');
            assert.strictEqual(mockRes.data.address, '123 Test St');
            
            // Test social media links
            assert.strictEqual(mockRes.data.socialMedia.facebook, 'https://facebook.com/testcompany');
            assert.strictEqual(mockRes.data.socialMedia.twitter, 'https://twitter.com/testcompany');
            assert.strictEqual(mockRes.data.socialMedia.instagram, '');
            assert.strictEqual(mockRes.data.socialMedia.linkedin, 'https://linkedin.com/company/testcompany');
            assert.strictEqual(mockRes.data.socialMedia.youtube, 'https://youtube.com/testchannel');
        });

        it('should return empty structure on database error', async () => {
            // Mock a database error
            const originalMethod = mockAppSettings.getSettingsByCategory;
            mockAppSettings.getSettingsByCategory = async () => {
                throw new Error('Database connection failed');
            };

            // Find the business-info route handler
            const businessInfoRoute = publicRoutes.stack.find(layer => 
                layer.route && layer.route.path === '/business-info'
            );
            
            const handler = businessInfoRoute.route.stack[0].handle;
            
            // Call the handler
            await handler(mockReq, mockRes);

            // Should return empty structure instead of error
            assert.strictEqual(mockRes.statusCode, 200);
            assert.strictEqual(mockRes.data.companyName, '');
            assert.strictEqual(mockRes.data.contactEmail, '');
            assert.strictEqual(mockRes.data.socialMedia.facebook, '');
            assert.strictEqual(mockRes.data.socialMedia.youtube, '');

            // Restore original method
            mockAppSettings.getSettingsByCategory = originalMethod;
        });

        it('should handle missing social media fields gracefully', async () => {
            // Mock response with no social media fields
            const originalMethod = mockAppSettings.getSettingsByCategory;
            mockAppSettings.getSettingsByCategory = async (category) => {
                if (category === 'business') {
                    return {
                        company_name: 'Minimal Company',
                        contact_email: 'minimal@company.com'
                        // No social media fields
                    };
                }
                return {};
            };

            // Find the business-info route handler
            const businessInfoRoute = publicRoutes.stack.find(layer => 
                layer.route && layer.route.path === '/business-info'
            );
            
            const handler = businessInfoRoute.route.stack[0].handle;
            
            // Call the handler
            await handler(mockReq, mockRes);

            assert.strictEqual(mockRes.statusCode, 200);
            assert.strictEqual(mockRes.data.companyName, 'Minimal Company');
            assert.strictEqual(mockRes.data.socialMedia.facebook, '');
            assert.strictEqual(mockRes.data.socialMedia.twitter, '');
            assert.strictEqual(mockRes.data.socialMedia.instagram, '');
            assert.strictEqual(mockRes.data.socialMedia.linkedin, '');
            assert.strictEqual(mockRes.data.socialMedia.youtube, '');

            // Restore original method
            mockAppSettings.getSettingsByCategory = originalMethod;
        });
    });
});

