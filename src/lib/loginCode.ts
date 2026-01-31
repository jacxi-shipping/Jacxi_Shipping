/**
 * Generates a random 8-character alphanumeric login code
 * Only uses uppercase letters and numbers to avoid confusion (no O/0, I/1/l)
 */
export function generateLoginCode(): string {
  // Exclude confusing characters: O, 0, I, 1, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

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
