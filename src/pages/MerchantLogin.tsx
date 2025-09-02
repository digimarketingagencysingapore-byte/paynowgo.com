import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Store, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MerchantLoginProps {
  onLoginSuccess: () => void;
}

export function MerchantLogin({ onLoginSuccess }: MerchantLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== MERCHANT LOGIN START ===');
      console.log('[MERCHANT_LOGIN] Attempting login at:', new Date().toISOString());
      console.log('[MERCHANT_LOGIN] Email:', email);
      console.log('[MERCHANT_LOGIN] Environment:', window.location.hostname);
      
      // Step 1: Authenticate with Supabase Auth
      console.log('[MERCHANT_LOGIN] Step 1: Authenticating with Supabase Auth...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        console.log('[MERCHANT_LOGIN] ❌ Supabase Auth failed:', authError);
        throw new Error('Invalid email or password');
      }
      
      console.log('[MERCHANT_LOGIN] ✅ Supabase Auth successful for user ID:', authData.user.id);
      
      // Step 2: Get user profile to check role
      console.log('[MERCHANT_LOGIN] Step 2: Getting user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError || !profile) {
        console.log('[MERCHANT_LOGIN] ❌ Profile not found:', profileError);
        await supabase.auth.signOut(); // Sign out if profile doesn't exist
        throw new Error('User profile not found. Please contact administrator.');
      }
      
      console.log('[MERCHANT_LOGIN] ✅ Profile found:', profile);
      
      // Step 3: Check if user has merchant role (should be 'user' not 'admin')
      if (profile.role === 'admin') {
        console.log('[MERCHANT_LOGIN] ❌ Admin trying to login as merchant');
        await supabase.auth.signOut();
        throw new Error('Admin users should use the admin login page');
      }
      
      // Step 4: Get merchant data linked to this profile
      console.log('[MERCHANT_LOGIN] Step 3: Getting merchant data for profile_id:', profile.id);
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('profile_id', profile.id)
        .limit(1)
        .maybeSingle();
        
      if (merchantError || !merchant) {
        console.log('[MERCHANT_LOGIN] ❌ Merchant data not found:', merchantError);
        await supabase.auth.signOut();
        throw new Error('Merchant account not found. Please contact administrator.');
      }
      
      console.log('[MERCHANT_LOGIN] ✅ Merchant data found:', merchant.business_name);
      
      // Step 5: Check merchant status
      if (merchant.status !== 'active') {
        console.log('[MERCHANT_LOGIN] ❌ Merchant account not active:', merchant.status);
        await supabase.auth.signOut();
        throw new Error(`Account is ${merchant.status}. Please contact administrator.`);
      }
      
      console.log('[MERCHANT_LOGIN] ✅ All checks passed, creating login session...');
      
      // Step 6: Create login session data
      const loginData = {
        user: {
          id: merchant.id,
          profileId: profile.id,
          businessName: merchant.business_name,
          email: authData.user.email,
          fullName: profile.full_name,
          uen: merchant.uen,
          mobile: merchant.mobile,
          address: merchant.address,
          status: merchant.status,
          subscriptionPlan: merchant.subscription_plan,
          subscriptionStartsAt: merchant.subscription_starts_at,
          subscriptionExpiresAt: merchant.subscription_expires_at,
          monthlyRevenue: merchant.monthly_revenue,
          subscriptionLink: merchant.subscription_link,
          createdAt: merchant.created_at,
          updatedAt: merchant.updated_at
        },
        userType: 'merchant',
        authUser: authData.user,
        session: authData.session
      };

      // Authentication now handled entirely by Supabase session
      // No localStorage needed - SettingsContext loads merchant data from session
      
      console.log('[MERCHANT_LOGIN] ✅ Login successful for:', merchant.business_name);
      console.log('[MERCHANT_LOGIN] Session data stored, calling onLoginSuccess');
      console.log('=== MERCHANT LOGIN END (SUCCESS) ===');
      
      onLoginSuccess();
      
    } catch (error) {
      console.log('[MERCHANT_LOGIN] ❌ Login failed:');
      console.error('[MERCHANT_LOGIN] Error details:', error);
      console.log('=== MERCHANT LOGIN END (ERROR) ===');
      
      // Make sure to sign out on any error
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('[MERCHANT_LOGIN] Error signing out:', signOutError);
      }
      
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Store className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          PayNowGo Merchant
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your merchant dashboard
        </p>
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
            <CreditCard className="w-3 h-3" />
            <span>Singapore PayNow POS System</span>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Business Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your business email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <div className="text-sm text-gray-600">
              <p>Need help? Contact support</p>
            </div>
            <div className="text-xs text-gray-500">
              <p>© 2025 PayNowGo. Singapore PayNow POS System.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">PayNow Integration</h3>
            <p className="text-xs text-gray-600 mt-1">Accept payments via Singapore PayNow</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Store className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">POS System</h3>
            <p className="text-xs text-gray-600 mt-1">Complete point-of-sale solution</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
            </div>
            <h3 className="text-sm font-medium text-gray-900">Real-time Reports</h3>
            <p className="text-xs text-gray-600 mt-1">Track sales and analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}