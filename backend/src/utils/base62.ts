const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length;

export function encodeId(id: number): string {
  if (id === 0) return ALPHABET[0];
  
  let shortString = "";
  let num = id;
  
  while (num > 0) {
    shortString = ALPHABET[num % BASE] + shortString;
    num = Math.floor(num / BASE);
  }
  
  return shortString;
}