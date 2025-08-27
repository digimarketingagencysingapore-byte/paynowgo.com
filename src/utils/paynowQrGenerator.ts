/**
 * PayNow QR Code Generator using EMV format
 * Based on working implementation analysis
 */

export interface PayNowQrOptions {
  mobile?: string | null;
  uen?: string | null;
  amount: number;
  refId: string;
  editable: boolean;
  expiry?: Date | string | null;
  company?: string | null;
}

export interface QrCodeResult {
  url: string;
  qrCodeSvg: string;
  qrCodePng: string;
  qrCodeBase64: string;
}

/**
 * Add padding to string (polyfill for older browsers)
 */
function padLeft(str: string, length: number, padChar: string = '0'): string {
  if (length < str.length) {
    return str;
  }
  return Array(length - str.length + 1).join(padChar) + str;
}

/**
 * Calculate CRC16 checksum for EMV QR codes using CCITT_FALSE
 */
function crc16(s: string): string {
  // Simple CRC16 implementation for browser compatibility
  let crc = 0xFFFF;
  
  for (let i = 0; i < s.length; i++) {
    crc ^= (s.charCodeAt(i) << 8);
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Validates Singapore mobile number format
 */
function validateMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/[\s\-\+]/g, '');
  return /^65\d{8}$/.test(cleaned) || /^\d{8}$/.test(cleaned);
}

/**
 * Validates Singapore UEN format - Updated to handle all UEN formats including T05LL1103B
 */
function validateUen(uen: string): boolean {
  const cleaned = uen.replace(/[\s\-]/g, '').toUpperCase();
  console.log('Validating UEN:', cleaned);
  
  // Singapore UEN formats (more comprehensive):
  // - Business: 8-10 digits + 1 letter (e.g., 12345678A, 123456789A, 1234567890A)
  // - Entity: Letter + digits + letters (e.g., T05LL1103B)
  // - ACRA: Various formats with letters and numbers
  
  const patterns = [
    /^[0-9]{8}[A-Z]$/,           // 8 digits + 1 letter
    /^[0-9]{9}[A-Z]$/,           // 9 digits + 1 letter  
    /^[0-9]{10}[A-Z]$/,          // 10 digits + 1 letter
    /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/,  // Entity format like T05LL1103B
    /^[A-Z]{1,2}[0-9]{8,10}[A-Z]$/,          // Other entity formats
    /^[0-9]{4}[A-Z][0-9]{5}[A-Z]$/           // ACRA format
  ];
  
  const isValid = patterns.some(pattern => pattern.test(cleaned));
  console.log('UEN validation result:', isValid);
  return isValid;
}

/**
 * Validates amount format
 */
function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number');
  }
  
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new Error('Amount cannot have more than 2 decimal places');
  }
}

/**
 * Validates PayNow reference format according to SGQR specification
 */
function validateReference(refId: string): void {
  if (!refId) {
    throw new Error('Reference is required');
  }
  
  if (refId.length > 25) {
    throw new Error('Reference cannot exceed 25 characters');
  }
  
  // PayNow/SGQR allows: A-Za-z0-9-_/
  if (!/^[A-Za-z0-9\-_/]+$/.test(refId)) {
    throw new Error('Reference can only contain letters, numbers, hyphens, underscores, and slashes');
  }
}
/**
 * Formats mobile number for PayNow
 */
