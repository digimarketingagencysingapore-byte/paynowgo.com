import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currentMerchant, setCurrentMerchant] = useState<any>(null);
  
  // Initialize from logged-in merchant data
  React.useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const merchant = JSON.parse(userData);
        console.log('[SETTINGS_CONTEXT] Loading merchant data:', merchant);
        setCurrentMerchant(merchant);
      } catch (error) {
        console.error('[SETTINGS_CONTEXT] Error parsing user data:', error);
      }
    }
  }, []);
  
  // Derive settings from current merchant or use defaults
  const businessType = currentMerchant?.uen ? 'uen' : 'mobile';
  const uen = currentMerchant?.uen || '';
  const mobile = currentMerchant?.mobile ? currentMerchant.mobile.replace(/^\+65/, '') : '';
  const businessName = currentMerchant?.businessName || '';
  const address = currentMerchant?.address || '';
  
  const setBusinessType = (type: 'mobile' | 'uen') => {
    // Update merchant data
    if (currentMerchant) {
      const updatedMerchant = { ...currentMerchant };
      localStorage.setItem('user_data', JSON.stringify(updatedMerchant));
      setCurrentMerchant(updatedMerchant);
    }
  };
  
  const setUEN = (newUen: string) => {
    if (currentMerchant) {
      const updatedMerchant = { ...currentMerchant, uen: newUen };
      localStorage.setItem('user_data', JSON.stringify(updatedMerchant));
      setCurrentMerchant(updatedMerchant);
    }
  };
  
  const setMobile = (newMobile: string) => {
    if (currentMerchant) {
      const updatedMerchant = { ...currentMerchant, mobile: newMobile.startsWith('+65') ? newMobile : `+65${newMobile}` };
      localStorage.setItem('user_data', JSON.stringify(updatedMerchant));
      setCurrentMerchant(updatedMerchant);
    }
  };
  
  const setBusinessName = (name: string) => {
    if (currentMerchant) {
      const updatedMerchant = { ...currentMerchant, businessName: name };
      localStorage.setItem('user_data', JSON.stringify(updatedMerchant));
      setCurrentMerchant(updatedMerchant);
    }
  };
  
  const setAddress = (newAddress: string) => {
    if (currentMerchant) {
      const updatedMerchant = { ...currentMerchant, address: newAddress };
      localStorage.setItem('user_data', JSON.stringify(updatedMerchant));
      setCurrentMerchant(updatedMerchant);
    }
  };
  
  const [autoReference, setAutoReference] = useState(true);
  const [referencePrefix, setReferencePrefix] = useState('TBL');
  const [notifications, setNotifications] = useState(true);

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
      setCurrentMerchant
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