/**
 * Escapes special regex characters in a string to prevent NoSQL injection and ReDoS attacks.
 * This function sanitizes user input before using it in MongoDB $regex queries.
 * 
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex patterns
 */
export const escapeRegex = (str: string): string => {
  if (typeof str !== 'string') {
    return '';
  }
  
  // Escape special regex characters: . * + ? ^ $ { } ( ) | [ ] \
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

