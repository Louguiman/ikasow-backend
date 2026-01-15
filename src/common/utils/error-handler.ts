import {
  HttpException,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * Centralized error handling utility for consistent error transformation
 * across all services in the application.
 */
export class ErrorHandler {
  private static readonly logger = new Logger('ErrorHandler');

  /**
   * Handle and transform errors into appropriate HTTP exceptions
   * @param error - The error to handle
   * @param context - Context information (e.g., service name, method name)
   * @param metadata - Additional context metadata (userId, agencyId, etc.)
   * @throws HttpException - Appropriate HTTP exception based on error type
   */
  static handle(error: any, context: string, metadata?: Record<string, any>): never {
    // If it's already an HTTP exception, just rethrow it
    if (error instanceof HttpException) {
      // Log HTTP exceptions with context
      this.logger.warn(
        `HTTP Exception in ${context}: ${error.message}`,
        JSON.stringify({ ...metadata, statusCode: error.getStatus() }),
      );
      throw error;
    }

    // Handle TypeORM QueryFailedError (database errors)
    if (error instanceof QueryFailedError) {
      return this.handleDatabaseError(error, context, metadata);
    }

    // Handle generic errors
    if (error instanceof Error) {
      this.logger.error(
        `Unexpected error in ${context}: ${error.message}`,
        error.stack,
        JSON.stringify(metadata),
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred. Please try again later.',
      );
    }

    // Handle unknown error types
    this.logger.error(
      `Unknown error type in ${context}`,
      JSON.stringify({ error, ...metadata }),
    );
    throw new InternalServerErrorException(
      'An unexpected error occurred. Please try again later.',
    );
  }

  /**
   * Handle database-specific errors
   * @param error - The QueryFailedError from TypeORM
   * @param context - Context information
   * @param metadata - Additional context metadata
   * @throws HttpException - Appropriate HTTP exception based on database error code
   */
  private static handleDatabaseError(
    error: QueryFailedError,
    context: string,
    metadata?: Record<string, any>,
  ): never {
    const driverError = error.driverError as any;
    const errorCode = driverError?.code;

    const logMetadata = JSON.stringify({ ...metadata, errorCode });

    switch (errorCode) {
      case '23505': // Unique violation
        this.logger.warn(
          `Unique constraint violation in ${context}: ${error.message}`,
          logMetadata,
        );
        throw new ConflictException(
          'A resource with this information already exists.',
        );

      case '23503': // Foreign key violation
        this.logger.warn(
          `Foreign key constraint violation in ${context}: ${error.message}`,
          logMetadata,
        );
        throw new BadRequestException(
          'The referenced resource does not exist or cannot be used.',
        );

      case '23502': // Not null violation
        this.logger.warn(
          `Not null constraint violation in ${context}: ${error.message}`,
          logMetadata,
        );
        throw new BadRequestException(
          'Required field is missing or null.',
        );

      case '23514': // Check constraint violation
        this.logger.warn(
          `Check constraint violation in ${context}: ${error.message}`,
          logMetadata,
        );
        throw new BadRequestException(
          'The provided data violates database constraints.',
        );

      case '22P02': // Invalid text representation
        this.logger.warn(
          `Invalid data format in ${context}: ${error.message}`,
          logMetadata,
        );
        throw new BadRequestException(
          'Invalid data format provided.',
        );

      default:
        // Log the full error for unknown database errors
        this.logger.error(
          `Database error in ${context} (code: ${errorCode}): ${error.message}`,
          error.stack,
          logMetadata,
        );
        throw new InternalServerErrorException(
          'A database error occurred. Please try again later.',
        );
    }
  }

  /**
   * Wrap an async operation with error handling
   * @param operation - The async operation to execute
   * @param context - Context information for error logging
   * @param metadata - Additional context metadata
   * @returns The result of the operation
   * @throws HttpException - Appropriate HTTP exception if operation fails
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: string,
    metadata?: Record<string, any>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return this.handle(error, context, metadata);
    }
  }

  /**
   * Wrap a synchronous operation with error handling
   * @param operation - The synchronous operation to execute
   * @param context - Context information for error logging
   * @param metadata - Additional context metadata
   * @returns The result of the operation
   * @throws HttpException - Appropriate HTTP exception if operation fails
   */
  static wrap<T>(operation: () => T, context: string, metadata?: Record<string, any>): T {
    try {
      return operation();
    } catch (error) {
      return this.handle(error, context, metadata);
    }
  }
}
