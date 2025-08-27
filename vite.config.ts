import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Global storage for QR data (in production, this would be in a database)
let globalQRData: any = null;

// Global storage for categories (mock database)
let globalCategories = [
  { id: '1', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Beverages', position: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Main Dishes', position: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Desserts', position: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// Global storage for items (mock database)
let globalItems = [
  { 
    id: '1', 
    tenant_id: '00000000-0000-0000-0000-000000000001', 
    category_id: '1', 
    name: 'Coffee', 
    price_cents: 450, 
    active: true, 
    sku: 'BEV001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: '1', name: 'Beverages' }
  },
  { 
    id: '2', 
    tenant_id: '00000000-0000-0000-0000-000000000001', 
    category_id: '2', 
    name: 'Nasi Lemak', 
    price_cents: 850, 
    active: true, 
    sku: 'MAIN001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: '2', name: 'Main Dishes' }
  },
  { 
    id: '3', 
    tenant_id: '00000000-0000-0000-0000-000000000001', 
    category_id: '1', 
    name: 'Tea', 
    price_cents: 350, 
    active: true, 
    sku: 'BEV002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: '1', name: 'Beverages' }
  },
  { 
    id: '4', 
    tenant_id: '00000000-0000-0000-0000-000000000001', 
    category_id: '3', 
    name: 'Ice Cream', 
    price_cents: 400, 
    active: true, 
    sku: 'DES001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: '3', name: 'Desserts' }
  },
  { 
    id: '5', 
    tenant_id: '00000000-0000-0000-0000-000000000001', 
    category_id: '2', 
    name: 'Chicken Rice', 
    price_cents: 750, 
    active: false, 
    sku: 'MAIN002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: '2', name: 'Main Dishes' }
  }
];

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    // Custom plugin to handle API routes
    {
      name: 'mock-api',
      configureServer(server) {
        server.middlewares.use('/api', (req, res, next) => {
          console.log(`[API] ${req.method} ${req.url}`);
          
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          // Handle display events API
          if (req.url?.startsWith('/display-events') && req.method === 'POST') {
            console.log('[API] POST /api/display-events');
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const eventData = JSON.parse(body);
                console.log('[API] Display event data:', {
                  tenant_id: eventData.tenant_id,
                  event_type: eventData.event_type,
                  order_id: eventData.order_id,
                  hasQrData: !!eventData.qr_data
                });
                
                // Validate required fields
                if (!eventData.tenant_id || !eventData.event_type) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing required fields: tenant_id, event_type' }));
                  return;
                }
                
                // Validate event_type
                if (!['show_qr', 'hide_qr'].includes(eventData.event_type)) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid event_type. Must be show_qr or hide_qr' }));
                  return;
                }
                
                // For show_qr events, validate required QR data
                if (eventData.event_type === 'show_qr') {
                  if (!eventData.order_id || !eventData.qr_data) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'show_qr events require order_id and qr_data' }));
                    return;
                  }
                }
                
                // Mock successful creation (in production, this would use Supabase Service Role)
                const mockEvent = {
                  id: 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  tenant_id: eventData.tenant_id,
                  event_type: eventData.event_type,
                  order_id: eventData.order_id || null,
                  qr_data: eventData.qr_data || null,
                  expires_at: eventData.expires_at || null,
                  created_at: new Date().toISOString()
                };
                
                console.log('[API] Display event created successfully:', mockEvent.id);
                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(mockEvent));
              } catch (error) {
                console.error('[API] Display events error:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle orders API - CREATE ORDER
          if (req.url === '/orders' && req.method === 'POST') {
            console.log('[API] POST /api/orders');
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const orderData = JSON.parse(body);
                console.log('[API] Creating order with data:', {
                  amount: orderData.amount,
                  reference: orderData.reference,
                  hasItems: !!orderData.items,
                  itemsCount: orderData.items?.length || 0,
                  tenantId: orderData.tenantId,
                  terminalId: orderData.terminalId
                });
                
                // Validate required fields
                if (!orderData.amount || orderData.amount <= 0) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid amount' }));
                  return;
                }
                
                // Convert amount to cents
                const amount_cents = Math.round(Number((orderData.amount || 0).toFixed(2)) * 100);
                
                // Generate reference if not provided
                const reference = orderData.reference || (() => {
                  const now = new Date();
                  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
                  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                  return `POS${dateStr}${timeStr}${random}`;
                })();
                
                // Determine tenant ID
                let tenantId = orderData.tenantId || '00000000-0000-0000-0000-000000000001';
                
                // Mock order creation (in production, use supabaseAdmin)
                const newOrder = {
                  id: 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  tenant_id: tenantId,
                  terminal_id: orderData.terminalId || null,
                  reference: reference,
                  currency: 'SGD',
                  amount_cents: amount_cents,
                  status: 'pending',
                  qr_svg: orderData.qrSvg || null,
                  qr_text: orderData.qrText || null,
                  idempotency_key: orderData.idempotencyKey || null,
                  expires_at: orderData.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                // Store in global orders array for persistence
                if (!global.globalOrders) {
                  global.globalOrders = [];
                }
                global.globalOrders.unshift(newOrder);
                
                // Mock order items creation
                if (Array.isArray(orderData.items) && orderData.items.length > 0) {
                  if (!global.globalOrderItems) {
                    global.globalOrderItems = [];
                  }
                  
                  const orderItems = orderData.items.map(item => ({
                    id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    order_id: newOrder.id,
                    item_id: item.itemId || null,
                    name: item.name,
                    unit_price_cents: item.unitPriceCents,
                    qty: item.qty,
                    line_total_cents: item.unitPriceCents * item.qty,
                    created_at: new Date().toISOString()
                  }));
                  
                  global.globalOrderItems.push(...orderItems);
                  console.log('[API] Order items created:', orderItems.length);
                }
                
                console.log('[API] Order created successfully:', newOrder.id);
                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  orderId: newOrder.id,
                  amount: amount_cents / 100,
                  reference: reference,
                  status: 'pending',
                  expiresAt: newOrder.expires_at
                }));
              } catch (error) {
                console.error('[API] Orders create error:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body: ' + error.message }));
              }
            });
            return;
          }

          // Handle orders API - GET ORDERS
          if (req.url?.startsWith('/orders') && req.method === 'GET') {
            console.log('[API] GET /api/orders');
            
            // Initialize global orders if not exists
            if (!global.globalOrders) {
              global.globalOrders = [];
            }
            
            // Parse query parameters
            const url = new URL('http://localhost' + req.url);
            const status = url.searchParams.get('status');
            const limit = parseInt(url.searchParams.get('limit') || '20');
            
            let filteredOrders = [...global.globalOrders];
            
            // Filter by status if specified
            if (status && status !== 'all') {
              filteredOrders = filteredOrders.filter(order => order.status === status);
            }
            
            // Apply limit
            filteredOrders = filteredOrders.slice(0, limit);
            
            // Add order items to each order
            const ordersWithItems = filteredOrders.map(order => {
              const orderItems = (global.globalOrderItems || []).filter(item => item.order_id === order.id);
              return {
                ...order,
                items: orderItems
              };
            });
            
            console.log('[API] Returning orders:', ordersWithItems.length);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              orders: ordersWithItems,
              total: global.globalOrders.length
            }));
            return;
          }

          // Handle orders API - MARK PAID
          const markPaidMatch = req.url?.match(/^\/orders\/([^\/]+)\/mark-paid$/);
          if (markPaidMatch && req.method === 'POST') {
            const orderId = markPaidMatch[1];
            console.log('[API] POST /api/orders/' + orderId + '/mark-paid');
            
            // Initialize global orders if not exists
            if (!global.globalOrders) {
              global.globalOrders = [];
            }
            
            // Find and update order
            const orderIndex = global.globalOrders.findIndex(order => order.id === orderId);
            if (orderIndex === -1) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Order not found' }));
              return;
            }
            
            // Update order status
            global.globalOrders[orderIndex] = {
              ...global.globalOrders[orderIndex],
              status: 'paid',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log('[API] Order marked as paid:', orderId);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // Handle orders API - CANCEL ORDER
          const cancelMatch = req.url?.match(/^\/orders\/([^\/]+)\/cancel$/);
          if (cancelMatch && req.method === 'POST') {
            const orderId = cancelMatch[1];
            console.log('[API] POST /api/orders/' + orderId + '/cancel');
            
            // Initialize global orders if not exists
            if (!global.globalOrders) {
              global.globalOrders = [];
            }
            
            // Find and update order
            const orderIndex = global.globalOrders.findIndex(order => order.id === orderId);
            if (orderIndex === -1) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Order not found' }));
              return;
            }
            
            // Update order status
            global.globalOrders[orderIndex] = {
              ...global.globalOrders[orderIndex],
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log('[API] Order canceled:', orderId);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          // Handle display login
          if (req.url?.startsWith('/displays/login') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { deviceKey } = JSON.parse(body);
                console.log(`[API] Display login attempt with device key: ${deviceKey}`);
                
                // Try to read device keys from merchant settings (simulated via file system)
                let validDevices = [];
                
                try {
                  // In a real environment, we'd read from database
                  // For development, we'll check if there's a way to access the merchant's device keys
                  // Since we can't access localStorage from server, we'll use both hardcoded and check for common patterns
                  
                  // Hardcoded fallback devices
                  const fallbackDevices = [
                    { id: '472851', key: '472851', name: 'Counter Display 1', tenantId: '00000000-0000-0000-0000-000000000001' },
                    { id: '639274', key: '639274', name: 'Counter Display 2', tenantId: '00000000-0000-0000-0000-000000000001' }
                  ];
                  
                  // Accept any 6-digit numeric key for development (merchant-generated keys)
                  if (/^\d{6}$/.test(deviceKey)) {
                    validDevices = [
                      ...fallbackDevices,
                      { id: deviceKey, key: deviceKey, name: `Merchant Display ${deviceKey}`, tenantId: '00000000-0000-0000-0000-000000000001' }
                    ];
                  } else {
                    validDevices = fallbackDevices;
                  }
                } catch (error) {
                  console.warn('[API] Could not read merchant device keys, using fallback');
                  validDevices = [
                    { id: '472851', key: '472851', name: 'Counter Display 1', tenantId: '00000000-0000-0000-0000-000000000001' },
                    { id: '639274', key: '639274', name: 'Counter Display 2', tenantId: '00000000-0000-0000-0000-000000000001' }
                  ];
                }
                
                console.log('[API] Valid devices for login:', validDevices.map(d => ({ key: d.key, name: d.name })));
                
                const device = validDevices.find(d => d.key === deviceKey);
                
                if (!device) {
                  console.log(`[API] Invalid device key: ${deviceKey}`);
                  console.log(`[API] Valid keys are: ${validDevices.map(d => d.key).join(', ')}`);
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid device key' }));
                  return;
                }
                
                const mockResponse = {
                  token: 'display-token-' + device.id + '-' + Date.now(),
                  device: {
                    id: device.id,
                    name: device.name
                  },
                  tenantId: device.tenantId
                };
                
                console.log(`[API] Display login successful for ${device.name}`);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(mockResponse));
              } catch (error) {
                console.error('[API] Display login error:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle display bootstrap
          if (req.url?.startsWith('/displays/bootstrap') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { deviceKey } = JSON.parse(body);
                console.log(`[API] Display bootstrap attempt with device key: ${deviceKey}`);
                
                // Get device keys from merchant settings (localStorage simulation)
                let validDevices = [];
                
                try {
                  // Try to read from a global merchant settings store
                  // In development, we'll accept any device key that looks valid
                  const fallbackDevices = [
                    { id: '472851', key: '472851', name: 'Counter Display 1', tenantId: '00000000-0000-0000-0000-000000000001' },
                    { id: '639274', key: '639274', name: 'Counter Display 2', tenantId: '00000000-0000-0000-0000-000000000001' }
                  ];
                  
                  // Accept any 6-digit numeric key (merchant-generated)
                  if (/^\d{6}$/.test(deviceKey)) {
                    validDevices = [
                      ...fallbackDevices,
                      { id: deviceKey, key: deviceKey, name: `Display ${deviceKey}`, tenantId: '00000000-0000-0000-0000-000000000001' }
                    ];
                  } else {
                    // Also accept URL tokens from merchant settings
                    validDevices = [
                      ...fallbackDevices,
                      { id: deviceKey, key: deviceKey, name: `Mobile Display`, tenantId: '00000000-0000-0000-0000-000000000001' }
                    ];
                  }
                } catch (error) {
                  console.warn('[API] Could not read merchant device keys, using fallback');
                  validDevices = [
                    { id: deviceKey, key: deviceKey, name: `Display ${deviceKey}`, tenantId: '00000000-0000-0000-0000-000000000001' }
                  ];
                }
                
                // Always find a device for development
                let device = validDevices.find(d => d.key === deviceKey);
                
                // If not found, create a temporary device for this session
                if (!device) {
                  device = {
                    id: deviceKey,
                    key: deviceKey,
                    name: `Temp Display ${deviceKey.slice(-4)}`,
                    tenantId: '00000000-0000-0000-0000-000000000001'
                  };
                  console.log(`[API] Created temporary device for key: ${deviceKey}`);
                }
                
                const bootstrapResponse = {
                  deviceId: device.id,
                  tenantId: device.tenantId,
                  channels: {
                    tenant: `display:${device.tenantId}`,
                    device: `display:${device.tenantId}:${device.id}`
                  }
                };
                
                console.log(`[API] Bootstrap successful for ${device.name}:`, bootstrapResponse);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store');
                res.end(JSON.stringify(bootstrapResponse));
              } catch (error) {
                console.error('[API] Display bootstrap error:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle display heartbeat
          if (req.url?.startsWith('/displays/heartbeat') && req.method === 'POST') {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
              console.log('[API] Heartbeat: Missing auth header');
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing or invalid authorization header' }));
              return;
            }
            
            const token = authHeader.substring(7);
            
            if (!token.startsWith('display-token-')) {
              console.log('[API] Heartbeat: Invalid token format');
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid token' }));
              return;
            }
            
            console.log('[API] Heartbeat successful');
            const mockResponse = {
              status: 'ok',
              timestamp: new Date().toISOString()
            };
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(mockResponse));
            return;
          }

          // Handle display snapshot polling
          if (req.url?.startsWith('/displays/snapshot') && req.method === 'GET') {
            const deviceKey = req.headers['x-device-key'];
            const url = new URL('http://localhost' + req.url);
            const deviceKeyParam = url.searchParams.get('k');
            const finalDeviceKey = deviceKey || deviceKeyParam;
            
            console.log('[API] Display snapshot request:', { deviceKey: finalDeviceKey });
            
            if (!finalDeviceKey) {
              console.log('[API] Snapshot: Missing device key');
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing device key' }));
              return;
            }
            
            // For development, accept any device key and create a virtual device
            const device = {
              id: finalDeviceKey,
              key: finalDeviceKey,
              name: `Display ${finalDeviceKey.slice(-4)}`,
              tenantId: '00000000-0000-0000-0000-000000000001'
            };
            
            // Return current QR data if available
            const snapshot = {
              state: globalQRData ? 'show' : 'idle',
              payload: globalQRData ? {
                orderId: globalQRData.orderId || '',
                amount: globalQRData.amount || 0,
                reference: globalQRData.reference || '',
                qrSvg: globalQRData.qrSvg || '',
                expiresAt: globalQRData.expiresAt || ''
              } : null
            };
            
            console.log('[API] Snapshot response:', {
              state: snapshot.state,
              hasPayload: !!snapshot.payload,
              orderId: snapshot.payload?.orderId,
              deviceId: device.id,
              tenantId: device.tenantId
            });
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.end(JSON.stringify(snapshot));
            return;
          }

          // Handle show QR on display
          if (req.url?.startsWith('/displays/show-qr') && req.method === 'POST') {
            console.log('[API] ===== SHOW QR REQUEST RECEIVED =====');
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const qrData = JSON.parse(body);
                console.log('[API] Storing QR data:', {
                  orderId: qrData.orderId,
                  amount: qrData.amount,
                  reference: qrData.reference,
                  hasSvg: !!qrData.qrSvg,
                  svgLength: qrData.qrSvg?.length,
                  hasPng: !!qrData.qrPng,
                  pngLength: qrData.qrPng?.length
                });
                
                // Store QR data globally
                globalQRData = qrData;
                console.log('[API] QR data stored successfully in global variable');
                console.log('[API] Global QR data now contains:', {
                  hasData: !!globalQRData,
                  orderId: globalQRData?.orderId,
                  svgLength: globalQRData?.qrSvg?.length,
                  pngLength: globalQRData?.qrPng?.length
                });
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                console.error('[API] Show QR error:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle poll for QR data
          if (req.url?.startsWith('/displays/poll-qr') && req.method === 'GET') {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
              console.log('[API] Poll QR: Missing auth header');
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing or invalid authorization header' }));
              return;
            }
            
            const token = authHeader.substring(7);
            
            if (!token.startsWith('display-token-')) {
              console.log('[API] Poll QR: Invalid token format');
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid token' }));
              return;
            }
            
            // Return current QR data if available
            const qrData = globalQRData;
            console.log('[API] Poll QR request - returning data:', {
              hasData: !!qrData,
              orderId: qrData?.orderId,
              amount: qrData?.amount,
              reference: qrData?.reference,
              hasSvg: !!qrData?.qrSvg,
              hasPng: !!qrData?.qrPng
            });
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ qrData }));
            return;
          }

          // Handle hide QR (mark as paid)
          if (req.url?.startsWith('/displays/hide-qr') && req.method === 'POST') {
            console.log('[API] ===== HIDE QR REQUEST RECEIVED =====');
            globalQRData = null;
            console.log('[API] QR data cleared from global variable');
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // Handle categories API
          if (req.url.split('?')[0] === '/categories' && req.method === 'GET') {
            console.log('[API] GET /api/categories');
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(globalCategories));
            return;
          }

          // Handle category creation
          if (req.url === '/categories' && req.method === 'POST') {
            console.log('[API] POST /api/categories');
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const categoryData = JSON.parse(body);
                console.log('[API] Creating category:', categoryData);
                
                const newCategory = {
                  id: Math.random().toString(36).substr(2, 9),
                  tenant_id: '00000000-0000-0000-0000-000000000001',
                  name: categoryData.name,
                  position: categoryData.position || 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                // Add to global storage
                globalCategories.push(newCategory);
                
                console.log('[API] Category created:', newCategory);
                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(newCategory));
              } catch (error) {
                console.error('[API] Error creating category:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle category updates (PATCH /categories/:id)
          const categoryUpdateMatch = req.url.match(/^\/categories\/([^\/]+)$/);
          if (categoryUpdateMatch && req.method === 'PATCH') {
            const categoryId = categoryUpdateMatch[1];
            console.log('[API] PATCH /api/categories/' + categoryId);
            
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const updateData = JSON.parse(body);
                console.log('[API] Updating category:', categoryId, 'with data:', updateData);
                
                // Find and update category in global storage
                const categoryIndex = globalCategories.findIndex(cat => cat.id === categoryId);
                if (categoryIndex === -1) {
                  console.error('[API] Category not found:', categoryId);
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Category not found' }));
                  return;
                }
                
                // Update the category
                const existingCategory = globalCategories[categoryIndex];
                const updatedCategory = {
                  ...existingCategory,
                  name: updateData.name !== undefined ? updateData.name : existingCategory.name,
                  position: updateData.position !== undefined ? updateData.position : existingCategory.position,
                  updated_at: new Date().toISOString()
                };
                
                // Update in global storage
                globalCategories[categoryIndex] = updatedCategory;
                console.log('[API] Category updated in global storage:', updatedCategory);
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(updatedCategory));
              } catch (error) {
                console.error('[API] Error updating category:', error);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }

          // Handle category deletion (DELETE /categories/:id)
          const categoryDeleteMatch = req.url.match(/^\/categories\/([^\/]+)$/);
          if (categoryDeleteMatch && req.method === 'DELETE') {
            const categoryId = categoryDeleteMatch[1];
            console.log('[API] DELETE /api/categories/' + categoryId);
            
            // Remove from global storage
            globalCategories = globalCategories.filter(cat => cat.id !== categoryId);
            console.log('[API] Category deleted from global storage:', categoryId);
            
            res.statusCode = 204;
            res.end();
            return;
          }

          // Handle items API
          if (req.url?.startsWith('/items')) {
            if (req.url.split('?')[0] === '/items' && req.method === 'GET') {
              console.log('[API] GET /api/items');
              
              // Parse query parameters
              const url = new URL('http://localhost' + req.url);
              const activeFilter = url.searchParams.get('active');
              console.log('[API] Active filter:', activeFilter);
              
              // Use global items array for persistence
              let mockItems = [...globalItems];
              
              // Filter by active status if specified
              if (activeFilter === 'true') {
                mockItems = mockItems.filter(item => item.active === true);
                console.log('[API] Filtered to active items only:', mockItems.length, 'items');
              } else if (activeFilter === 'false') {
                mockItems = mockItems.filter(item => item.active === false);
                console.log('[API] Filtered to inactive items only:', mockItems.length, 'items');
              }
              
              console.log('[API] Returning items:', mockItems.map(i => ({ id: i.id, name: i.name, active: i.active })));
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(mockItems));
              return;
            }

            // Handle item updates (PATCH /items/:id)
            const itemUpdateMatch = req.url.match(/^\/items\/([^\/]+)$/);
            if (itemUpdateMatch && req.method === 'PATCH') {
              const itemId = itemUpdateMatch[1];
              console.log('[API] PATCH /api/items/' + itemId);
              
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const updateData = JSON.parse(body);
                  console.log('[API] Updating item:', itemId, 'with data:', updateData);
                  
                  // Find and update item in global storage
                  const itemIndex = globalItems.findIndex(item => item.id === itemId);
                  if (itemIndex === -1) {
                    console.error('[API] Item not found:', itemId);
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Item not found' }));
                    return;
                  }
                  
                  // Helper function to get category by ID
                  const getCategoryById = (categoryId) => {
                    return globalCategories.find(cat => cat.id === categoryId) || null;
                  };
                  
                  // Update the item
                  const existingItem = globalItems[itemIndex];
                  const updatedItem = {
                    ...existingItem,
                    name: updateData.name !== undefined ? updateData.name : existingItem.name,
                    price_cents: updateData.price !== undefined ? Math.round(parseFloat(updateData.price) * 100) : existingItem.price_cents,
                    category_id: updateData.categoryId !== undefined ? updateData.categoryId : existingItem.category_id,
                    active: updateData.active !== undefined ? updateData.active : existingItem.active,
                    sku: updateData.sku !== undefined ? updateData.sku : existingItem.sku,
                    updated_at: new Date().toISOString(),
                    category: updateData.categoryId !== undefined ? getCategoryById(updateData.categoryId) : existingItem.category
                  };
                  
                  // Update in global storage
                  globalItems[itemIndex] = updatedItem;
                  console.log('[API] Item updated in global storage:', updatedItem);
                  
                  console.log('[API] Item updated:', updatedItem);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(updatedItem));
                } catch (error) {
                  console.error('[API] Error updating item:', error);
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid request body' }));
                }
              });
              return;
            }

            // Handle item deletion (DELETE /items/:id)
            const itemDeleteMatch = req.url.match(/^\/items\/([^\/]+)$/);
            if (itemDeleteMatch && req.method === 'DELETE') {
              const itemId = itemDeleteMatch[1];
              console.log('[API] DELETE /api/items/' + itemId);
              
              // Remove from global storage
              globalItems = globalItems.filter(item => item.id !== itemId);
              console.log('[API] Item deleted from global storage:', itemId);
              
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.url === '/items' && req.method === 'POST') {
              console.log('[API] POST /api/items');
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const itemData = JSON.parse(body);
                  console.log('[API] Creating item:', itemData);
                  
                  // Helper function to get category by ID
                  const getCategoryById = (categoryId) => {
                    return globalCategories.find(cat => cat.id === categoryId) || null;
                  };
                  
                  // Convert price to cents
                  const priceString = itemData.price || '0';
                  const priceFloat = parseFloat(priceString);
                  const priceCents = isNaN(priceFloat) ? 0 : Math.round(priceFloat * 100);
                  console.log('[API] Price conversion:', itemData.price, '→', priceCents, 'cents');
                  
                  const newItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    tenant_id: '00000000-0000-0000-0000-000000000001',
                    category_id: itemData.categoryId || null,
                    name: itemData.name,
                    price_cents: priceCents,
                    active: itemData.active !== false,
                    sku: itemData.sku || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    category: getCategoryById(itemData.categoryId)
                  };
                  
                  // Add to global storage
                  globalItems.push(newItem);
                  
                  console.log('[API] Item created:', newItem);
                  res.statusCode = 201;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(newItem));
                } catch (error) {
                  console.error('[API] Error creating item:', error);
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid request body' }));
                }
              });
              return;
            }
          }
          
          // If no API route matches, pass to next middleware (let Vite handle it)
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['qrcode'],
  },
});