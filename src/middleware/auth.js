import crypto from 'node:crypto';

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireApiToken(expectedToken) {
  return (request, response, next) => {
    const header = request.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token || !safeEqual(token, expectedToken)) {
      return response.status(401).json({ error: 'unauthorized' });
    }

    return next();
  };
}
