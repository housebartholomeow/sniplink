import crypto from 'crypto';

// Generates a secure, random Base62 string in memory
export function generateShortCode(length: number = 6): string {
  const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    // crypto.randomInt ensures cryptographically secure randomness
    const randomIndex = crypto.randomInt(0, ALPHABET.length); 
    result += ALPHABET[randomIndex];
  }
  return result;
}