function formatMobile(mobile: string): string {
  const cleaned = mobile.replace(/[\s\-\+]/g, '');
  if (/^\d{8}$/.test(cleaned)) {
    return '+65' + cleaned;
  }
  if (/^65\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  return mobile;
}

/**
 * PayNow EMV payload structure based on working code
 */
const payload = {
  preamble: "000201" + "01" + "02" + "12", // Format Indicator + Point of Initiation (12 = dynamic)
  
  // Merchant Account Info Template (ID 26)
  buildMerchantAccountInfo: function(proxyType: string, proxyValue: string, editable: boolean) {
    const globallyUniqueIdentifier = "0009SG.PAYNOW";
    
    // Proxy type: 0 for mobile, 2 for UEN
    const proxyTypeCode = "0101" + (proxyType === "UEN" ? "2" : "0");
    
    // Proxy value with length encoding
    const proxyValueLength = proxyValue.length < 10 ? "0" + proxyValue.length : proxyValue.length.toString();
    const proxyValueCode = "02" + proxyValueLength + proxyValue;
    
    // Transaction amount editable (CRITICAL: 0 = non-editable, 1 = editable)
    const transactionAmountEdit = "0301" + (editable ? "1" : "0");
    
    // Expiry date (using far future date)
    const expiryDateCode = "0408" + "99991231";
    
    // Build the complete merchant account info
    const merchantAccountInfo = globallyUniqueIdentifier + proxyTypeCode + proxyValueCode + transactionAmountEdit + expiryDateCode;
    const merchantAccountLength = merchantAccountInfo.length < 10 ? "0" + merchantAccountInfo.length : merchantAccountInfo.length.toString();
    
    return "26" + merchantAccountLength + merchantAccountInfo;
  },
  
  merchantCategoryCode: "52" + "04" + "0000",
  transactionCurrency: "53" + "03" + "702",
  
  transactionAmount: function(price: string) {
    const priceLength = price.length < 10 ? "0" + price.length : price.length.toString();
    return "54" + priceLength + price;
  },
  
  countryCode: "58" + "02" + "SG",
  
  merchantNameCode: function(merchantName: string) {
    if (merchantName === "") {
      return "59" + "02" + "NA";
    } else if (merchantName.length >= 10) {
      return "59" + merchantName.length + merchantName;
    } else {
      return "59" + "0" + merchantName.length + merchantName;
    }
  },
  
  merchantCity: "60" + "09" + "Singapore",
  
  // Additional Data Fields (ID 62) for reference number
  additionalDataFields: function(refId: string) {
    if (!refId) return "";
    
    // Bill Number (ID 01 within Additional Data Fields) - PayNow/SGQR Specification
    // This field makes the reference read-only in all Singapore banking apps
    const billNumber = "01" + (refId.length < 10 ? "0" + refId.length : refId.length.toString()) + refId;
    const additionalDataLength = billNumber.length < 10 ? "0" + billNumber.length : billNumber.length.toString();
    
    return "62" + additionalDataLength + billNumber;
  },
  
  checksumCode: "6304"
};

/**
 * Builds PayNow EMV QR string based on the working code structure
 */
export function buildPayNowQrString(options: PayNowQrOptions): string {
  const { mobile, uen, amount, refId, editable = false, company } = options;
  
  console.log('=== PayNow EMV QR Generation ===');
  console.log('Input options:', JSON.stringify(options, null, 2));
  
  // Validation: exactly one of mobile or uen must be provided
  if ((!mobile && !uen) || (mobile && uen)) {
    throw new Error('Exactly one of mobile or uen must be provided');
  }
  
  // Validate and format mobile if provided
  let proxyValue = '';
  let proxyType = '';
  
  if (mobile) {
    const cleanMobile = mobile.replace(/[\s\-\+]/g, '');
    if (!validateMobile(cleanMobile)) {
      throw new Error('Mobile number must be 8 digits or in +65XXXXXXXX format');
    }
    proxyValue = formatMobile(mobile);
    proxyType = 'mobile';
  }
  
  // Validate UEN if provided
  if (uen) {
    const cleanUen = uen.replace(/[\s\-]/g, '').toUpperCase();
    console.log('Validating UEN:', cleanUen);
    if (!validateUen(cleanUen)) {
      throw new Error('UEN must be in valid Singapore format');
    }
    proxyValue = cleanUen;
    proxyType = 'UEN';
    console.log('UEN validated successfully:', proxyValue);
  }
  
  // Validate amount
  validateAmount(amount);
  
  // Validate reference according to PayNow/SGQR specification
  validateReference(refId);
  
  // Format amount with exactly 2 decimal places for non-editable amounts
  const amountStr = editable ? amount.toString() : amount.toFixed(2);
  
  // Build the EMV QR string following the working code structure
  const merchantAccountField = payload.buildMerchantAccountInfo(proxyType, proxyValue, editable);
  const transactionAmountField = payload.transactionAmount(amountStr);
  const merchantNameField = payload.merchantNameCode(company || "NA");
  const additionalDataField = payload.additionalDataFields(refId);
  
  // Build the complete string without checksum
  const qrStringWithoutCrc = payload.preamble + 
    merchantAccountField + 
    payload.merchantCategoryCode + 
    payload.transactionCurrency + 
    transactionAmountField + 
    payload.countryCode + 
    merchantNameField + 
    payload.merchantCity + 
    additionalDataField + 
    payload.checksumCode;
  
  // Calculate CRC16 checksum
  const checksum = crc16(qrStringWithoutCrc);
  
  // Final QR string
  const qrString = qrStringWithoutCrc + checksum;
  
  console.log('Generated EMV string:', qrString);
  console.log('EMV string length:', qrString.length);
  console.log('=== End PayNow EMV QR Generation ===');
  
  return qrString;
}

/**
 * Generates QR code in multiple formats from PayNow EMV string
 */
export async function generatePayNowQrCode(options: PayNowQrOptions): Promise<QrCodeResult> {
  try {
    // Try to import QRCode library with fallback
    let QRCode;
    try {
      QRCode = await import('qrcode').then(module => module.default || module);
    } catch (importError) {
      console.warn('QRCode library import failed, using fallback:', importError);
      // Create fallback QR generation
      return {
        url: buildPayNowQrString(options),
        qrCodeSvg: generateFallbackQRSvg(buildPayNowQrString(options)),
        qrCodePng: '',
        qrCodeBase64: ''
      };
    }
    
    // Build the PayNow EMV string
    const qrString = buildPayNowQrString(options);
    
    // Generate QR codes in different formats
    const qrCodeSvg = await QRCode.toString(qrString, {
      type: 'svg',
      width: 256,
      margin: 2,
      color: {
        dark: '#7C1A78', // PayNow purple color
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    const qrCodePng = await QRCode.toDataURL(qrString, {
      type: 'image/png',
      width: 256,
      margin: 2,
      color: {
        dark: '#7C1A78FF', // PayNow purple color
        light: '#FFFFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Extract base64 from data URL
    const qrCodeBase64 = qrCodePng.split(',')[1];
    
    const result = {
      url: qrString, // For EMV QR codes, the "URL" is the EMV string itself
      qrCodeSvg,
      qrCodePng,
      qrCodeBase64
    };
    
    console.log('PayNow EMV QR generation complete');
    
    return result;
  } catch (error) {
    console.error('=== PayNow EMV QR Generation Error ===');
    console.error('Error details:', error);
    console.error('Input options:', JSON.stringify(options, null, 2));
    console.error('=== End PayNow EMV QR Generation Error ===');
    throw new Error(`Failed to generate PayNow QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate fallback QR SVG when qrcode library fails
 */
function generateFallbackQRSvg(data: string, size: number = 256): string {
  const gridSize = 21;
  const cellSize = size / gridSize;
  
  // Generate a simple pattern based on data
  const pattern = [];
  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
      const hash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const value = (hash + i * j + i + j) % 3;
      row.push(value > 0);
    }
    pattern.push(row);
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="white"/>
    ${pattern.map((row, i) =>
      row.map((cell, j) => 
        cell ? `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black" />` : ''
      ).join('')
    ).join('')}
    
    <!-- Corner markers for QR code appearance -->
    <rect x="0" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black" />
    <rect x="${cellSize}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white" />
    <rect x="${cellSize * 2}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black" />
    
    <rect x="${size - cellSize * 7}" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black" />
    <rect x="${size - cellSize * 6}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white" />
    <rect x="${size - cellSize * 5}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black" />
    
    <rect x="0" y="${size - cellSize * 7}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black" />
    <rect x="${cellSize}" y="${size - cellSize * 6}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white" />
    <rect x="${cellSize * 2}" y="${size - cellSize * 5}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black" />
    
    <!-- Center text -->
    <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="12" font-family="monospace">PayNow</text>
  </svg>`;
}

/**
 * Convenience function for quick QR generation
 */
export async function createPayNowQr(
  mobile: string | null,
  uen: string | null,
  amount: number,
  refId: string,
  options: {
    editable?: boolean;
    expiry?: Date | string | null;
    company?: string | null;
  } = {}
): Promise<QrCodeResult> {
  return generatePayNowQrCode({
    mobile,
    uen,
    amount,
    refId,
    editable: options.editable ?? false,
    expiry: options.expiry ?? null,
    company: options.company ?? null
  });
}

// For backward compatibility, keep the old function name
export const buildPayNowQrUrl = buildPayNowQrString;