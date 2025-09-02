import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  businessType: 'mobile' | 'uen';
  setBusinessType: (type: 'mobile' | 'uen') => void;
  uen: string;
  setUEN: (uen: string) => void;
  mobile: string;
  setMobile: (mobile: string) => void;
  businessName: string;
  setBusinessName: (name: string) => void;
  address: string;
  setAddress: (address: string) => void;
  autoReference: boolean;
  setAutoReference: (auto: boolean) => void;
  referencePrefix: string;
  setReferencePrefix: (prefix: string) => void;
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  currentMerchant: any;
  setCurrentMerchant: (merchant: any) => void;
  reloadMerchantData: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currentMerchant, setCurrentMerchant] = useState<any>(null);
  
  // Initialize from Supabase session and merchant data
  React.useEffect(() => {
    loadMerchantFromSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SETTINGS_CONTEXT] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadMerchantFromSession();
      } else if (event === 'SIGNED_OUT') {
        setCurrentMerchant(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadMerchantFromSession = async () => {
    try {
      console.log('[SETTINGS_CONTEXT] Loading merchant from Supabase session...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('[SETTINGS_CONTEXT] No authenticated user found');
        setCurrentMerchant(null);
        return;
      }
      
      // Get merchant data linked to this user's profile
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('profile_id', user.id)
        .limit(1)
        .single();
        
      if (merchantError || !merchant) {
        console.warn('[SETTINGS_CONTEXT] No merchant found for user:', merchantError);
        setCurrentMerchant(null);
        return;
      }
      
      // Convert to expected format
      const merchantData = {
        id: merchant.id,
        businessName: merchant.business_name,
        email: user.email,
        uen: merchant.uen,
        mobile: merchant.mobile,
        address: merchant.address,
        status: merchant.status,
        subscriptionPlan: merchant.subscription_plan,
        monthlyRevenue: merchant.monthly_revenue,
        subscriptionLink: merchant.subscription_link
      };
      
      console.log('[SETTINGS_CONTEXT] ===== MERCHANT DATA LOADED =====');
      console.log('[SETTINGS_CONTEXT] Raw merchant from DB:', merchant);
      console.log('[SETTINGS_CONTEXT] Processed merchant data:', {
        businessName: merchantData.businessName,
        uen: `"${merchantData.uen}"`,
        uenLength: merchantData.uen?.length,
        mobile: `"${merchantData.mobile}"`,
        address: merchantData.address,
        id: merchantData.id
      });
      console.log('[SETTINGS_CONTEXT] ===== END MERCHANT DATA =====');
      setCurrentMerchant(merchantData);
      
      // Set initial business type selection based on available payment methods
      // Prefer UEN if available, fallback to mobile
      if (merchantData.uen && merchantData.uen.trim()) {
        setSelectedBusinessType('uen');
      } else if (merchantData.mobile && merchantData.mobile.trim()) {
        setSelectedBusinessType('mobile');
      }
      
      // Merchant data now stored exclusively in Supabase
      
    } catch (error) {
      console.error('[SETTINGS_CONTEXT] Error loading merchant from session:', error);
      setCurrentMerchant(null);
    }
  };
  
  // User selection state for business type (independent of merchant data)
  const [selectedBusinessType, setSelectedBusinessType] = useState<'mobile' | 'uen'>('uen');
  
  // Derive settings from current merchant or use defaults
  const businessType = selectedBusinessType; // Use user selection instead of auto-deriving
  const uen = currentMerchant?.uen || '';
  const mobile = currentMerchant?.mobile ? currentMerchant.mobile.replace(/^\+65/, '') : '';
  const businessName = currentMerchant?.businessName || '';
  const address = currentMerchant?.address || '';
  
  // Debug logging for PayNow values
  console.log('[SETTINGS_CONTEXT] Current PayNow values:', {
    businessType,
    uen: uen || '(empty)',
    mobile: mobile || '(empty)', 
    rawMobile: currentMerchant?.mobile || '(null)',
    hasCurrentMerchant: !!currentMerchant
  });
  
  const updateMerchantInDatabase = async (updates: any) => {
    if (!currentMerchant) return;
    
    try {
      console.log('[SETTINGS_CONTEXT] Updating merchant in database:', updates);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }
      
      // Update merchant record
      const { error } = await supabase
        .from('merchants')
        .update({
          business_name: updates.businessName,
          uen: updates.uen,
          mobile: updates.mobile,
          address: updates.address,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', user.id);
      
      if (error) {
        console.error('[SETTINGS_CONTEXT] Database update failed:', error);
        throw error;
      }
      
      console.log('[SETTINGS_CONTEXT] Merchant updated in database successfully');
      
      // Update local state
      const updatedMerchant = { ...currentMerchant, ...updates };
      setCurrentMerchant(updatedMerchant);
      
    } catch (error) {
      console.error('[SETTINGS_CONTEXT] Error updating merchant:', error);
      // Still update local state for better UX, but don't persist to localStorage
      const updatedMerchant = { ...currentMerchant, ...updates };
      setCurrentMerchant(updatedMerchant);
    }
  };

  const setBusinessType = (type: 'mobile' | 'uen') => {
    console.log('[SETTINGS_CONTEXT] Business type preference set to:', type);
    setSelectedBusinessType(type);
  };
  
  const setUEN = async (newUen: string) => {
    if (currentMerchant) {
      await updateMerchantInDatabase({ ...currentMerchant, uen: newUen });
    }
  };
  
  const setMobile = async (newMobile: string) => {
    if (currentMerchant) {
      const formattedMobile = newMobile.startsWith('+65') ? newMobile : `+65${newMobile}`;
      await updateMerchantInDatabase({ ...currentMerchant, mobile: formattedMobile });
    }
  };
  
  const setBusinessName = async (name: string) => {
    if (currentMerchant) {
      await updateMerchantInDatabase({ ...currentMerchant, businessName: name });
    }
  };
  
  const setAddress = async (newAddress: string) => {
    if (currentMerchant) {
      await updateMerchantInDatabase({ ...currentMerchant, address: newAddress });
    }
  };
  
  const [autoReference, setAutoReference] = useState(true);
  const [referencePrefix, setReferencePrefix] = useState('TBL');
  const [notifications, setNotifications] = useState(true);

  // Force reload merchant data from database
  const reloadMerchantData = async () => {
    console.log('[SETTINGS_CONTEXT] Force reloading merchant data...');
    await loadMerchantFromSession();
  };

  return (
    <SettingsContext.Provider value={{
      businessType,
      setBusinessType,
      uen,
      setUEN,
      mobile,
      setMobile,
      businessName,
      setBusinessName,
      address,
      setAddress,
      autoReference,
      setAutoReference,
      referencePrefix,
      setReferencePrefix,
      notifications,
      setNotifications,
      currentMerchant,
      setCurrentMerchant,
      reloadMerchantData
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}