import React from 'react';
import { LandingPage } from './pages/LandingPage';
import { AdminLogin } from './pages/AdminLogin';
import { DisplayLogin } from './pages/DisplayLogin';
import { MerchantLogin } from './pages/MerchantLogin';
import { Dashboard } from './components/pages/Dashboard';
import { POSSystem } from './components/pages/POSSystem';
import { ItemsList } from './components/items/ItemsList';
import { Orders } from './components/pages/Orders';
import { Reports } from './components/pages/Reports';
import { AdminSettings } from './components/pages/AdminSettings';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { OrderProvider } from './contexts/OrderContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { SettingsProvider } from './contexts/SettingsContext';

export type Page = 'dashboard' | 'pos' | 'items' | 'orders' | 'reports' | 'settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userType, setUserType] = React.useState<'merchant' | 'admin' | null>(null);
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const path = window.location.pathname;
  const hostname = window.location.hostname;
  
  // Get subdomain for production routing
  const getSubdomain = () => {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  };
  
  const subdomain = getSubdomain();

  // Check authentication on mount
  React.useEffect(() => {
    console.log('[APP] Checking authentication on mount...');
    console.log('[APP] Environment:', window.location.hostname);
    
    // Force re-initialization of merchants data
    const merchantsData = localStorage.getItem('paynowgo_merchants');
    console.log('[APP] Current merchants data:', merchantsData ? 'EXISTS' : 'NOT_EXISTS');
    
    // Clear and reinitialize merchants data to ensure correct credentials
    localStorage.removeItem('paynowgo_merchants');
    console.log('[APP] Cleared merchants data for fresh initialization');
    
    const token = localStorage.getItem('auth_token');
    const adminToken = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('[APP] Auth check:', { hasToken: !!token, hasAdminToken: !!adminToken, hasUserData: !!userData });
    
    if (userData) {
      try {
        const merchant = JSON.parse(userData);
        console.log('[APP] Current merchant:', merchant.id, merchant.email, merchant.businessName);
      } catch (error) {
        console.error('[APP] Error parsing user data:', error);
      }
    }
    
    if (token) {
      console.log('[APP] Found merchant token, setting authenticated');
      setIsAuthenticated(true);
      setUserType('merchant');
    } else if (adminToken) {
      console.log('[APP] Found admin token, setting authenticated');
      setIsAuthenticated(true);
      setUserType('admin');
    } else {
      console.log('[APP] No valid tokens found');
    }
    
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    console.log('[APP] Login success callback triggered');
    setIsAuthenticated(true);
    setUserType('merchant');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setIsAuthenticated(false);
    setUserType(null);
    window.location.href = '/';
  };

  // Render merchant dashboard
  const renderMerchantDashboard = () => (
    <SettingsProvider>
      <OrderProvider>
        <PaymentProvider>
          <div className="flex h-screen bg-gray-50">
            <Sidebar
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header
                onMenuClick={() => setSidebarOpen(true)}
                currentPage={currentPage}
                onLogout={handleLogout}
              />
              <main className="flex-1 overflow-auto">
                {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
                {currentPage === 'pos' && <POSSystem />}
                {currentPage === 'items' && <ItemsList />}
                {currentPage === 'orders' && <Orders />}
                {currentPage === 'reports' && <Reports />}
                {currentPage === 'settings' && <AdminSettings />}
              </main>
            </div>
          </div>
        </PaymentProvider>
      </OrderProvider>
    </SettingsProvider>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Admin routes
  if (subdomain === 'admin' || path === '/admin') {
    return <AdminLogin />;
  }
  
  // Display routes  
  if (subdomain === 'display' || path === '/display') {
    return <DisplayLogin />;
  }
  
  // Merchant routes - only for specific paths and subdomains, NOT main domain
  if (subdomain === 'merchant' || subdomain === 'app' || path === '/merchant' || path === '/app' || path.startsWith('/merchant')) {
    return isAuthenticated && userType === 'merchant' 
      ? renderMerchantDashboard()
      : <MerchantLogin onLoginSuccess={handleLoginSuccess} />;
  }
  
  // Default to landing page for main domain (paynowgo.com) and all other cases
  return <LandingPage />;
}

export default App;