/**
 * Simple broadcast system for cross-device communication
 * Uses a combination of localStorage polling and URL parameters
 */

export interface QRBroadcastData {
  orderId: string;
  qrSvg: string;
  amount: number;
  reference: string;
  expiresAt?: string;
  timestamp: number;
}

const BROADCAST_KEY = 'paynowgo_qr_broadcast';
const BROADCAST_EXPIRY = 15 * 60 * 1000; // 15 minutes

export class QRBroadcast {
  private static instance: QRBroadcast;
  private listeners: Set<(data: QRBroadcastData | null) => void> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastData: QRBroadcastData | null = null;

  static getInstance(): QRBroadcast {
    if (!QRBroadcast.instance) {
      QRBroadcast.instance = new QRBroadcast();
    }
    return QRBroadcast.instance;
  }

  /**
   * Broadcast QR data to all connected displays
   */
  broadcast(data: QRBroadcastData): void {
    console.log('[BROADCAST] Broadcasting QR data:', {
      orderId: data.orderId,
      amount: data.amount,
      reference: data.reference,
      timestamp: data.timestamp
    });

    // Store in localStorage with timestamp
    const broadcastData = {
      ...data,
      timestamp: Date.now()
    };

    localStorage.setItem(BROADCAST_KEY, JSON.stringify(broadcastData));
    
    // Also store in URL hash for cross-device access
    const encodedData = btoa(JSON.stringify(broadcastData));
    window.location.hash = `qr=${encodedData}`;
    
    // Notify local listeners
    this.notifyListeners(broadcastData);
  }

  /**
   * Clear QR broadcast
   */
  clear(): void {
    console.log('[BROADCAST] Clearing QR broadcast');
    localStorage.removeItem(BROADCAST_KEY);
    window.location.hash = '';
    this.notifyListeners(null);
  }

  /**
   * Get current QR data
   */
  getCurrentData(): QRBroadcastData | null {
    try {
      // First check URL hash (for cross-device)
      const hash = window.location.hash;
      if (hash.startsWith('#qr=')) {
        const encodedData = hash.substring(4);
        const decodedData = JSON.parse(atob(encodedData));
        
        // Check if data is still valid (not expired)
        if (Date.now() - decodedData.timestamp < BROADCAST_EXPIRY) {
          return decodedData;
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(BROADCAST_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if data is still valid
        if (Date.now() - data.timestamp < BROADCAST_EXPIRY) {
          return data;
        } else {
          // Clean up expired data
          this.clear();
        }
      }
    } catch (error) {
      console.error('[BROADCAST] Error reading QR data:', error);
    }

    return null;
  }

  /**
   * Subscribe to QR data changes
   */
  subscribe(callback: (data: QRBroadcastData | null) => void): () => void {
    this.listeners.add(callback);
    
    // Start polling if this is the first listener
    if (this.listeners.size === 1) {
      this.startPolling();
    }

    // Send current data immediately
    const currentData = this.getCurrentData();
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

    console.log('[BROADCAST] Starting QR data polling');
    this.pollInterval = setInterval(() => {
      const currentData = this.getCurrentData();
      
      // Only notify if data changed
      if (JSON.stringify(currentData) !== JSON.stringify(this.lastData)) {
        console.log('[BROADCAST] QR data changed, notifying listeners');
        this.lastData = currentData;
        this.notifyListeners(currentData);
      }
    }, 1000); // Poll every second
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      console.log('[BROADCAST] Stopping QR data polling');
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private notifyListeners(data: QRBroadcastData | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[BROADCAST] Error in listener callback:', error);
      }
    });
  }
}

// Export singleton instance
export const qrBroadcast = QRBroadcast.getInstance();