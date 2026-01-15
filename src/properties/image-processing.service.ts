import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export interface ImageSizes {
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // Define image size configurations
  private readonly sizes = {
    thumbnail: { width: 300, height: 200 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 },
  };

  /**
   * Process uploaded image and generate multiple sizes
   * @param originalFilePath Path to the original uploaded file
   * @param filename Base filename without extension
   * @returns Object containing paths to all generated image sizes
   */
  async processImage(
    originalFilePath: string,
    filename: string,
  ): Promise<ImageSizes> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate thumbnail
      const thumbnailFilename = `${baseName}-thumbnail${ext}`;
      const thumbnailPath = path.join(uploadsDir, thumbnailFilename);
      await this.resizeImage(
        originalFilePath,
        thumbnailPath,
        this.sizes.thumbnail.width,
        this.sizes.thumbnail.height,
      );

      // Generate medium size
      const mediumFilename = `${baseName}-medium${ext}`;
      const mediumPath = path.join(uploadsDir, mediumFilename);
      await this.resizeImage(
        originalFilePath,
        mediumPath,
        this.sizes.medium.width,
        this.sizes.medium.height,
      );

      // Generate large size
      const largeFilename = `${baseName}-large${ext}`;
      const largePath = path.join(uploadsDir, largeFilename);
      await this.resizeImage(
        originalFilePath,
        largePath,
        this.sizes.large.width,
        this.sizes.large.height,
      );

      this.logger.log(
        `Image processed successfully`,
        JSON.stringify({
          original: filename,
          thumbnail: thumbnailFilename,
          medium: mediumFilename,
          large: largeFilename,
          operation: 'processImage',
        }),
      );

      return {
        thumbnail: thumbnailFilename,
        medium: mediumFilename,
        large: largeFilename,
        original: filename,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to process image`,
        JSON.stringify({
          filename,
          error: error.message,
          operation: 'processImage',
        }),
      );
      throw error;
    }
  }

  /**
   * Resize image to specified dimensions while maintaining aspect ratio
   * @param inputPath Path to input image
   * @param outputPath Path to save resized image
   * @param width Target width
   * @param height Target height
   */
  private async resizeImage(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
  ): Promise<void> {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover', // Crop to fill the dimensions
        position: 'center',
      })
      .jpeg({ quality: 85 }) // Optimize JPEG quality
      .png({ compressionLevel: 8 }) // Optimize PNG compression
      .webp({ quality: 85 }) // Optimize WebP quality
      .toFile(outputPath);
  }

  /**
   * Delete all image sizes for a given filename
   * @param filename Base filename
   */
  async deleteImageSizes(filename: string): Promise<void> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);

      const filesToDelete = [
        filename, // original
        `${baseName}-thumbnail${ext}`,
        `${baseName}-medium${ext}`,
        `${baseName}-large${ext}`,
      ];

      for (const file of filesToDelete) {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error: any) {
            this.logger.error(
              `Failed to delete file`,
              JSON.stringify({
                file,
                error: error.message,
                operation: 'deleteImageSizes',
              }),
            );
          }
        }
      }

      this.logger.log(
        `Image sizes deleted`,
        JSON.stringify({
          filename,
          operation: 'deleteImageSizes',
        }),
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to delete image sizes`,
        JSON.stringify({
          filename,
          error: error.message,
          operation: 'deleteImageSizes',
        }),
      );
      throw error;
    }
  }
}
