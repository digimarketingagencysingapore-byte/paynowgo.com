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

// Merchant authentication
export async function authenticateMerchant(email: string, password: string): Promise<MerchantUser | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (error || !merchant) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, merchant.password_hash);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: merchant.id,
    businessName: merchant.business_name,
    email: merchant.email,
    uen: merchant.uen,
    mobile: merchant.mobile,
    status: merchant.status,
    subscriptionPlan: merchant.subscription_plan
  };
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

// Create merchant
export async function createMerchant(data: {
  businessName: string;
  email: string;
  password: string;
  uen?: string;
  mobile?: string;
}): Promise<MerchantUser> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const passwordHash = await hashPassword(data.password);

  const { data: merchant, error } = await supabase
    .from('merchants')
    .insert({
      business_name: data.businessName,
      email: data.email,
      password_hash: passwordHash,
      uen: data.uen,
      mobile: data.mobile,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create merchant: ${error.message}`);
  }

  return {
    id: merchant.id,
    businessName: merchant.business_name,
    email: merchant.email,
    uen: merchant.uen,
    mobile: merchant.mobile,
    status: merchant.status,
    subscriptionPlan: merchant.subscription_plan
  };
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