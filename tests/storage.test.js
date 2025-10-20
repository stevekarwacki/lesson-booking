const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs').promises;
const { validateStorageInterface, createStorage } = require('../storage/interface');
const createLocalStorage = require('../storage/local');
const createSpacesStorage = require('../storage/spaces');
const createStorageFactory = require('../storage/factory');
const { initializeStorage, getStorage, resetStorage } = require('../storage/index');

describe('Storage Abstraction Layer', () => {
    
    describe('Storage Interface', () => {
        test('should validate correct storage implementation', () => {
            const validStorage = {
                save: async () => ({ url: 'test', filename: 'test.png' }),
                get: async () => Buffer.from('test'),
                delete: async () => true,
                exists: async () => true,
                getPublicUrl: () => 'http://example.com/test.png'
            };
            
            assert.doesNotThrow(() => {
                validateStorageInterface(validStorage);
            });
        });
        
        test('should reject storage missing required methods', () => {
            const invalidStorage = {
                save: async () => {},
                get: async () => {},
            };
            
            assert.throws(() => {
                validateStorageInterface(invalidStorage);
            }, /missing required methods/i);
        });
        
        test('should wrap implementation with createStorage', () => {
            const implementation = {
                save: async () => ({ url: 'test', filename: 'test.png' }),
                get: async () => Buffer.from('test'),
                delete: async () => true,
                exists: async () => true,
                getPublicUrl: () => 'http://example.com/test.png'
            };
            
            const storage = createStorage(implementation);
            assert.strictEqual(storage, implementation);
            assert.strictEqual(typeof storage.save, 'function');
            assert.strictEqual(typeof storage.get, 'function');
        });
    });
    
    describe('Local Storage', () => {
        const testDir = path.join(__dirname, '..', 'uploads', 'test-storage');
        let storage;
        
        test('setup - initialize storage', () => {
            storage = createLocalStorage();
            assert.ok(storage);
        });
        
        test('should implement storage interface', () => {
            assert.doesNotThrow(() => {
                validateStorageInterface(storage);
            });
        });
        
        test('should save file to local storage', async () => {
            const buffer = Buffer.from('test content');
            const result = await storage.save(buffer, 'test.png', 'test-storage');
            
            assert.ok(result.url);
            assert.ok(result.filename);
            assert.match(result.url, /\/api\/assets\/test-storage\//);
            assert.match(result.filename, /test\.png/);
        });
        
        test('should retrieve saved file from local storage', async () => {
            const buffer = Buffer.from('test content 123');
            const { filename } = await storage.save(buffer, 'test.txt', 'test-storage');
            
            const retrieved = await storage.get(`test-storage/${filename}`);
            assert.strictEqual(retrieved.toString(), 'test content 123');
        });
        
        test('should check if file exists', async () => {
            const buffer = Buffer.from('exists test');
            const { filename } = await storage.save(buffer, 'exists.png', 'test-storage');
            
            const exists = await storage.exists(`test-storage/${filename}`);
            assert.strictEqual(exists, true);
            
            const notExists = await storage.exists('test-storage/nonexistent.png');
            assert.strictEqual(notExists, false);
        });
        
        test('should delete files', async () => {
            const buffer = Buffer.from('delete me');
            const { filename } = await storage.save(buffer, 'delete.png', 'test-storage');
            
            let exists = await storage.exists(`test-storage/${filename}`);
            assert.strictEqual(exists, true);
            
            const deleted = await storage.delete(`test-storage/${filename}`);
            assert.strictEqual(deleted, true);
            
            exists = await storage.exists(`test-storage/${filename}`);
            assert.strictEqual(exists, false);
        });
        
        test('should return correct public URL', () => {
            const url = storage.getPublicUrl('logos/test.png');
            assert.strictEqual(url, '/api/assets/logos/test.png');
        });
        
        test('should prevent path traversal in get', async () => {
            await assert.rejects(storage.get('../../../etc/passwd'));
        });
        
        test('should prevent path traversal in delete', async () => {
            const result = await storage.delete('../../../etc/passwd');
            assert.strictEqual(result, false);
        });
        
        test('cleanup - remove test files', async () => {
            try {
                await fs.rm(testDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    });
    
    describe('Spaces Storage', () => {
        test('should handle missing AWS SDK gracefully', () => {
            const result = createSpacesStorage({
                endpoint: 'test.digitaloceanspaces.com',
                region: 'nyc3',
                bucket: 'test',
                accessKeyId: 'test',
                secretAccessKey: 'test'
            });
            
            if (result !== null) {
                assert.doesNotThrow(() => {
                    validateStorageInterface(result);
                });
            }
        });
        
        test('should validate required configuration', () => {
            try {
                require('@aws-sdk/client-s3');
                assert.throws(() => {
                    createSpacesStorage({
                        endpoint: 'test.digitaloceanspaces.com'
                    });
                }, /missing required/i);
            } catch (e) {
                // AWS SDK not installed, skip test
            }
        });
    });
    
    describe('Storage Factory', () => {
        test('should create local storage by default', async () => {
            const storage = await createStorageFactory();
            assert.doesNotThrow(() => {
                validateStorageInterface(storage);
            });
        });
        
        test('should handle missing AppSettings gracefully', async () => {
            const storage = await createStorageFactory({ appSettings: null });
            assert.doesNotThrow(() => {
                validateStorageInterface(storage);
            });
        });
    });
    
    describe('Storage Singleton', () => {
        test('should initialize storage on first call', async () => {
            resetStorage();
            const storage = await initializeStorage();
            assert.doesNotThrow(() => {
                validateStorageInterface(storage);
            });
        });
        
        test('should return same instance on subsequent calls', async () => {
            const storage1 = await initializeStorage();
            const storage2 = getStorage();
            assert.strictEqual(storage1, storage2);
        });
        
        test('should throw if getStorage called before initialization', () => {
            resetStorage();
            assert.throws(() => {
                getStorage();
            }, /not initialized/i);
        });
        
        test('should reset storage instance', async () => {
            await initializeStorage();
            resetStorage();
            
            assert.throws(() => {
                getStorage();
            }, /not initialized/i);
        });
    });
});
