import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface DisplayTokenPayload {
  device_id: string;
  tenant_id: string;
  device_name: string;
  iat?: number;
  exp?: number;
}

export function signDisplayToken(payload: Omit<DisplayTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'paynowgo'
  });
}

export function verifyDisplayToken(token: string): DisplayTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'paynowgo'
    }) as DisplayTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractTokenFromHeader(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  return authHeader.substring(7);
}