/**
 * Utility functions for handling base64 images stored in Firestore
 */

class ImageUtils {
  /**
   * Check if a string is a valid base64 data URL
   */
  static isBase64DataUrl(str) {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('data:image/') && str.includes('base64,');
  }

  /**
   * Get image info from base64 data URL
   */
  static getImageInfo(base64DataUrl) {
    if (!this.isBase64DataUrl(base64DataUrl)) {
      return null;
    }

    try {
      const [header, base64Data] = base64DataUrl.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      const sizeInBytes = Math.round(base64Data.length * 0.75);
      const sizeInKB = Math.round(sizeInBytes / 1024);

      return {
        mimeType,
        sizeInBytes,
        sizeInKB,
        base64Length: base64Data.length
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      return null;
    }
  }

  /**
   * Validate base64 image size for Firestore storage
   */
  static validateImageSize(base64DataUrl, maxSizeKB = 800) {
    const info = this.getImageInfo(base64DataUrl);
    if (!info) {
      return { valid: false, error: 'Invalid image format' };
    }

    if (info.sizeInKB > maxSizeKB) {
      return { 
        valid: false, 
        error: `Image too large (${info.sizeInKB}KB). Maximum allowed: ${maxSizeKB}KB` 
      };
    }

    return { valid: true, info };
  }

  /**
   * Create a thumbnail from base64 image (for display purposes)
   */
  static createThumbnail(base64DataUrl, quality = 0.3) {
    // This would require additional processing
    // For now, just return the original image
    return base64DataUrl;
  }

  /**
   * Convert base64 to blob (if needed for other operations)
   */
  static base64ToBlob(base64DataUrl) {
    if (!this.isBase64DataUrl(base64DataUrl)) {
      throw new Error('Invalid base64 data URL');
    }

    const [header, base64Data] = base64DataUrl.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Log image statistics for debugging
   */
  static logImageStats(base64DataUrl, label = 'Image') {
    const info = this.getImageInfo(base64DataUrl);
    if (info) {
      console.log(`📊 ${label} Stats:`, {
        mimeType: info.mimeType,
        size: this.formatFileSize(info.sizeInBytes),
        base64Length: info.base64Length
      });
    } else {
      console.log(`❌ ${label}: Invalid image data`);
    }
  }
}

export default ImageUtils; 