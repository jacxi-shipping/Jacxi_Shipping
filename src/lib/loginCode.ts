/**
 * Validates a login code format
 */
export function isValidLoginCode(code: string): boolean {
  if (!code || code.length !== 8) {
    return false;
  }
  
  // Check if it only contains valid characters
  const validChars = /^[A-Z0-9]+$/;
  return validChars.test(code.toUpperCase());
}

/**
 * Formats a login code for display (adds spaces for readability)
 * Example: "ABCD1234" -> "ABCD 1234"
 */
export function formatLoginCode(code: string): string {
  if (!code || code.length !== 8) {
    return code;
  }
  
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}
