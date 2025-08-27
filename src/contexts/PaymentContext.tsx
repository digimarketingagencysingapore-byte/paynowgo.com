import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PaymentStatus {
  id: string;
  reference: string;
  status: 'pending' | 'paid' | 'failed';
  amount: number;
  timestamp: string;
}

interface PaymentContextType {
  payments: PaymentStatus[];
  updatePaymentStatus: (reference: string, status: 'pending' | 'paid' | 'failed') => void;
  addPayment: (payment: Omit<PaymentStatus, 'id' | 'timestamp'>) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<PaymentStatus[]>([]);

  const addPayment = (payment: Omit<PaymentStatus, 'id' | 'timestamp'>) => {
    const newPayment: PaymentStatus = {
      ...payment,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString()
    };
    setPayments(prev => [...prev, newPayment]);

    // Simulate payment status update after 3-8 seconds
    const delay = Math.random() * 5000 + 3000;
    setTimeout(() => {
      updatePaymentStatus(payment.reference, Math.random() > 0.1 ? 'paid' : 'failed');
    }, delay);
  };

  const updatePaymentStatus = (reference: string, status: 'pending' | 'paid' | 'failed') => {
    setPayments(prev =>
      prev.map(payment =>
        payment.reference === reference
          ? { ...payment, status }
          : payment
      )
    );
  };

  return (
    <PaymentContext.Provider value={{ payments, updatePaymentStatus, addPayment }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}