import React from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import type { Page } from '../../App';

interface HeaderProps {
  onMenuClick: () => void;
  currentPage: Page;
  onLogout: () => void;
}

const pageLabels = {
  dashboard: 'Dashboard',
  pos: 'POS System',
  items: 'Items Management',
  orders: 'Orders & Payments',
  settings: 'Admin Settings',
  reports: 'Reports & Analytics',
};

export function Header({ onMenuClick, currentPage, onLogout }: HeaderProps) {
  const [merchantData, setMerchantData] = React.useState<any>(null);

  // Load merchant data and listen for updates
  React.useEffect(() => {
    const loadMerchantData = () => {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const merchant = JSON.parse(userData);
          console.log('[HEADER] Loading merchant data:', {
            id: merchant.id,
            businessName: merchant.businessName,
            uen: merchant.uen,
            mobile: merchant.mobile
          });
          setMerchantData(merchant);
        } catch (error) {
          console.error('[HEADER] Error parsing merchant data:', error);
          setMerchantData(null);
        }
      } else {
        setMerchantData(null);
      }
    };

    // Load initial data
    loadMerchantData();

    // Listen for merchant data updates
    const handleMerchantUpdate = (event: CustomEvent) => {
      console.log('[HEADER] Merchant data updated via event:', event.detail);
      setMerchantData(event.detail);
    };

    window.addEventListener('merchantDataUpdated', handleMerchantUpdate as EventListener);

    return () => {
      window.removeEventListener('merchantDataUpdated', handleMerchantUpdate as EventListener);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {pageLabels[currentPage]}
            </h1>
            <p className="text-sm text-gray-500 hidden sm:block">
              Singapore PayNow POS System
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {merchantData?.businessName || 'Unknown Business'}
              </p>
              <p className="text-xs text-gray-500">
                {merchantData?.uen ? `UEN: ${merchantData.uen}` : 
                 merchantData?.mobile ? `Mobile: ${merchantData.mobile}` : 
                 'PayNow not configured'}
              </p>
            </div>
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}