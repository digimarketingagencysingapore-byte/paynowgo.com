import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const JWT_SECRET = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production');

export interface MerchantUser {
  id: string;
  businessName: string;
  email: string;
  uen?: string;
  mobile?: string;
  status: 'active' | 'suspended' | 'pending';
  subscriptionPlan: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'support';
}

export interface SessionPayload {
  userId: string;
  userType: 'merchant' | 'admin';
  email: string;
  iat?: number;
  exp?: number;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT functions
export async function signToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Merchant authentication - DEPRECATED: Use Supabase Auth instead
// This function is kept for backward compatibility but should not be used
export async function authenticateMerchant(email: string, password: string): Promise<MerchantUser | null> {
  console.warn('⚠️ authenticateMerchant() is deprecated - use Supabase Auth instead');
  
  // This function no longer works since password_hash is no longer used
  // All authentication should go through Supabase Auth
  return null;
}

// Admin authentication
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !admin) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, admin.password_hash);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    role: admin.role
  };
}

// Create merchant - DEPRECATED: Use MerchantsDB.create() from admin-database.ts instead
// This function is kept for backward compatibility but should not be used
export async function createMerchant(_data: {
  businessName: string;
  email: string;
  password: string;
  uen?: string;
  mobile?: string;
}): Promise<MerchantUser> {
  console.warn('⚠️ createMerchant() is deprecated - use MerchantsDB.create() from admin-database.ts instead');
  
  throw new Error('createMerchant() is deprecated. Use MerchantsDB.create() from admin-database.ts which properly creates Supabase Auth users.');
}

// Get all merchants (admin only)
export async function getAllMerchants(): Promise<MerchantUser[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch merchants: ${error.message}`);
  }

  return merchants.map(merchant => ({
    id: merchant.id,
    businessName: merchant.business_name,
    email: merchant.email,
    uen: merchant.uen,
    mobile: merchant.mobile,
    status: merchant.status,
    subscriptionPlan: merchant.subscription_plan
  }));
}

// Update merchant status (admin only)
export async function updateMerchantStatus(merchantId: string, status: 'active' | 'suspended' | 'pending'): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from('merchants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to update merchant status: ${error.message}`);
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  return authHeader.substring(7);
}