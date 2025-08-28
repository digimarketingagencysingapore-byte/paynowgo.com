import { useState, useEffect } from 'react';
import { AdminLoginForm } from '../components/auth/AdminLoginForm';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminUsersDB } from '../lib/admin-database';
import { authHelpers } from '../lib/supabase';
import type { AuthUser } from '@/@types';

export function AdminLogin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    checkAuthState();

    // Listen for auth state changes
    const { data: { subscription } } = authHelpers.onAuthStateChange(async (user) => {
      if (user && user.profile?.role === 'admin') {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription?.unsubscribe?.();
  }, []);

  const checkAuthState = async () => {
    setIsLoading(true);
    try {
      // Check if user is already authenticated and is admin
      const user = await AdminUsersDB.getCurrentUser();
      
      if (user) {
        console.log('[ADMIN_LOGIN] Found authenticated admin user:', user.id);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        console.log('[ADMIN_LOGIN] No authenticated admin user found');
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[ADMIN_LOGIN] Error checking auth state:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && currentUser) {
    return <AdminDashboard currentUser={currentUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m4 0h1" />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          PayNowGo Admin
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Super Admin Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AdminLoginForm onLoginSuccess={() => checkAuthState()} />
        </div>
      </div>
    </div>
  );
}