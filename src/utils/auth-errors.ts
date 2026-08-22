/**
 * Transforms unknown authentication errors into clear, user-friendly messages.
 */
export function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    if (/cancel/i.test(error.message)) {
      return "Sign-in was cancelled. Try again or continue without an account.";
    }
    if (/network/i.test(error.message)) {
      return "Network error during sign-in. Please check your internet connection and try again.";
    }
    if (/unsupported|unavailable/i.test(error.message)) {
      return "This sign-in method is not supported or unavailable on this device.";
    }
    return error.message;
  }
  return "Sign-in could not be completed. Try again or continue without an account.";
}
