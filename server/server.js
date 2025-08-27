const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline styles for demo
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store for SSE connections
const sseConnections = new Map();

// PayNow EMV QR Code Generator
function buildPayNowEMV(options) {
  const { uen, mobile, amount, reference, merchantName = 'PayNowGo' } = options;
  
  if (!uen && !mobile) throw new Error('Either UEN or mobile required');
  if (uen && mobile) throw new Error('Cannot specify both UEN and mobile');
  
  // Format proxy value and type
  let proxyValue = '';
  let proxyType = '';
  
  if (mobile) {
    const cleanMobile = mobile.replace(/[\s\-\+]/g, '');
    proxyValue = cleanMobile.length === 8 ? `+65${cleanMobile}` : `+${cleanMobile}`;
    proxyType = '0';
  }
  
  if (uen) {
    proxyValue = uen.toUpperCase();
    proxyType = '2';
  }
  
  // Helper function to format TLV
  function formatTLV(tag, value) {
    const length = value.length.toString().padStart(2, '0');
    return tag + length + value;
  }
  
  // Build EMV payload
  let payload = '';
  
  // Payload Format Indicator (00)
  payload += formatTLV('00', '01');
  
  // Point of Initiation Method (01)
  payload += formatTLV('01', '12'); // Dynamic QR
  
  // Merchant Account Information (26) - PayNow
  let merchantAccount = '';
  merchantAccount += formatTLV('00', 'SG.PAYNOW');
  merchantAccount += formatTLV('01', proxyType);
  merchantAccount += formatTLV('02', proxyValue);
  merchantAccount += formatTLV('03', '0'); // Non-editable
  merchantAccount += formatTLV('04', '99991231'); // Far future expiry
  
  payload += formatTLV('26', merchantAccount);
  
  // Merchant Category Code (52)
  payload += formatTLV('52', '0000');
  
  // Transaction Currency (53) - SGD
  payload += formatTLV('53', '702');
  
  // Transaction Amount (54)
  payload += formatTLV('54', amount.toFixed(2));
  
  // Country Code (58)
  payload += formatTLV('58', 'SG');
  
  // Merchant Name (59)
  payload += formatTLV('59', merchantName.substring(0, 25));
  
  // Merchant City (60)
  payload += formatTLV('60', 'Singapore');
  
  // Additional Data Field Template (62) - Reference
  if (reference) {
    const additionalData = formatTLV('01', reference);
    payload += formatTLV('62', additionalData);
  }
  
  // CRC (63) - Calculate checksum
  const payloadWithCRCPlaceholder = payload + '6304';
  const crc = calculateCRC16(payloadWithCRCPlaceholder);
  payload += '63' + '04' + crc;
  
  return payload;
}

// CRC16 calculation for EMV
function calculateCRC16(data) {
  const polynomial = 0x1021;
  let crc = 0xFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Generate reference number
function generateReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `POS${dateStr}${timeStr}${random}`;
}

// Broadcast update to all SSE connections for a terminal
function broadcastToTerminal(terminalId, data) {
  const connections = sseConnections.get(terminalId) || [];
  console.log(`[SSE] Broadcasting to ${connections.length} connections for terminal ${terminalId}`);
  
  connections.forEach((res, index) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(`[SSE] Error sending to connection ${index}:`, error);
      // Remove dead connection
      connections.splice(index, 1);
    }
  });
  
  // Update connections map
  if (connections.length > 0) {
    sseConnections.set(terminalId, connections);
  } else {
    sseConnections.delete(terminalId);
  }
}

// API Routes

