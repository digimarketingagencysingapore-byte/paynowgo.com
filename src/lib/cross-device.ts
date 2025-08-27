/**
 * Cross-device communication for QR code display
 * Uses URL parameters and periodic refresh for cross-device sync
 */

export interface QRData {
  orderId: string;
  qrSvg: string;
  amount: number;
  reference: string;
  expiresAt: string;
  timestamp: number;
}

const QR_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export class CrossDeviceQR {
  private static instance: CrossDeviceQR;
  private listeners: Set<(data: QRData | null) => void> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastDataHash: string = '';

  static getInstance(): CrossDeviceQR {
    if (!CrossDeviceQR.instance) {
      CrossDeviceQR.instance = new CrossDeviceQR();
    }
    return CrossDeviceQR.instance;
  }

  /**
   * Broadcast QR data (from POS system)
   */
  broadcast(data: QRData): void {
    console.log('[CROSS_DEVICE] Broadcasting QR data:', {
      orderId: data.orderId,
      amount: data.amount,
      reference: data.reference,
      timestamp: data.timestamp
    });

    // Store in localStorage for same-device communication
    localStorage.setItem('paynowgo_current_qr', JSON.stringify(data));
    
    // Also store in sessionStorage as backup
    sessionStorage.setItem('paynowgo_current_qr', JSON.stringify(data));
    
    // Update URL with QR data for cross-device access
    const encodedData = btoa(JSON.stringify(data));
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('qr', encodedData);
    newUrl.searchParams.set('t', Date.now().toString());
    
    // Update URL without page reload
    window.history.replaceState({}, '', newUrl.toString());
    
    console.log('[CROSS_DEVICE] QR data stored in URL:', newUrl.toString().substring(0, 100) + '...');
    
    // Notify local listeners
    this.notifyListeners(data);
  }

  /**
   * Clear QR data (when payment is complete)
   */
  clear(): void {
    console.log('[CROSS_DEVICE] Clearing QR data');
    
    // Clear from storage
    localStorage.removeItem('paynowgo_current_qr');
    sessionStorage.removeItem('paynowgo_current_qr');
    
    // Clear from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('qr');
    newUrl.searchParams.delete('t');
    window.history.replaceState({}, '', newUrl.toString());
    
    // Notify listeners
    this.notifyListeners(null);
  }

  /**
   * Get current QR data from any available source
   */
  getCurrentData(): QRData | null {
    try {
      // Method 1: Check URL parameters (for cross-device)
      const urlParams = new URLSearchParams(window.location.search);
      const qrParam = urlParams.get('qr');
      
      if (qrParam) {
        try {
          const decodedData = JSON.parse(atob(qrParam));
          console.log('[CROSS_DEVICE] Found QR data in URL:', {
            orderId: decodedData.orderId,
            amount: decodedData.amount,
            timestamp: decodedData.timestamp
          });
          
          // Check if data is still valid
          if (Date.now() - decodedData.timestamp < QR_EXPIRY_MS) {
            return decodedData;
          } else {
            console.log('[CROSS_DEVICE] URL QR data expired');
          }
        } catch (error) {
          console.error('[CROSS_DEVICE] Error parsing URL QR data:', error);
        }
      }

      // Method 2: Check localStorage (for same-device)
      const localData = localStorage.getItem('paynowgo_current_qr');
      if (localData) {
        const data = JSON.parse(localData);
        if (Date.now() - data.timestamp < QR_EXPIRY_MS) {
          console.log('[CROSS_DEVICE] Found valid QR data in localStorage');
          return data;
        }
      }

      // Method 3: Check sessionStorage (backup)
      const sessionData = sessionStorage.getItem('paynowgo_current_qr');
      if (sessionData) {
        const data = JSON.parse(sessionData);
        if (Date.now() - data.timestamp < QR_EXPIRY_MS) {
          console.log('[CROSS_DEVICE] Found valid QR data in sessionStorage');
          return data;
        }
      }

    } catch (error) {
      console.error('[CROSS_DEVICE] Error reading QR data:', error);
    }

    return null;
  }

  /**
   * Subscribe to QR data changes
   */
  subscribe(callback: (data: QRData | null) => void): () => void {
    console.log('[CROSS_DEVICE] New subscriber added');
    this.listeners.add(callback);
    
    // Start polling if this is the first listener
    if (this.listeners.size === 1) {
      this.startPolling();
    }

    // Send current data immediately
    const currentData = this.getCurrentData();
    console.log('[CROSS_DEVICE] Sending initial data to subscriber:', currentData ? 'HAS_DATA' : 'NO_DATA');
    callback(currentData);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      
      // Stop polling if no more listeners
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    console.log('[CROSS_DEVICE] Starting QR data polling (every 2 seconds)');
    this.pollInterval = setInterval(() => {
      const currentData = this.getCurrentData();
      const currentHash = currentData ? JSON.stringify(currentData) : 'null';
      
      // Only notify if data changed
      if (currentHash !== this.lastDataHash) {
        console.log('[CROSS_DEVICE] QR data changed, notifying', this.listeners.size, 'listeners');
        this.lastDataHash = currentHash;
        this.notifyListeners(currentData);
      }
    }, 2000); // Poll every 2 seconds for better cross-device sync
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      console.log('[CROSS_DEVICE] Stopping QR data polling');
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private notifyListeners(data: QRData | null): void {
    console.log('[CROSS_DEVICE] Notifying', this.listeners.size, 'listeners with data:', data ? 'HAS_DATA' : 'NO_DATA');
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[CROSS_DEVICE] Error in listener callback:', error);
      }
    });
  }
}

// Export singleton instance
export const crossDeviceQR = CrossDeviceQR.getInstance();