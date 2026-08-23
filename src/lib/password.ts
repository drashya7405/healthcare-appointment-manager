import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Securely hashes a plain-text password using bcrypt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length === 0) {
    throw new Error("Password cannot be empty.");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}