// Create payment intent
app.post('/api/payment_intents', async (req, res) => {
  try {
    const { merchant_id, terminal_id, amount, currency = 'SGD' } = req.body;
    
    console.log('[API] Creating payment intent:', { merchant_id, terminal_id, amount, currency });
    
    // Validation
    if (!merchant_id || !terminal_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    
    // Get merchant info
    const merchant = await db.getMerchant(merchant_id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Get terminal info
    const terminal = await db.getTerminal(terminal_id);
    if (!terminal || terminal.merchant_id !== merchant_id) {
      return res.status(404).json({ error: 'Terminal not found' });
    }
    
    // Generate reference
    const reference = generateReference();
    
    // Generate PayNow EMV payload
    const emvPayload = buildPayNowEMV({
      uen: merchant.uen,
      mobile: merchant.mobile,
      amount: parseFloat(amount),
      reference: reference,
      merchantName: merchant.name
    });
    
    // Generate QR code SVG
    const qrSvg = await QRCode.toString(emvPayload, {
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#1F2937',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Create payment intent
    const paymentIntent = {
      id: uuidv4(),
      merchant_id,
      terminal_id,
      amount: parseFloat(amount),
      currency,
      reference,
      qrPayload: emvPayload,
      qrSvg,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };
    
    // Store payment intent
    await db.createPaymentIntent(paymentIntent);
    
    console.log('[API] Payment intent created:', paymentIntent.id);
    
    // Broadcast to terminal displays
    broadcastToTerminal(terminal_id, {
      type: 'payment_intent_created',
      payment_intent: paymentIntent,
      merchant: merchant,
      terminal: terminal
    });
    
    res.status(201).json(paymentIntent);
  } catch (error) {
    console.error('[API] Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get terminal state
app.get('/api/terminal_state', async (req, res) => {
  try {
    const { terminal_id } = req.query;
    
    if (!terminal_id) {
      return res.status(400).json({ error: 'terminal_id is required' });
    }
    
    console.log('[API] Getting terminal state for:', terminal_id);
    
    // Get latest payment intent for terminal
    const paymentIntent = await db.getLatestPaymentIntent(terminal_id);
    const terminal = await db.getTerminal(terminal_id);
    const merchant = terminal ? await db.getMerchant(terminal.merchant_id) : null;
    
    if (!terminal) {
      return res.status(404).json({ error: 'Terminal not found' });
    }
    
    res.json({
      terminal,
      merchant,
      payment_intent: paymentIntent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error getting terminal state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark payment as paid
app.post('/api/payment_intents/:id/paid', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[API] Marking payment intent as paid:', id);
    
    const paymentIntent = await db.getPaymentIntent(id);
    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }
    
    // Update status
    const updatedIntent = await db.updatePaymentIntentStatus(id, 'paid');
    
    // Broadcast update
    broadcastToTerminal(paymentIntent.terminal_id, {
      type: 'payment_completed',
      payment_intent: updatedIntent
    });
    
    res.json(updatedIntent);
  } catch (error) {
    console.error('[API] Error marking payment as paid:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel payment
app.post('/api/payment_intents/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[API] Canceling payment intent:', id);
    
    const paymentIntent = await db.getPaymentIntent(id);
    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }
    
    // Update status
    const updatedIntent = await db.updatePaymentIntentStatus(id, 'canceled');
    
    // Broadcast update
    broadcastToTerminal(paymentIntent.terminal_id, {
      type: 'payment_canceled',
      payment_intent: updatedIntent
    });
    
    res.json(updatedIntent);
  } catch (error) {
    console.error('[API] Error canceling payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// SSE endpoint for terminal updates
app.get('/api/terminal_stream/:terminal_id', (req, res) => {
  const { terminal_id } = req.params;
  
  console.log('[SSE] New connection for terminal:', terminal_id);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', terminal_id })}\n\n`);
  
  // Add connection to store
  if (!sseConnections.has(terminal_id)) {
    sseConnections.set(terminal_id, []);
  }
  sseConnections.get(terminal_id).push(res);
  
  // Send current state immediately
  db.getLatestPaymentIntent(terminal_id).then(paymentIntent => {
    if (paymentIntent) {
      res.write(`data: ${JSON.stringify({
        type: 'current_state',
        payment_intent: paymentIntent
      })}\n\n`);
    }
  });
  
  // Handle client disconnect
  req.on('close', () => {
    console.log('[SSE] Connection closed for terminal:', terminal_id);
    const connections = sseConnections.get(terminal_id) || [];
    const index = connections.indexOf(res);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    
    if (connections.length === 0) {
      sseConnections.delete(terminal_id);
    } else {
      sseConnections.set(terminal_id, connections);
    }
  });
});

// Get all merchants (for demo)
app.get('/api/merchants', async (req, res) => {
  try {
    const merchants = await db.getAllMerchants();
    res.json(merchants);
  } catch (error) {
    console.error('[API] Error getting merchants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get terminals for merchant (for demo)
app.get('/api/merchants/:merchant_id/terminals', async (req, res) => {
  try {
    const { merchant_id } = req.params;
    const terminals = await db.getTerminalsByMerchant(merchant_id);
    res.json(terminals);
  } catch (error) {
    console.error('[API] Error getting terminals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Routes for HTML pages
app.get('/display/:merchant_id/:terminal_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: Array.from(sseConnections.keys()).length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await db.initialize();
    console.log('[DB] Database initialized');
    
    app.listen(PORT, () => {
      console.log(`[SERVER] PayNowGo POS Terminal running on port ${PORT}`);
      console.log(`[SERVER] Demo: http://localhost:${PORT}/demo`);
      console.log(`[SERVER] Display: http://localhost:${PORT}/display/{merchant_id}/{terminal_id}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();