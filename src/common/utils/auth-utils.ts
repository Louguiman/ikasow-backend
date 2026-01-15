import * as bcrypt from 'bcrypt';

/**
 * Utility functions for authentication and user management
 */
export class AuthUtils {
  /**
   * Hash a password using bcrypt with 10 rounds
   * @param password - The plain text password
   * @returns The hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password - The plain text password
   * @param hashedPassword - The hashed password
   * @returns True if passwords match, false otherwise
   */
  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Remove password field from user object
   * @param user - The user object with password
   * @returns The user object without password
   */
  static removePassword<T extends { password?: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Remove password field from array of user objects
   * @param users - Array of user objects with passwords
   * @returns Array of user objects without passwords
   */
  static removePasswordFromArray<T extends { password?: string }>(
    users: T[],
  ): Omit<T, 'password'>[] {
    return users.map((user) => this.removePassword(user));
  }
}
