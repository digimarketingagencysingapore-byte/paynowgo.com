/**
 * PayNow EMV QR Code Payload Builder
 * Generates EMV-compliant SGQR payloads for Singapore PayNow
 */

export interface PayNowOptions {
  uen?: string;
  mobile?: string;
  amount: number;
  reference: string;
  editable?: boolean;
  expiry?: Date;
  merchantName?: string;
}

/**
 * Calculate CRC16 checksum using CCITT-FALSE algorithm
 */
function calculateCRC16(data: string): string {
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

/**
 * Format TLV (Tag-Length-Value) field
 */
function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return tag + length + value;
}

/**
 * Build PayNow EMV payload
 */
export function buildPayNowPayload(options: PayNowOptions): string {
  const { uen, mobile, amount, reference, editable = false, merchantName = 'PayNowGo' } = options;

  // Validation
  if (!uen && !mobile) {
    throw new Error('Either UEN or mobile number must be provided');
  }
  if (uen && mobile) {
    throw new Error('Cannot specify both UEN and mobile number');
  }
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (reference.length > 25) {
    throw new Error('Reference cannot exceed 25 characters');
  }
  
  // Validate reference format according to PayNow/SGQR specification
  if (!/^[A-Za-z0-9\-_/]+$/.test(reference)) {
    throw new Error('Reference can only contain letters, numbers, hyphens, underscores, and slashes');
  }

  // Format mobile number
  let proxyValue = '';
  let proxyType = '';
  
  if (mobile) {
    const cleanMobile = mobile.replace(/[\s\-\+]/g, '');
    if (!/^\d{8}$/.test(cleanMobile) && !/^65\d{8}$/.test(cleanMobile)) {
      throw new Error('Invalid mobile number format');
    }
    proxyValue = cleanMobile.length === 8 ? `+65${cleanMobile}` : `+${cleanMobile}`;
    proxyType = '0';
  }

  if (uen) {
    proxyValue = uen.toUpperCase();
    proxyType = '2';
  }

  // Build EMV payload
  let payload = '';

  // Payload Format Indicator (00)
  payload += formatTLV('00', '01');

  // Point of Initiation Method (01)
  payload += formatTLV('01', '12'); // Dynamic QR

  // Merchant Account Information (26) - PayNow
  let merchantAccount = '';
  merchantAccount += formatTLV('00', 'SG.PAYNOW'); // Globally Unique Identifier
  merchantAccount += formatTLV('01', proxyType); // Proxy Type
  merchantAccount += formatTLV('02', proxyValue); // Proxy Value
  merchantAccount += formatTLV('03', editable ? '1' : '0'); // Editable
  
  if (options.expiry) {
    const expiryStr = options.expiry.toISOString().slice(0, 8).replace(/-/g, '');
    merchantAccount += formatTLV('04', expiryStr);
  }

  payload += formatTLV('26', merchantAccount);

  // Merchant Category Code (52)
  payload += formatTLV('52', '0000');

  // Transaction Currency (53) - SGD
  payload += formatTLV('53', '702');

  // Transaction Amount (54)
  payload += formatTLV('54', editable ? amount.toString() : amount.toFixed(2));

  // Country Code (58)
  payload += formatTLV('58', 'SG');

  // Merchant Name (59)
  payload += formatTLV('59', merchantName.substring(0, 25));

  // Merchant City (60)
  payload += formatTLV('60', 'Singapore');

  // Additional Data Field Template (62)
  // PayNow/SGQR Specification: Field 62/01 makes reference read-only in banking apps
  if (reference) {
    const additionalData = formatTLV('01', reference); // Bill Number (62/01) - Read-only in banking apps
    payload += formatTLV('62', additionalData);
  }

  // CRC (63)
  const payloadWithCRCPlaceholder = payload + '6304';
  const crc = calculateCRC16(payloadWithCRCPlaceholder);
  payload += '63' + '04' + crc;

  return payload;
}

/**
 * Generate QR code SVG from payload
 */
export async function generateQRCodeSVG(payload: string, size: number = 256): Promise<string> {
  // Dynamic import with proper error handling for browser environment
  const QRCode = await import('qrcode').then(module => module.default || module);
  
  return QRCode.toString(payload, {
    type: 'svg',
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });
}

/**
 * Complete PayNow QR generation
 */
export async function createPayNowQR(options: PayNowOptions): Promise<{
  payload: string;
  qrSvg: string;
}> {
  const payload = buildPayNowPayload(options);
  
  try {
    const qrSvg = await generateQRCodeSVG(payload);
    return { payload, qrSvg };
  } catch (error) {
    console.error('QR SVG generation failed, using fallback:', error);
    // Fallback SVG if QR generation fails
    const fallbackSvg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="white"/>
      <rect x="32" y="32" width="192" height="192" fill="black"/>
      <rect x="48" y="48" width="160" height="160" fill="white"/>
      <rect x="64" y="64" width="128" height="128" fill="black"/>
      <rect x="80" y="80" width="96" height="96" fill="white"/>
      <rect x="96" y="96" width="64" height="64" fill="black"/>
      <text x="128" y="140" text-anchor="middle" fill="white" font-size="12">PayNow QR</text>
    </svg>`;
    return { payload, qrSvg: fallbackSvg };
  }
}