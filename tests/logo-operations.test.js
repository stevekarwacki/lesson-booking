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
  metadata: () => Promise.resolve({ width: 800, height: 200, format: 'png' }),
  resize: () => mockSharp,
  png: () => mockSharp,
  toBuffer: () => Promise.resolve(Buffer.from('processed-image-data'))
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

const validateFileType = async (buffer, allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) => {
  try {
    const metadata = await mockSharp.metadata();
    
    if (!metadata.format) {
      throw new Error('Could not determine image format');
    }
    
    // Map sharp format names to MIME types
    const formatToMime = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'tiff': 'image/tiff'
    };
    
    const mimeType = formatToMime[metadata.format.toLowerCase()];
    
    if (!mimeType) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }
    
    // Check if format is allowed
    const isAllowed = allowedFormats.includes(mimeType);
    if (!isAllowed) {
      throw new Error(`Invalid file type. Only ${allowedFormats.join(', ')} files are allowed. Got: ${mimeType}`);
    }
    
    return {
      mime: mimeType,
      ext: metadata.format.toLowerCase()
    };
  } catch (error) {
    if (error.message.includes('Input buffer contains unsupported image format')) {
      throw new Error('File is not a valid image');
    }
    throw error;
  }
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
      const result = await validateFileType(testBuffer, ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      assert.strictEqual(result.mime, 'image/png');
      assert.strictEqual(result.ext, 'png');
    });

    test('should throw error for disallowed file types', async () => {
      // Mock an unsupported format
      const originalMetadata = mockSharp.metadata;
      mockSharp.metadata = () => Promise.resolve({ width: 800, height: 200, format: 'bmp' });
      
      await assert.rejects(
        validateFileType(testBuffer, ['image/jpeg', 'image/png']),
        {
          message: 'Unsupported image format: bmp'
        }
      );
      
      // Reset mock
      mockSharp.metadata = originalMetadata;
    });

    test('should throw error when image format cannot be determined', async () => {
      const originalMetadata = mockSharp.metadata;
      mockSharp.metadata = () => Promise.resolve({ width: 800, height: 200, format: null });
      
      await assert.rejects(
        validateFileType(testBuffer),
        {
          message: 'Could not determine image format'
        }
      );
      
      // Reset mock
      mockSharp.metadata = originalMetadata;
    });

    test('should reject format not in allowed list', async () => {
      const originalMetadata = mockSharp.metadata;
      mockSharp.metadata = () => Promise.resolve({ width: 800, height: 200, format: 'gif' });
      
      await assert.rejects(
        validateFileType(testBuffer, ['image/jpeg', 'image/png']),
        {
          message: 'Invalid file type. Only image/jpeg, image/png files are allowed. Got: image/gif'
        }
      );
      
      // Reset mock
      mockSharp.metadata = originalMetadata;
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

      const originalDateNow = Date.now;
      let fakeTimestamp = 1000000;
      Date.now = () => fakeTimestamp;

      const filename1 = generateUniqueFilename('test-logo.png');
      fakeTimestamp += 10;
      const filename2 = generateUniqueFilename('test-logo.png');

      Date.now = originalDateNow;
      
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
