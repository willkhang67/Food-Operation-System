/** Returns the token after `Bearer `, or null if header is missing/malformed. */
export function extractBearer(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
}
