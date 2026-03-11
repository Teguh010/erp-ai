import { Request } from 'express';

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  /** User email */
  email: string;
  /** User ID (subject) */
  sub: string;
  /** User role name */
  role: string;
  /** Token issued at timestamp */
  iat?: number;
  /** Token expiration timestamp */
  exp?: number;
}

/**
 * Authenticated user attached to request
 */
export interface AuthenticatedUser {
  /** User ID */
  sub: string;
  /** User ID (alias) */
  userId: string;
  /** User email */
  email: string;
  /** User role name */
  role: string;
}

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * User entity without sensitive data
 */
export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

/**
 * User with role relation
 */
export interface UserWithRole extends SafeUser {
  role: {
    id: string;
    name: string;
    permissions: unknown;
  };
}
