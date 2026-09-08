export function encode(text: string): string {
  return btoa(decodeURIComponent(encodeURIComponent(text)));
}

export function decode(b64: string): string {
  return decodeURIComponent(encodeURIComponent(atob(b64)));
}

export async function hashValue(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const cryptoBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(cryptoBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
