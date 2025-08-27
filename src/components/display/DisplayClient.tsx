import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Wifi, WifiOff, Smartphone, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { MerchantQREventsAPI } from '../../lib/merchant-database';
import { terminalSync, getTerminalIdFromDeviceKey, type TerminalQRData } from '../../lib/terminal-sync';

interface Device {
  id: string;
  name: string;
}

interface BootstrapResponse {
  deviceId: string;
  tenantId: string;
  channels: {
    tenant: string;
    device: string;
  };
}

interface DisplayState {
  mode: 'idle' | 'show';
  qrSvg?: string;
  amount?: number;
  reference?: string;
  orderId?: string;
  expiresAt?: string;
}

interface DebugState {
  network: boolean;
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  wsUrl: string;
  channelStatus: 'joining' | 'joined' | 'left';
  channelName: string;
  lastMessageAt: string | null;
  deviceKey: string;
  logs: DebugLog[];
}

interface DebugLog {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  orderId?: string;
}

interface DisplaySnapshot {
  state: 'idle' | 'show';
  payload?: {
    orderId: string;
    amount: number;
    reference: string;
    qrSvg: string;
    expiresAt: string;
  };
}

export function DisplayClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState>({ mode: 'idle' });
  const [isLoading, setIsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  const qrSubscriptionRef = useRef<(() => void) | null>(null);

  // Bootstrap device with server
  const bootstrapDevice = async (deviceKey: string): Promise<BootstrapResponse | null> => {
    try {
      console.log('[DISPLAY] Bootstrapping device with key:', deviceKey);
      
      const response = await fetch('/api/displays/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceKey })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const bootstrapData = await response.json();
      console.log('[DISPLAY] Bootstrap successful:', bootstrapData);
      
      return bootstrapData;
    } catch (error) {
      console.error('[DISPLAY] Bootstrap failed:', error);
      return null;
    }
  };

  // Load snapshot from server
  const loadCurrentQR = async (): Promise<void> => {
    try {
      console.log('[DISPLAY] Loading current QR data...');
      const qrData = await MerchantQREventsAPI.getCurrentQR();
      
      if (qrData) {
        console.log('[DISPLAY] Setting display state from QR data:', {
          qrSvg: qrData.qrSvg ? 'HAS_SVG' : 'NO_SVG',
          amount: qrData.amount,
          reference: qrData.reference
        });
        setDisplayState({
          mode: 'show',
          qrSvg: qrData.qrSvg,
          amount: qrData.amount,
          reference: qrData.reference,
          orderId: qrData.orderId,
          expiresAt: qrData.expiresAt
        });
      } else {
        console.log('[DISPLAY] No active QR data, setting idle');
        setDisplayState({ mode: 'idle' });
      }
    } catch (error) {
      console.error('[DISPLAY] QR data load error:', error);
      setDisplayState({ mode: 'idle' });
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const deviceKeyParam = urlParams.get('k');
    
    console.log('[DISPLAY] Display client starting. URL:', window.location.href);
    console.log('[DISPLAY] Visibility state:', document.visibilityState);
    console.log('[DISPLAY] Network online:', navigator.onLine);
    
    // Use token as device key if provided
    const deviceKey = token || deviceKeyParam || localStorage.getItem('deviceKey');
    
    if (deviceKey) {
      console.log('[DISPLAY] Device key found:', deviceKey);
      localStorage.setItem('deviceKey', deviceKey);
      
      // Extract merchant ID from device key or use default
      // In a real system, you'd look up the merchant ID from the device key
      setMerchantId('00000000-0000-0000-0000-000000000001'); // Demo merchant
      
      // Get terminal ID from device key
      const terminalId = getTerminalIdFromDeviceKey(deviceKey);
      setTerminalId(terminalId);
      console.log('[DISPLAY] Terminal ID for device key', deviceKey, ':', terminalId);
      
      handleAutoLogin(deviceKey);
    } else {
      console.log('[DISPLAY] No device key found in URL or localStorage');
      setIsLoading(false);
    }

    return () => {
      if (qrSubscriptionRef.current) {
        qrSubscriptionRef.current();
      }
    };
  }, []);

  const handleAutoLogin = async (deviceKey: string) => {
    console.log('[DISPLAY] Auto-login attempt with device key:', deviceKey);
    setIsLoading(true);

    try {
      // Skip server bootstrap for now and use direct fallback
      console.log('[DISPLAY] Using direct fallback authentication for development');
      
      // Create fallback bootstrap data
      const fallbackBootstrap = {
        deviceId: deviceKey,
        tenantId: '00000000-0000-0000-0000-000000000001',
        channels: {
          tenant: `display:00000000-0000-0000-0000-000000000001`,
          device: `display:00000000-0000-0000-0000-000000000001:${deviceKey}`
        }
      };
      
      setBootstrap(fallbackBootstrap);
      
      const deviceInfo = {
        id: deviceKey,
        name: `Display ${deviceKey.slice(-4)}`
      };

      localStorage.setItem('display_device', JSON.stringify(deviceInfo));
      localStorage.setItem('display_device_key', deviceKey);
      setDevice(deviceInfo);
      setIsLoggedIn(true);
      
      console.log('[DISPLAY] Direct login successful:', deviceInfo.name);
      
      // Load initial QR data
      try {
        const terminalId = getTerminalIdFromDeviceKey(deviceKey);
        const currentQR = await terminalSync.getCurrentTerminalState(terminalId);
        
        if (currentQR) {
          console.log('[DISPLAY] Setting initial QR state from terminal:', terminalId);
          setDisplayState({
            mode: 'show',
            qrSvg: currentQR.qrSvg,
            amount: currentQR.amount,
            reference: currentQR.reference,
            orderId: currentQR.orderId,
            expiresAt: currentQR.expiresAt
          });
        } else {
          console.log('[DISPLAY] No active QR for terminal:', terminalId);
          setDisplayState({ mode: 'idle' });
        }
      } catch (qrError) {
        console.log('[DISPLAY] QR data load failed, starting with idle state');
        setDisplayState({ mode: 'idle' });
      }
      
      // Subscribe to terminal-specific QR events
      const terminalId = getTerminalIdFromDeviceKey(deviceKey);
      qrSubscriptionRef.current = terminalSync.subscribeToTerminal(terminalId, (qrData: TerminalQRData | null) => {
        console.log('[DISPLAY] Terminal QR event received for', terminalId, ':', qrData ? 'SHOW' : 'HIDE');
        
        if (qrData) {
          setDisplayState({
            mode: 'show',
            qrSvg: qrData.qrSvg,
            amount: qrData.amount,
            reference: qrData.reference,
            orderId: qrData.orderId,
            expiresAt: qrData.expiresAt
          });
        } else {
          setDisplayState({ mode: 'idle' });
        }
      });
      
      // Clean URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('token');
      newUrl.searchParams.delete('k');
      window.history.replaceState({}, '', newUrl.toString());
      
    } catch (error) {
      console.error('[DISPLAY] Auto-login failed:', error);
      // Don't show alert, just log the error and continue with fallback
      console.log('[DISPLAY] Continuing with basic display functionality');
      
      // Set basic logged in state even if bootstrap fails
      const deviceInfo = {
        id: deviceKey,
        name: `Display ${deviceKey.slice(-4)}`
      };
      
      setDevice(deviceInfo);
      setIsLoggedIn(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    if (confirm('Display disconnect? You will need to get a new link from merchant settings.')) {
      localStorage.removeItem('deviceKey');
      localStorage.removeItem('display_device');
      setIsLoggedIn(false);
      setDevice(null);
      setBootstrap(null);
      setDisplayState({ mode: 'idle' });
      console.log('[DISPLAY] Logged out successfully');
      
      // Cleanup subscription
      if (qrSubscriptionRef.current) {
        qrSubscriptionRef.current();
      }
      
      window.location.href = '/';
    }
  };

  // Format expiry time
  const formatExpiryTime = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleTimeString('en-SG', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h1 className="text-2xl font-bold text-purple-600 mb-2">PayNowGo Display</h1>
          <p className="text-gray-600">Connecting to display...</p>
        </div>
      </div>
    );
  }

  // Invalid access (no token)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            This display requires a valid access link from the merchant dashboard.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How to get access:</h3>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside text-left">
              <li>Login to merchant dashboard</li>
              <li>Go to Settings → Display Devices</li>
              <li>Activate a display device</li>
              <li>Copy the individual display URL</li>
              <li>Open the URL on this device</li>
            </ol>
          </div>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Main Page
          </button>
        </div>
      </div>
    );
  }

  // Main display screen
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-4 overflow-hidden">
      {/* Main Display Content */}
      <div className="text-center max-w-lg w-full flex flex-col items-center justify-center min-h-[400px] mt-8 sm:mt-0">
        {displayState.mode === 'show' ? (
          // Show QR code content
          <>
            {console.log('[DISPLAY] Rendering QR mode with state:', displayState)}
            {/* QR Code Container - Responsive sizing */}
            <div className="inline-block p-6 bg-white rounded-3xl shadow-2xl mb-8 border-4 border-purple-200">
              {displayState.qrSvg ? (
                <>
                  {console.log('[DISPLAY] Rendering QR SVG, length:', displayState.qrSvg.length)}
                <div 
                  className="w-[80vmin] max-w-[400px] aspect-square [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: displayState.qrSvg }}
                />
                </>
              ) : (
                <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-100 rounded-xl flex items-center justify-center">
                  {console.log('[DISPLAY] No QR SVG available')}
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <span className="text-gray-500">QR Code Error</span>
                  </div>
                </div>
              )}
            </div>

            {/* Amount - Responsive sizing */}
            <div className="text-4xl md:text-6xl lg:text-8xl font-bold text-purple-600 mb-6 leading-none">
              SGD {(displayState.amount || 0).toFixed(2)}
            </div>

            {/* Reference - Responsive sizing */}
            <div className="text-lg md:text-2xl lg:text-3xl font-mono text-purple-700 mb-6 break-all max-w-full px-4 py-3 bg-purple-100 rounded-xl border-2 border-purple-200">
              {displayState.reference}
            </div>

            {/* Expiry */}
            <div className="text-base md:text-lg lg:text-xl text-gray-700 font-bold mb-8 bg-emerald-100 px-4 py-2 rounded-lg border border-emerald-300">
              PayNowGo.com
            </div>

            {/* Instructions */}
            <div className="text-lg md:text-xl lg:text-2xl text-gray-700 font-bold mb-4">
              Scan with any Singapore banking app
            </div>
            <div className="text-sm md:text-base lg:text-lg text-gray-600 font-medium">
              DBS • OCBC • UOB • Maybank • POSB
            </div>
          </>
        ) : (
          // Show idle state
          <>
            {console.log('[DISPLAY] Rendering idle mode')}
          <div className="flex flex-col items-center justify-center">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-16 h-16 md:w-20 md:h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium text-gray-500 mb-2">Ready</h2>
            <p className="text-lg md:text-xl text-gray-400 mb-8">Waiting for payment request...</p>
            
            <div className="text-center">
              <p className="text-sm md:text-base text-gray-500 mb-4">Device: {device?.name || 'Unknown'}</p>
              <div className="flex items-center justify-center space-x-2 mb-8">
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="text-sm md:text-base text-green-600 font-medium">Connected</span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 text-lg mx-auto font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogOut className="w-5 h-5" />
                <span>Disconnect Display</span>
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Device Info - Fixed bottom left */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-medium">
          {device?.name || 'Unknown Device'}
        </div>
      </div>
    </div>
  );
}