const redis = require('redis');

class Database {
  constructor() {
    this.client = null;
    this.isRedisAvailable = false;
    this.memoryStore = {
      merchants: new Map(),
      terminals: new Map(),
      paymentIntents: new Map()
    };
  }

  async initialize() {
    // Try to connect to Redis first
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.client.connect();
      this.isRedisAvailable = true;
      console.log('[DB] Connected to Redis');
    } catch (error) {
      console.warn('[DB] Redis not available, using in-memory store:', error.message);
      this.isRedisAvailable = false;
    }
    
    // Initialize demo data
    await this.initializeDemoData();
  }

  async initializeDemoData() {
    console.log('[DB] Initializing demo data...');
    
    // Demo merchants
    const merchants = [
      {
        merchant_id: 'merchant_001',
        name: 'Demo Restaurant Pte Ltd',
        uen: 'T05LL1103B',
        mobile: '91234567',
        created_at: new Date().toISOString()
      },
      {
        merchant_id: 'merchant_002', 
        name: 'Ayasofya Restaurant',
        uen: '202323584D',
        mobile: '86854221',
        created_at: new Date().toISOString()
      }
    ];
    
    // Demo terminals
    const terminals = [
      {
        terminal_id: 'terminal_001',
        merchant_id: 'merchant_001',
        name: 'Counter 1',
        location: 'Main Counter',
        created_at: new Date().toISOString()
      },
      {
        terminal_id: 'terminal_002',
        merchant_id: 'merchant_001', 
        name: 'Counter 2',
        location: 'Side Counter',
        created_at: new Date().toISOString()
      },
      {
        terminal_id: 'terminal_003',
        merchant_id: 'merchant_002',
        name: 'Main Terminal',
        location: 'Front Desk',
        created_at: new Date().toISOString()
      }
    ];
    
    // Store demo data
    for (const merchant of merchants) {
      await this.storeMerchant(merchant);
    }
    
    for (const terminal of terminals) {
      await this.storeTerminal(terminal);
    }
    
    console.log('[DB] Demo data initialized');
  }

  async storeMerchant(merchant) {
    if (this.isRedisAvailable) {
      await this.client.hSet('merchants', merchant.merchant_id, JSON.stringify(merchant));
    } else {
      this.memoryStore.merchants.set(merchant.merchant_id, merchant);
    }
  }

  async storeTerminal(terminal) {
    if (this.isRedisAvailable) {
      await this.client.hSet('terminals', terminal.terminal_id, JSON.stringify(terminal));
    } else {
      this.memoryStore.terminals.set(terminal.terminal_id, terminal);
    }
  }

  async getMerchant(merchantId) {
    if (this.isRedisAvailable) {
      const data = await this.client.hGet('merchants', merchantId);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStore.merchants.get(merchantId) || null;
    }
  }

  async getAllMerchants() {
    if (this.isRedisAvailable) {
      const data = await this.client.hGetAll('merchants');
      return Object.values(data).map(item => JSON.parse(item));
    } else {
      return Array.from(this.memoryStore.merchants.values());
    }
  }

  async getTerminal(terminalId) {
    if (this.isRedisAvailable) {
      const data = await this.client.hGet('terminals', terminalId);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStore.terminals.get(terminalId) || null;
    }
  }

  async getTerminalsByMerchant(merchantId) {
    if (this.isRedisAvailable) {
      const data = await this.client.hGetAll('terminals');
      return Object.values(data)
        .map(item => JSON.parse(item))
        .filter(terminal => terminal.merchant_id === merchantId);
    } else {
      return Array.from(this.memoryStore.terminals.values())
        .filter(terminal => terminal.merchant_id === merchantId);
    }
  }

  async createPaymentIntent(paymentIntent) {
    const key = `payment_intent:${paymentIntent.id}`;
    
    if (this.isRedisAvailable) {
      await this.client.setEx(key, 3600, JSON.stringify(paymentIntent)); // 1 hour TTL
      
      // Also store latest for terminal
      const terminalKey = `latest_payment:${paymentIntent.terminal_id}`;
      await this.client.setEx(terminalKey, 3600, JSON.stringify(paymentIntent));
    } else {
      this.memoryStore.paymentIntents.set(paymentIntent.id, paymentIntent);
    }
    
    return paymentIntent;
  }

  async getPaymentIntent(id) {
    if (this.isRedisAvailable) {
      const data = await this.client.get(`payment_intent:${id}`);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStore.paymentIntents.get(id) || null;
    }
  }

  async getLatestPaymentIntent(terminalId) {
    if (this.isRedisAvailable) {
      const data = await this.client.get(`latest_payment:${terminalId}`);
      return data ? JSON.parse(data) : null;
    } else {
      // Find latest payment intent for terminal from memory
      const intents = Array.from(this.memoryStore.paymentIntents.values())
        .filter(intent => intent.terminal_id === terminalId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return intents[0] || null;
    }
  }

  async updatePaymentIntentStatus(id, status) {
    const paymentIntent = await this.getPaymentIntent(id);
    if (!paymentIntent) return null;
    
    paymentIntent.status = status;
    paymentIntent.updated_at = new Date().toISOString();
    
    if (this.isRedisAvailable) {
      await this.client.setEx(`payment_intent:${id}`, 3600, JSON.stringify(paymentIntent));
      
      // Update latest for terminal if still latest
      const latest = await this.getLatestPaymentIntent(paymentIntent.terminal_id);
      if (latest && latest.id === id) {
        await this.client.setEx(`latest_payment:${paymentIntent.terminal_id}`, 3600, JSON.stringify(paymentIntent));
      }
    } else {
      this.memoryStore.paymentIntents.set(id, paymentIntent);
    }
    
    return paymentIntent;
  }

  async close() {
    if (this.client && this.isRedisAvailable) {
      await this.client.quit();
      console.log('[DB] Redis connection closed');
    }
  }
}

module.exports = new Database();