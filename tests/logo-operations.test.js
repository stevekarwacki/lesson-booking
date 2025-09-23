#!/usr/bin/env node

/**
 * Logo Operations Test Suite
 * Tests logo processing, validation, and file operations without database dependencies
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');

// Mock Sharp for image processing
const mockSharp = {
  metadata: () => Promise.resolve({ width: 800, height: 200 }),
  resize: () => mockSharp,
  png: () => mockSharp,
  toBuffer: () => Promise.resolve(Buffer.from('processed-image-data'))
};

// Mock file-type for validation
const mockFileType = {
  fileTypeFromBuffer: () => Promise.resolve({ mime: 'image/png' })
};

// Import utilities with mocked dependencies
const LOGO_CONFIG = require('../constants/logoConfig');

// Isolated validation functions for testing
const validateImageDimensions = async (buffer, minWidth = 50, minHeight = 50) => {
  const metadata = await mockSharp.metadata();
  const { width, height } = metadata;
  
  if (width < minWidth || height < minHeight) {
    throw new Error(`Image is too small. Minimum size is ${minWidth}x${minHeight} pixels. Your image is ${width}x${height}.`);
  }
  
  return { width, height };
};

const validateFileType = async (buffer, allowedTypes = ['image/']) => {
  const fileType = await mockFileType.fileTypeFromBuffer(buffer);
  
  if (!fileType) {
    throw new Error('Could not determine file type');
  }
  
  const isAllowed = allowedTypes.some(type => fileType.mime.startsWith(type));
  if (!isAllowed) {
    throw new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`);
  }
  
  return fileType;
};

const calculateTargetDimensions = (width, height, maxWidth, maxHeight) => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, needsResize: false };
  }
  
  const scaleWidth = maxWidth / width;
  const scaleHeight = maxHeight / height;
  const scale = Math.min(scaleWidth, scaleHeight);
  
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);
  
  return { 
    width: targetWidth, 
    height: targetHeight, 
    needsResize: true 
  };
};

describe('Logo Operations', () => {
  let testBuffer;

  beforeEach(() => {
    testBuffer = Buffer.from('test-image-data');
  });

  describe('Image Dimension Validation', () => {
    test('should pass validation for images meeting minimum requirements', async () => {
      const result = await validateImageDimensions(testBuffer, 50, 50);
      assert.strictEqual(result.width, 800);
      assert.strictEqual(result.height, 200);
    });

    test('should throw error for images smaller than minimum', async () => {
      await assert.rejects(
        validateImageDimensions(testBuffer, 1000, 1000),
        {
          message: 'Image is too small. Minimum size is 1000x1000 pixels. Your image is 800x200.'
        }
      );
    });
  });

  describe('File Type Validation', () => {
    test('should pass validation for allowed image types', async () => {
      const result = await validateFileType(testBuffer, ['image/']);
      assert.strictEqual(result.mime, 'image/png');
    });

    test('should throw error for disallowed file types', async () => {
      mockFileType.fileTypeFromBuffer = () => Promise.resolve({ mime: 'application/pdf' });
      
      await assert.rejects(
        validateFileType(testBuffer, ['image/']),
        {
          message: 'Invalid file type. Only image/ files are allowed.'
        }
      );
      
      // Reset mock
      mockFileType.fileTypeFromBuffer = () => Promise.resolve({ mime: 'image/png' });
    });

    test('should throw error when file type cannot be determined', async () => {
      mockFileType.fileTypeFromBuffer = () => Promise.resolve(null);
      
      await assert.rejects(
        validateFileType(testBuffer),
        {
          message: 'Could not determine file type'
        }
      );
      
      // Reset mock
      mockFileType.fileTypeFromBuffer = () => Promise.resolve({ mime: 'image/png' });
    });
  });

  describe('Dimension Calculation', () => {
    test('should not resize images within limits', () => {
      const result = calculateTargetDimensions(300, 80, 400, 100);
      assert.strictEqual(result.width, 300);
      assert.strictEqual(result.height, 80);
      assert.strictEqual(result.needsResize, false);
    });

    test('should resize images exceeding width limit', () => {
      const result = calculateTargetDimensions(800, 100, 400, 100);
      assert.strictEqual(result.width, 400);
      assert.strictEqual(result.height, 50);
      assert.strictEqual(result.needsResize, true);
    });

    test('should resize images exceeding height limit', () => {
      const result = calculateTargetDimensions(200, 200, 400, 100);
      assert.strictEqual(result.width, 100);
      assert.strictEqual(result.height, 100);
      assert.strictEqual(result.needsResize, true);
    });

    test('should preserve aspect ratio when resizing', () => {
      const result = calculateTargetDimensions(800, 200, 400, 100);
      const aspectRatio = result.width / result.height;
      const originalAspectRatio = 800 / 200;
      assert.strictEqual(aspectRatio, originalAspectRatio);
    });
  });

  describe('Logo Configuration', () => {
    test('should have valid configuration constants', () => {
      assert.strictEqual(typeof LOGO_CONFIG.MAX_WIDTH, 'number');
      assert.strictEqual(typeof LOGO_CONFIG.MAX_HEIGHT, 'number');
      assert.strictEqual(typeof LOGO_CONFIG.MIN_WIDTH, 'number');
      assert.strictEqual(typeof LOGO_CONFIG.MIN_HEIGHT, 'number');
      assert.strictEqual(typeof LOGO_CONFIG.MAX_FILE_SIZE, 'number');
      assert.ok(Array.isArray(LOGO_CONFIG.ALLOWED_FORMATS));
      assert.ok(Array.isArray(LOGO_CONFIG.POSITION_OPTIONS));
    });

    test('should have position options with required properties', () => {
      const options = LOGO_CONFIG.POSITION_OPTIONS;
      assert.ok(options.length > 0);
      
      options.forEach(option => {
        assert.ok(option.value);
        assert.ok(option.label);
        assert.strictEqual(typeof option.value, 'string');
        assert.strictEqual(typeof option.label, 'string');
      });
      
      // Should have exactly one default option
      const defaultOptions = options.filter(opt => opt.default);
      assert.strictEqual(defaultOptions.length, 1);
    });

    test('should have reasonable size limits', () => {
      assert.ok(LOGO_CONFIG.MAX_WIDTH >= LOGO_CONFIG.MIN_WIDTH);
      assert.ok(LOGO_CONFIG.MAX_HEIGHT >= LOGO_CONFIG.MIN_HEIGHT);
      assert.ok(LOGO_CONFIG.MAX_FILE_SIZE > 0);
      assert.ok(LOGO_CONFIG.MIN_WIDTH > 0);
      assert.ok(LOGO_CONFIG.MIN_HEIGHT > 0);
    });
  });
});

describe('File Operations', () => {
  describe('Filename Generation', () => {
    test('should generate unique filenames with timestamp', async () => {
      const generateUniqueFilename = (originalName, extension = null) => {
        const timestamp = Date.now();
        const ext = extension || path.extname(originalName) || '.png';
        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const baseName = path.parse(safeName).name;
        return `${timestamp}_${baseName}${ext}`;
      };

      const filename1 = generateUniqueFilename('test-logo.png');
      
      // Wait 5ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const filename2 = generateUniqueFilename('test-logo.png');
      
      assert.ok(filename1.includes('test-logo'));
      assert.ok(filename1.endsWith('.png'));
      assert.notStrictEqual(filename1, filename2); // Should be unique due to timestamp
    });

    test('should sanitize unsafe characters in filenames', () => {
      const generateUniqueFilename = (originalName) => {
        const timestamp = Date.now();
        const ext = path.extname(originalName) || '.png';
        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const baseName = path.parse(safeName).name;
        return `${timestamp}_${baseName}${ext}`;
      };

      const filename = generateUniqueFilename('test logo with spaces & symbols!.png');
      const baseName = filename.split('_')[1]; // Get the sanitized part
      
      assert.ok(!baseName.includes(' '));
      assert.ok(!baseName.includes('&'));
      assert.ok(!baseName.includes('!'));
      assert.ok(baseName.includes('test'));
    });
  });

  describe('Path Operations', () => {
    test('should create valid web URLs from file paths', () => {
      const createWebUrl = (baseDirectory, filename) => {
        return `/${baseDirectory}/${filename}`;
      };

      const webUrl = createWebUrl('uploads/logos', '1640995200000_company-logo.png');
      assert.strictEqual(webUrl, '/uploads/logos/1640995200000_company-logo.png');
    });
  });
});
