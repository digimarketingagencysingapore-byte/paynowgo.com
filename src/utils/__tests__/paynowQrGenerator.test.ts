import { buildPayNowQrString, generatePayNowQrCode, createPayNowQr } from '../paynowQrGenerator';

describe('PayNow EMV QR Generator', () => {
  describe('buildPayNowQrString', () => {
    test('should generate EMV string for mobile payment', () => {
      const emvString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 1.00,
        refId: 'test',
        editable: false,
        company: 'My Restaurant'
      });
      
      expect(emvString).toMatch(/^000201010211/); // Should start with preamble
      expect(emvString).toContain('SG.PAYNOW'); // Should contain PayNow identifier
      expect(emvString).toMatch(/6304[A-F0-9]{4}$/); // Should end with checksum
    });

    test('should generate EMV string for UEN payment', () => {
      const emvString = buildPayNowQrString({
        mobile: null,
        uen: '201912345Z',
        amount: 12.90,
        refId: 'TBL12-0001',
        editable: false,
        company: 'My Restaurant'
      });
      
      expect(emvString).toMatch(/^000201010211/);
      expect(emvString).toContain('SG.PAYNOW');
      expect(emvString).toContain('201912345Z');
      expect(emvString).toContain('12.9'); // Amount should be included
      expect(emvString).toMatch(/6304[A-F0-9]{4}$/);
    });

    test('should include reference number in additional data fields', () => {
      const emvString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10.00,
        refId: 'REF123',
        editable: false
      });
      
      expect(emvString).toContain('REF123'); // Reference should be included
    });

    test('should handle editable amounts correctly', () => {
      const editableString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10.00,
        refId: 'test',
        editable: true
      });
      
      const nonEditableString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10.00,
        refId: 'test',
        editable: false
      });
      
      expect(editableString).toContain('0301' + '1'); // Should contain editable=1
      expect(nonEditableString).toContain('0301' + '0'); // Should contain editable=0
    });

    test('should format amount with 2 decimal places for non-editable', () => {
      const nonEditableString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10,
        refId: 'test',
        editable: false
      });
      
      expect(nonEditableString).toContain('10.00'); // Should contain amount with 2 decimals
    });

    test('should keep original amount format for editable', () => {
      const editableString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10,
        refId: 'test',
        editable: true
      });
      
      expect(editableString).toContain('10'); // Should contain original amount format
    });
  });

  describe('Validation', () => {
    test('should throw error when both mobile and uen are provided', () => {
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: '201912345Z',
          amount: 10.00,
          refId: 'test',
          editable: false
        });
      }).toThrow('Exactly one of mobile or uen must be provided');
    });

    test('should throw error when neither mobile nor uen are provided', () => {
      expect(() => {
        buildPayNowQrString({
          mobile: null,
          uen: null,
          amount: 10.00,
          refId: 'test',
          editable: false
        });
      }).toThrow('Exactly one of mobile or uen must be provided');
    });

    test('should throw error for negative amount', () => {
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: null,
          amount: -10.00,
          refId: 'test',
          editable: false
        });
      }).toThrow('Amount must be greater than 0');
    });

    test('should throw error for amount with more than 2 decimal places', () => {
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: null,
          amount: 10.123,
          refId: 'test',
          editable: false
        });
      }).toThrow('Amount cannot have more than 2 decimal places');
    });
  });

  describe('EMV Structure Validation', () => {
    test('should have correct EMV structure for non-editable amount', () => {
      const emvString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 25.50,
        refId: 'ORDER-001',
        editable: false
      });
      
      // Should start with correct format indicator and point of initiation
      expect(emvString).toMatch(/^000201010212/);
      
      // Should contain PayNow identifier
      expect(emvString).toContain('SG.PAYNOW');
      
      // Should contain editable=0
      expect(emvString).toContain('03010');
      
      // Should contain amount with 2 decimal places
      expect(emvString).toContain('25.50');
      
      // Should contain reference in additional data fields
      expect(emvString).toContain('ORDER-001');
      
      // Should end with CRC checksum
      expect(emvString).toMatch(/6304[A-F0-9]{4}$/);
    });

    test('should validate reference format', () => {
      // Valid reference characters: A-Za-z0-9-_/
      const validRef = 'TBL-12_ORDER/001';
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: null,
          amount: 10.00,
          refId: validRef,
          editable: false
        });
      }).not.toThrow();
      
      // Invalid characters (spaces, special chars)
      const invalidRef = 'ORDER 001@#$';
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: null,
          amount: 10.00,
          refId: invalidRef,
          editable: false
        });
      }).toThrow('Reference can only contain letters, numbers, hyphens, underscores, and slashes');
      
      // Reference too long (>25 chars)
      const longRef = 'THIS-IS-A-VERY-LONG-REFERENCE-THAT-EXCEEDS-25-CHARS';
      expect(() => {
        buildPayNowQrString({
          mobile: '86854221',
          uen: null,
          amount: 10.00,
          refId: longRef,
          editable: false
        });
      }).toThrow('Reference cannot exceed 25 characters');
    });

    test('should generate different checksums for different data', () => {
      const qr1 = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 10.00,
        refId: 'REF001',
        editable: false
      });
      
      const qr2 = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 20.00,
        refId: 'REF002',
        editable: false
      });
      
      // Extract checksums (last 4 characters)
      const checksum1 = qr1.slice(-4);
      const checksum2 = qr2.slice(-4);
      
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('QR Code Generation', () => {
    test('should generate QR code with all formats', async () => {
      const result = await generatePayNowQrCode({
        mobile: '86854221',
        uen: null,
        amount: 10.00,
        refId: 'test',
        editable: false,
        company: 'Test Company'
      });

      expect(result.url).toMatch(/^000201010211/); // Should be EMV string
      expect(result.qrCodeSvg).toContain('<svg');
      expect(result.qrCodePng).toContain('data:image/png;base64,');
      expect(result.qrCodeBase64).toBeTruthy();
      expect(result.qrCodeBase64).not.toContain('data:image/png;base64,');
    });

    test('should work with convenience function', async () => {
      const result = await createPayNowQr(
        '86854221',
        null,
        25.50,
        'ORDER-001',
        {
          editable: true,
          company: 'My Restaurant'
        }
      );

      expect(result.url).toContain('25.5'); // Amount should be in EMV string
      expect(result.url).toContain('ORDER-001'); // Reference should be in EMV string
      expect(result.qrCodeSvg).toContain('<svg');
    });
    
    test('should generate EMV payload with read-only reference field 62/01', () => {
      const emvString = buildPayNowQrString({
        mobile: '86854221',
        uen: null,
        amount: 25.50,
        refId: 'ORDER-001',
        editable: false
      });
      
      // Should contain Additional Data Field Template (62) with Bill Number (01)
      expect(emvString).toContain('62'); // Additional Data Field Template
      expect(emvString).toContain('ORDER-001'); // Reference value
      
      // Verify the structure: 62 + length + (01 + length + reference)
      const referenceLength = 'ORDER-001'.length.toString().padStart(2, '0');
      const billNumberField = '01' + referenceLength + 'ORDER-001';
      const additionalDataLength = billNumberField.length.toString().padStart(2, '0');
      const expectedField = '62' + additionalDataLength + billNumberField;
      
      expect(emvString).toContain(expectedField);
    });
  });
});