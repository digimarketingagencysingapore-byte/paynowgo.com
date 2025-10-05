import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database, Profile, AuthUser, AuthResponse } from '../../types';

// Bolt automatically provides Supabase credentials via environment variables
// These are injected at build/runtime by the Bolt platform
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
const hasValidSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasValidSupabaseConfig) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Bolt should automatically provide these via environment variables');
  throw new Error('Supabase configuration is required. Please ensure Bolt has properly configured the database.');
}

console.log('✅ Supabase configured:', { url: supabaseUrl?.substring(0, 30) + '...' });

// Client-side Supabase client with auth persistence
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Admin client with service role key for admin operations
export const supabaseAdmin: SupabaseClient<Database> = supabaseServiceRoleKey
  ? createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : supabase;

// Auth Helper Functions
export const authHelpers = {
  // Sign up a new user
  async signUp(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!
        };
        return { user: authUser, error: null };
      }

      return { user: null, error: 'Failed to create user' };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Get user profile
        const profile = await this.getProfile(data.user.id);
        
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          profile: profile || undefined
        };

        return { user: authUser, error: null };
      }

      return { user: null, error: 'Failed to sign in' };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? error.message : null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  },

  // Get current user with profile
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const profile = await this.getProfile(user.id);

      return {
        id: user.id,
        email: user.email!,
        profile: profile || undefined
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Get user profile by ID
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      console.log('[AUTH_HELPERS] Getting profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('[AUTH_HELPERS] Profile query result:', { data, error });

      if (error || !data) {
        console.warn('[AUTH_HELPERS] Profile not found or error:', error);
        return null;
      }

      const profile = {
        id: data.id,
        full_name: data.full_name,
        role: data.role,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      console.log('[AUTH_HELPERS] Profile loaded successfully:', profile);
      return profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating profile:', error);
        return null;
      }

      return {
        id: data.id,
        full_name: data.full_name,
        role: data.role,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return null;
    }
  },

  // Check if user is admin
  async isAdmin(userId?: string): Promise<boolean> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) return false;

      const profile = await this.getProfile(targetUserId);
      return profile?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  // Admin function: Create user and profile (requires service role)
  async adminCreateUser(email: string, password: string, fullName: string, role: 'admin' | 'user' = 'user'): Promise<AuthResponse> {
    console.log('=== AUTH_HELPERS ADMIN_CREATE_USER START ===');
    console.log('[AUTH_HELPERS] Function called at:', new Date().toISOString());
    console.log('[AUTH_HELPERS] Input parameters:', { 
      email, 
      fullName, 
      role,
      passwordLength: password?.length || 0
    });

    // Validate service role key
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    console.log('[AUTH_HELPERS] Service role key exists:', !!serviceKey);
    console.log('[AUTH_HELPERS] Service role key length:', serviceKey?.length || 0);
    console.log('[AUTH_HELPERS] Service role key preview:', serviceKey?.substring(0, 20) + '...');

    try {
      console.log('[AUTH_HELPERS] Creating user with supabaseAdmin client...');
      console.log('[AUTH_HELPERS] User creation payload:', {
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      const userStartTime = Date.now();
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });
      const userCreationTime = Date.now() - userStartTime;

      console.log(`[AUTH_HELPERS] Supabase user creation completed in ${userCreationTime}ms`);
      console.log('[AUTH_HELPERS] Supabase response data:', data);
      console.log('[AUTH_HELPERS] Supabase response error:', error);

      if (error || !data.user) {
        console.log('[AUTH_HELPERS] ❌ USER CREATION FAILED:');
        console.log('[AUTH_HELPERS] Error details:', error);
        console.log('[AUTH_HELPERS] Data received:', data);
        return { user: null, error: error?.message || 'Failed to create user' };
      }

      console.log('[AUTH_HELPERS] ✅ Supabase user created successfully!');
      console.log('[AUTH_HELPERS] Created user ID:', data.user.id);
      console.log('[AUTH_HELPERS] Created user email:', data.user.email);

      console.log('[AUTH_HELPERS] Now creating profile record...');
      console.log('[AUTH_HELPERS] Profile data:', {
        id: data.user.id,
        full_name: fullName,
        role: role
      });

      const profileStartTime = Date.now();
      const { error: profileError, data: profileData } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          role: role
        })
        .select()
        .single();
      const profileCreationTime = Date.now() - profileStartTime;

      console.log(`[AUTH_HELPERS] Profile creation completed in ${profileCreationTime}ms`);
      console.log('[AUTH_HELPERS] Profile creation result:', { profileData, profileError });

      if (profileError) {
        console.log('[AUTH_HELPERS] ❌ PROFILE CREATION FAILED:');
        console.error('[AUTH_HELPERS] Profile error details:', profileError);
        console.log('[AUTH_HELPERS] Profile error code:', profileError.code);
        console.log('[AUTH_HELPERS] Profile error message:', profileError.message);
        // Don't fail completely if profile creation fails - user was created
      } else {
        console.log('[AUTH_HELPERS] ✅ Profile created successfully:', profileData);
      }

      console.log('[AUTH_HELPERS] Building final AuthUser response...');
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        profile: {
          id: data.user.id,
          full_name: fullName,
          role: role,
          created_at: profileData?.created_at || new Date().toISOString(),
          updated_at: profileData?.updated_at || new Date().toISOString()
        }
      };

      console.log('[AUTH_HELPERS] Final AuthUser object:', authUser);
      console.log('=== AUTH_HELPERS ADMIN_CREATE_USER END (SUCCESS) ===');
      return { user: authUser, error: null };

    } catch (error) {
      console.log('[AUTH_HELPERS] ❌ EXCEPTION in adminCreateUser:');
      console.error('[AUTH_HELPERS] Exception details:', error);
      console.log('[AUTH_HELPERS] Exception type:', typeof error);
      console.log('[AUTH_HELPERS] Exception constructor:', error.constructor.name);
      
      if (error instanceof Error) {
        console.log('[AUTH_HELPERS] Exception message:', error.message);
        console.log('[AUTH_HELPERS] Exception stack:', error.stack);
      }
      
      console.log('=== AUTH_HELPERS ADMIN_CREATE_USER END (ERROR) ===');
      return { user: null, error: error instanceof Error ? error.message : 'Failed to create user' };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await this.getProfile(session.user.id);
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          profile: profile || undefined
        };
        callback(authUser);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  }
};

// Create authenticated Supabase client (legacy support)
export function getSupabaseClient(token?: string) {
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey
        }
      }
    });
  }
  return supabase;
}

// Database types
export interface DatabaseItem {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  price_cents: number;
  active: boolean;
  sku: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCategory {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOrder {
  id: string;
  tenant_id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  payload?: string;
  qr_svg?: string;
  expires_at?: string;
  created_at: string;
}

// Helper function to set tenant context
export async function setTenantContext(tenantId: string) {
  // Tenant context is handled by RLS policies in the database
  console.log('[SUPABASE] Using tenant context:', tenantId);
}

// Default tenant ID for demo
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Supabase schema is enabled only if valid config exists
export const isSupabaseSchemaEnabled = hasValidSupabaseConfig;

// Export config status for other modules
export const supabaseConfigStatus = {
  isConfigured: hasValidSupabaseConfig,
  url: hasValidSupabaseConfig ? supabaseUrl : null
};