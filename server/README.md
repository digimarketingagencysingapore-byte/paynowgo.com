# PayNowGo POS Terminal Display System

A Node.js + Express backend system for real-time QR payment displays at checkout counters.

## 🚀 Features

- **Fixed Terminal URLs** - Each checkout counter has a permanent display URL
- **Real-time Updates** - QR codes appear instantly via Server-Sent Events (SSE)
- **Multi-Terminal Support** - Multiple terminals per merchant
- **Singapore PayNow** - EMV-compliant PayNow QR code generation
- **Redis Support** - Optional Redis for production scaling
- **In-Memory Fallback** - Works without Redis for development

## 🏗 Architecture

```
Staff Device (Demo Form) → API → Database → SSE → Customer Display
```

### Entities
- **Merchant**: Business account with PayNow details
- **Terminal**: Checkout counter belonging to a merchant  
- **PaymentIntent**: Individual payment with QR code and status

### API Endpoints
- `POST /api/payment_intents` - Create new payment QR
- `GET /api/terminal_state` - Get current terminal state
- `GET /api/terminal_stream/:id` - SSE stream for real-time updates
- `POST /api/payment_intents/:id/paid` - Mark payment as completed
- `POST /api/payment_intents/:id/cancel` - Cancel payment

## 🛠 Installation

```bash
cd server
npm install
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
REDIS_URL=redis://localhost:6379  # Optional
```

## 🚀 Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📱 Usage

### 1. Open Demo Form
Visit: `http://localhost:3001/demo`
- Select merchant and terminal
- Enter payment amount
- Generate QR code

### 2. Open Customer Display
Visit: `http://localhost:3001/display/{merchant_id}/{terminal_id}`
- Shows live QR codes
- Updates automatically when staff creates payments
- Fixed URL per terminal

### 3. Example URLs
- **Demo Form**: `http://localhost:3001/demo`
- **Display 1**: `http://localhost:3001/display/merchant_001/terminal_001`
- **Display 2**: `http://localhost:3001/display/merchant_001/terminal_002`

## 🔄 Workflow

1. **Staff** opens demo form on any device
2. **Staff** selects terminal and creates payment
3. **QR code** appears instantly on that terminal's display
4. **Customer** scans QR with banking app
5. **Staff** marks payment as paid/canceled
6. **Display** returns to idle state

## 🏪 Demo Data

### Merchants
- **Demo Restaurant Pte Ltd** (UEN: T05LL1103B, Mobile: +6591234567)
- **Ayasofya Restaurant** (UEN: 202323584D, Mobile: +6586854221)

### Terminals
- **merchant_001/terminal_001** - Demo Restaurant Counter 1
- **merchant_001/terminal_002** - Demo Restaurant Counter 2  
- **merchant_002/terminal_003** - Ayasofya Main Terminal

## 🔧 Technical Details

### PayNow EMV QR Generation
- Compliant with Singapore PayNow/SGQR standards
- Supports both UEN (business) and mobile (individual) payments
- Non-editable amounts for security
- Reference numbers in field 62/01 (read-only in banking apps)

### Real-time Communication
- **Server-Sent Events (SSE)** for live updates
- Automatic reconnection on network issues
- Cross-device synchronization
- Minimal latency (<100ms)

### Data Storage
- **Redis** for production (pub/sub, persistence)
- **In-memory** fallback for development
- **TTL** for automatic cleanup of expired payments

## 🧪 Testing

```bash
npm test
```

## 📦 Production Deployment

1. Set up Redis server
2. Configure environment variables
3. Use process manager (PM2)
4. Set up reverse proxy (nginx)
5. Enable HTTPS

```bash
# PM2 deployment
pm2 start server.js --name paynowgo-terminal
pm2 save
pm2 startup
```

## 🔒 Security

- Input validation on all endpoints
- CORS configuration
- Helmet.js security headers
- Payment intent expiration (15 minutes)
- Terminal isolation (each terminal only sees its own payments)

## 📊 Monitoring

- Health check endpoint: `/health`
- SSE connection tracking
- Error logging
- Performance metrics

---

**© 2025 PayNowGo. Singapore PayNow POS Terminal System.**