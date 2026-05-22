/**
 * Authentication Error Mapping Utility
 * Maps Better Auth error codes to user-friendly messages
 */

export interface AuthError {
  message: string;
  field?: 'email' | 'password' | 'name' | 'general';
  type: 'error' | 'warning' | 'info';
}

/**
 * Maps Better Auth error responses to user-friendly error messages
 */
type AuthErrorShape = { error?: string; message?: string; code?: string } | Error | string | null | undefined;

export function mapAuthError(error: AuthErrorShape): AuthError {
  // Handle network errors
  if (!error || (typeof error === 'object' && 'message' in error && error.message === 'Failed to fetch')) {
    return {
      message: 'Connection failed. Please check your internet and try again.',
      field: 'general',
      type: 'error',
    };
  }

  // Extract error message from various error formats
  const obj = typeof error === 'object' ? error : null;
  const errorMessage = obj && 'error' in obj && obj.error ? obj.error
    : obj && 'message' in obj && obj.message ? obj.message
    : String(error);
  const errorCode = obj && 'code' in obj ? obj.code : undefined;

  // Map specific error codes/messages to user-friendly text
  const errorMap: Record<string, AuthError> = {
    // Email-related errors
    'email-already-exists': {
      message: 'This email is already registered. Try logging in instead.',
      field: 'email',
      type: 'error',
    },
    'invalid-email': {
      message: 'Please enter a valid email address.',
      field: 'email',
      type: 'error',
    },
    'email-not-found': {
      message: 'No account found with this email address.',
      field: 'email',
      type: 'error',
    },
    
    // Password-related errors
    'invalid-password': {
      message: 'Invalid email or password. Please try again.',
      field: 'general', // Don't specify which field for security
      type: 'error',
    },
    'weak-password': {
      message: 'Password is too weak. Use at least 8 characters with numbers and symbols.',
      field: 'password',
      type: 'error',
    },
    'password-too-short': {
      message: 'Password must be at least 8 characters long.',
      field: 'password',
      type: 'error',
    },
    
    // Verification errors
    'email-not-verified': {
      message: 'Please verify your email address before logging in.',
      field: 'general',
      type: 'warning',
    },
    'invalid-verification-token': {
      message: 'This verification link is invalid or has expired.',
      field: 'general',
      type: 'error',
    },
    
    // Rate limiting
    'too-many-requests': {
      message: 'Too many attempts. Please wait a few minutes and try again.',
      field: 'general',
      type: 'error',
    },
    
    // Generic auth errors
    'unauthorized': {
      message: 'Invalid email or password. Please try again.',
      field: 'general',
      type: 'error',
    },
    'user-not-found': {
      message: 'Invalid email or password. Please try again.',
      field: 'general',
      type: 'error',
    },
  };

  // Check for exact matches
  if (errorCode && errorMap[errorCode]) {
    return errorMap[errorCode];
  }

  // Check for message matches (case-insensitive)
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('email') && lowerMessage.includes('already')) {
    return errorMap['email-already-exists'];
  }
  
  if (lowerMessage.includes('invalid') && lowerMessage.includes('email')) {
    return errorMap['invalid-email'];
  }
  
  if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('short'))) {
    return errorMap['weak-password'];
  }
  
  if (lowerMessage.includes('invalid') && (lowerMessage.includes('credentials') || lowerMessage.includes('password'))) {
    return errorMap['invalid-password'];
  }
  
  if (lowerMessage.includes('not found')) {
    return errorMap['user-not-found'];
  }
  
  if (lowerMessage.includes('too many') || lowerMessage.includes('rate limit')) {
    return errorMap['too-many-requests'];
  }
  
  if (lowerMessage.includes('verification') || lowerMessage.includes('verify')) {
    return errorMap['email-not-verified'];
  }

  // Default fallback error
  return {
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    field: 'general',
    type: 'error',
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  
  return null;
}

/**
 * Validates name field
 */
export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }
  
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  
  return null;
}

/**
 * Gets password strength level (0-3)
 * 0 = very weak, 1 = weak, 2 = medium, 3 = strong
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  // Cap at 3
  return Math.min(strength, 3);
}

/**
 * Gets password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Medium', 'Strong'];
  return labels[strength] || 'Very Weak';
}

/**
 * Gets password strength color
 */
export function getPasswordStrengthColor(strength: number): string {
  const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];
  return colors[strength] || colors[0];
}
