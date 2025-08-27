import React, { useState } from 'react';
import { Save, Shield, Smartphone, Building2, Users, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { MerchantDisplayDevicesAPI } from '../../lib/merchant-database';

export function AdminSettings() {
  const {
    businessType: settingsBusinessType,
    setBusinessType: setSettingsBusinessType,
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
    setNotifications
  } = useSettingsContext();

  // State for QR codes
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  // Display devices state
  const [displayDevices, setDisplayDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Load display devices on mount
  React.useEffect(() => {
    loadDisplayDevices();
  }, []);

  const loadDisplayDevices = async () => {
    try {
      setIsLoadingDevices(true);
      
      // Load devices directly from Supabase
      const merchantId = getCurrentMerchantId();
      const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('merchant_id', merchantId);
      
      if (error) {
        throw error;
      }
      
      console.log('[ADMIN_SETTINGS] Loaded devices from Supabase:', devices?.length || 0);
      setDisplayDevices(devices || []);
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error loading devices:', error);
      setDisplayDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Get current merchant ID
  const getCurrentMerchantId = () => {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const merchant = JSON.parse(userData);
        return merchant.id;
      }
    } catch (error) {
      console.error('Error getting current merchant ID:', error);
    }
    return '00000000-0000-0000-0000-000000000001';
  };

  // Listen for storage changes to sync across devices
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('displayDevices_')) {
        console.log('[ADMIN_SETTINGS] Display devices updated on another device, reloading...');
        loadDisplayDevices();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Generate real QR code for URL
  const generateQRCodeForURL = async (url: string, deviceId: string) => {
    try {
      // Use the QR code library to generate a real scannable QR code
      const QRCode = await import('qrcode');
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 80,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodes(prev => ({
        ...prev,
        [deviceId]: qrDataUrl
      }));
      
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to simple pattern if QR library fails
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" fill="white"/>
          <rect x="8" y="8" width="64" height="64" fill="black"/>
          <rect x="16" y="16" width="48" height="48" fill="white"/>
          <rect x="24" y="24" width="32" height="32" fill="black"/>
          <rect x="32" y="32" width="16" height="16" fill="white"/>
          <rect x="40" y="40" width="8" height="8" fill="black"/>
          <text x="40" y="45" text-anchor="middle" font-size="8" fill="white" font-family="monospace">URL</text>
        </svg>
      `)}`;
    }
  };

  // Generate QR code when device becomes active
  React.useEffect(() => {
    displayDevices.forEach(device => {
      if (device.active && !qrCodes[device.id]) {
        const displayUrl = `${window.location.origin}/display?token=${device.id}`;
        generateQRCodeForURL(displayUrl, device.id);
      }
    });
  }, [displayDevices]);

  const toggleDevice = (deviceId: string) => {
    const device = displayDevices.find(d => d.id === deviceId);
    if (!device) return;

    const newActiveState = !device.active;
    console.log('[ADMIN_SETTINGS] Toggling device:', deviceId, 'to active:', newActiveState);

    // Update via API
    MerchantDisplayDevicesAPI.update(deviceId, { 
      active: newActiveState 
    }).then(() => {
      console.log('[ADMIN_SETTINGS] Device updated successfully');
      loadDisplayDevices(); // Reload to get latest state
    }).catch(error => {
      console.error('[ADMIN_SETTINGS] Error updating device:', error);
    });
  };

  const generateNewKey = (deviceId: string) => {
    if (!confirm('Generate new device key? This will invalidate the current display link.')) {
      return;
    }

    const newKey = MerchantDisplayDevicesAPI.generateDeviceKey();
    console.log('[ADMIN_SETTINGS] Generating new key for device:', deviceId, 'New key:', newKey);

    // Update existing device with new key instead of creating new one
    const device = displayDevices.find(d => d.id === deviceId);
    if (device) {
      MerchantDisplayDevicesAPI.update(deviceId, {
        device_key: newKey,
        active: false // Deactivate when generating new key
      }).then(() => {
        console.log('[ADMIN_SETTINGS] Device key updated successfully');
        loadDisplayDevices(); // Reload to get latest state
        alert(`New device key generated: ${newKey}\nThe device has been deactivated. Please activate it again to use the new link.`);
      }).catch(error => {
        console.error('[ADMIN_SETTINGS] Error updating device key:', error);
      });
    }
  };

  const handleSave = () => {
    // Settings are automatically saved via context
    alert('Settings saved successfully!');
  };

  const activeDevices = displayDevices.filter(d => d.active).length;

  if (isLoadingDevices) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
        <p className="text-gray-600 mt-1">Configure your PayNowGo system settings</p>
      </div>

      <div className="space-y-8">
        {/* PayNow Configuration */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">PayNow Configuration</h3>
              <p className="text-sm text-gray-600">Set up your PayNow receiving method</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* PayNow Account Information - READ ONLY for Merchants */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <h4 className="text-sm font-medium text-yellow-800">PayNow Account Information</h4>
              </div>
              <p className="text-sm text-yellow-700 mb-4">
                These payment details can only be modified by the system administrator. Contact support if changes are needed.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* UEN Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UEN Number
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    {uen || 'Not configured'}
                  </div>
                  {uen && (
                    <p className="text-xs text-green-600 mt-1">✓ Business PayNow enabled</p>
                  )}
                </div>

                {/* Mobile Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    {mobile ? `+65${mobile}` : 'Not configured'}
                  </div>
                  {mobile && (
                    <p className="text-xs text-green-600 mt-1">✓ Individual PayNow enabled</p>
                  )}
                </div>
              </div>
              
              {/* Payment Method Status */}
              <div className="mt-4 p-3 bg-white border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Active Payment Method:</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {uen && mobile ? 'Both UEN & Mobile' : 
                     uen ? 'Business (UEN)' : 
                     mobile ? 'Individual (Mobile)' : 
                     'Not configured'}
                  </span>
                </div>
                {!uen && !mobile && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ No PayNow method configured. Contact administrator to set up payments.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Business Information</h3>
              <p className="text-sm text-gray-600">Update your business details</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">System Settings</h3>
              <p className="text-sm text-gray-600">Configure system behavior</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Auto-generate References</h4>
                <p className="text-sm text-gray-600">Automatically create reference numbers for new orders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReference}
                  onChange={(e) => setAutoReference(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {autoReference && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Prefix
                </label>
                <input
                  type="text"
                  value={referencePrefix}
                  onChange={(e) => setReferencePrefix(e.target.value)}
                  placeholder="e.g., TBL, ORD, INV"
                  className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-600">Receive instant payment notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Android Listener Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 block">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Display Devices</h3>
              <p className="text-sm text-gray-600">Manage your customer display screens (Maximum 2 devices)</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Device Limit Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 block">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    Active Displays: {activeDevices}/2
                  </span>
                </div>
                {activeDevices === 2 && (
                  <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                    Maximum reached
                  </span>
                )}
              </div>
            </div>

            {/* Always show devices - either loaded or default */}
            {displayDevices.map((device) => (
              <div key={device.id || device.device_key} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{device.device_name || device.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">Customer-facing QR display screen</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${device.active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className={`text-xs ${device.active ? 'text-green-600' : 'text-gray-500'}`}>
                        {device.active ? 'Active' : 'Inactive'}
                      </span>
                      {device.last_seen_at && (
                        <span className="text-xs text-gray-400">
                          • Last seen: {new Date(device.last_seen_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleDevice(device.id || device.device_key)}
                      disabled={!device.active && activeDevices >= 2}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        device.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : activeDevices >= 2
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {device.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
                
                {device.active && (
                  <div className="mt-3 p-4 bg-white border border-gray-200 rounded-md">
                    <div className="space-y-4">
                      {/* Individual Display Link */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">🔗 Individual Display Link</p>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-emerald-700 font-medium">Secure Display URL:</span>
                            <button
                              onClick={() => {
                                const displayUrl = `${window.location.origin}/display?token=${device.device_key || device.id}`;
                                if (navigator.share) {
                                  // Use native sharing on mobile
                                  navigator.share({
                                    title: 'PayNowGo Display',
                                    text: 'Open this link on your display device',
                                    url: displayUrl
                                  }).catch(console.error);
                                } else {
                                  // Fallback to clipboard
                                  navigator.clipboard.writeText(displayUrl).then(() => {
                                    alert('Display URL copied to clipboard!');
                                  }).catch(() => {
                                    // Final fallback - show URL in alert
                                    alert(`Display URL:\n${displayUrl}`);
                                  });
                                }
                              }}
                              className="text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded font-medium"
                            >
                              📤 Share URL
                            </button>
                          </div>
                          <div className="text-xs font-mono text-emerald-800 bg-white p-2 rounded border break-all">
                            {window.location.origin}/display?token={device.device_key || device.id}
                          </div>
                        </div>
                      </div>

                      {/* QR Code for Easy Mobile Access */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">📱 QR Code for Mobile Access</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <div className="inline-block p-3 bg-white rounded-lg border border-blue-300 mb-3 shadow-sm">
                            {qrCodes[device.device_key || device.id] ? (
                              <img 
                                src={qrCodes[device.device_key || device.id]} 
                                alt="Display QR Code"
                                className="w-16 h-16 sm:w-20 sm:h-20"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">Loading...</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-blue-700 font-medium">Scan with phone camera to open display</p>
                            <p className="text-xs text-blue-600">Works with any QR scanner app</p>
                          </div>
                          
                          {/* Mobile-friendly copy button */}
                          <button
                            onClick={() => {
                              const displayUrl = `${window.location.origin}/display?token=${device.device_key || device.id}`;
                              if (navigator.share) {
                                // Use native sharing on mobile
                                navigator.share({
                                  title: 'PayNowGo Display',
                                  text: 'Open this link on your display device',
                                  url: displayUrl
                                }).catch(console.error);
                              } else {
                                // Fallback to clipboard
                                navigator.clipboard.writeText(displayUrl).then(() => {
                                  alert('Display URL copied to clipboard!');
                                }).catch(() => {
                                  // Final fallback - show URL in alert
                                  alert(`Display URL:\n${displayUrl}`);
                                });
                              }
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-full font-medium border border-blue-200"
                          >
                            📱 Share Link
                          </button>
                        </div>
                      </div>

                      {/* Device Management */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">🔧 Device Management</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            onClick={() => generateNewKey(device.id || device.device_key)}
                            className="w-full sm:w-auto text-xs text-blue-600 hover:text-blue-700 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded font-medium border border-blue-200"
                          >
                            🔄 Generate New Link
                          </button>
                          <button
                            onClick={() => {
                              const displayUrl = `${window.location.origin}/display?token=${device.device_key || device.id}`;
                              window.open(displayUrl, '_blank');
                            }}
                            className="w-full sm:w-auto text-xs text-purple-600 hover:text-purple-700 px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded font-medium border border-purple-200"
                          >
                            🖥️ Test Display
                          </button>
                          <button
                            onClick={() => {
                              const displayUrl = `${window.location.origin}/display?token=${device.device_key || device.id}`;
                              const message = `Open this link on your display device:\n\n${displayUrl}\n\nOr scan the QR code above with your phone camera.`;
                              if (navigator.share) {
                                navigator.share({
                                  title: 'PayNowGo Display Setup',
                                  text: message,
                                  url: displayUrl
                                }).catch(console.error);
                              } else {
                                alert(message);
                              }
                            }}
                            className="w-full sm:w-auto text-xs text-green-600 hover:text-green-700 px-3 py-2 bg-green-50 hover:bg-green-100 rounded font-medium border border-green-200"
                          >
                            📤 Send to Mobile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!device.active && (
                  <div className="mt-3 p-3 bg-gray-100 border border-gray-200 rounded-md">
                    <p className="text-xs text-gray-500 text-center">
                      Device is inactive. Activate to view connection details.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Quick Setup Section - Always visible */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-emerald-900 mb-3">🚀 Quick Setup - Ready to Use</h4>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-emerald-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-emerald-800">Display 1 (Mobile/Desktop)</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/display?token=472851`;
                          navigator.clipboard.writeText(url).then(() => {
                            alert('Display URL copied to clipboard!');
                          }).catch(() => {
                            alert(`Display URL:\n${url}`);
                          });
                        }}
                        className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded"
                      >
                        📋 Copy Link
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/display?token=472851`;
                          window.open(url, '_blank');
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
                      >
                        🖥️ Open Display
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-700 bg-emerald-50 p-2 rounded border break-all">
                    {window.location.origin}/display?token=472851
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-emerald-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-emerald-800">Display 2 (Mobile/Desktop)</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/display?token=639274`;
                          navigator.clipboard.writeText(url).then(() => {
                            alert('Display URL copied to clipboard!');
                          }).catch(() => {
                            alert(`Display URL:\n${url}`);
                          });
                        }}
                        className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded"
                      >
                        📋 Copy Link
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/display?token=639274`;
                          window.open(url, '_blank');
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
                      >
                        🖥️ Open Display
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-700 bg-emerald-50 p-2 rounded border break-all">
                    {window.location.origin}/display?token=639274
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded">
                <p className="text-xs text-emerald-800">
                  <strong>✅ Ready to test:</strong> Click "Open Display" to test immediately, or copy the link to send to your display device.
                  These links work on any device with internet access.
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions</h4>
              <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
                <li>Activate a display device using the toggle button above</li>
                <li><strong>For Desktop/Tablet:</strong> Copy the display URL and open in browser</li>
                <li><strong>For Smartphone:</strong> Scan QR code with camera or use "Share Link" button</li>
                <li>The display will automatically connect (no login required)</li>
                <li>The screen will show "Ready" status when idle</li>
                <li>QR codes will appear automatically when you create orders</li>
              </ol>
              
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-800 font-medium">✅ Desktop/Tablet Setup:</p>
                  <ul className="text-xs text-green-700 mt-1 space-y-1 list-disc list-inside ml-2">
                    <li>Copy URL and paste in browser address bar</li>
                    <li>Bookmark for easy access</li>
                    <li>Works on any computer or tablet</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <p className="text-xs text-purple-800 font-medium">📱 Mobile/Smartphone Setup:</p>
                  <ul className="text-xs text-purple-700 mt-1 space-y-1 list-disc list-inside ml-2">
                    <li>Scan QR code with phone camera (no app needed)</li>
                    <li>Or use "Share Link" to send via WhatsApp/SMS</li>
                    <li>Add to home screen for quick access</li>
                    <li>Works in any mobile browser</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800 font-medium">⚠️ Troubleshooting:</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1 list-disc list-inside ml-2">
                    <li>If QR code doesn't scan: Use "Share Link" button instead</li>
                    <li>If display doesn't connect: Generate new link</li>
                    <li>For best results: Use dedicated device for display</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Display Tips - Always visible */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 block">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-900">📱 Mobile Display Setup</h3>
              <p className="text-sm text-purple-700">Best practices for smartphone displays</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="text-sm font-medium text-purple-900 mb-2">🎯 Recommended Setup</h4>
              <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
                <li>Use dedicated smartphone/tablet for display</li>
                <li>Enable "Keep screen on" in device settings</li>
                <li>Turn on airplane mode + WiFi only (save battery)</li>
                <li>Add display link to home screen</li>
                <li>Use landscape orientation for better QR visibility</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="text-sm font-medium text-purple-900 mb-2">🔧 Alternative Solutions</h4>
              <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
                <li>Use tablet or laptop as customer display</li>
                <li>Print QR codes manually if needed</li>
                <li>Share display link via WhatsApp to other devices</li>
                <li>Use "Send to Mobile" button for easy sharing</li>
                <li>Test with different browsers if issues occur</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>💡 Pro Tip:</strong> The display link works on any device with internet access. 
              If scanning doesn't work, manually type or share the URL to your display device.
            </p>
          </div>
        </div>

        {/* Save Button - Always visible */}
        <div className="flex justify-end block">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}