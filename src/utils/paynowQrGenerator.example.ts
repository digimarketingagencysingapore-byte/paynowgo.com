/**
 * Example usage of PayNow QR Generator
 * This file demonstrates how to use the PayNow QR generation functions
 */

import { buildPayNowQrUrl, generatePayNowQrCode, createPayNowQr } from './paynowQrGenerator';

// Example 1: Individual mobile payment
async function exampleIndividualPayment() {
  try {
    const result = await generatePayNowQrCode({
      mobile: '86854221',
      uen: null,
      amount: 1.00,
      refId: 'test',
      editable: false,
      expiry: '2025/08/13 20:30',
      company: 'My Cafe'
    });
    
    console.log('Individual Payment URL:', result.url);
    console.log('QR Code SVG length:', result.qrCodeSvg.length);
    console.log('QR Code PNG data URL:', result.qrCodePng.substring(0, 50) + '...');
    
    return result;
  } catch (error) {
    console.error('Error generating individual payment QR:', error);
  }
}

// Example 2: Business UEN payment
async function exampleBusinessPayment() {
  try {
    const result = await generatePayNowQrCode({
      mobile: null,
      uen: '201912345Z',
      amount: 12.90,
      refId: 'TBL12-0001',
      editable: false,
      company: 'My Restaurant'
    });
    
    console.log('Business Payment URL:', result.url);
    return result;
  } catch (error) {
    console.error('Error generating business payment QR:', error);
  }
}

// Example 3: Using convenience function
async function exampleConvenienceFunction() {
  try {
    const result = await createPayNowQr(
      '86854221', // mobile
      null,       // uen
      25.50,      // amount
      'ORDER-001', // refId
      {
        editable: true,
        expiry: new Date('2025-12-31T23:59:59'),
        company: 'Demo Store'
      }
    );
    
    console.log('Convenience function result:', result.url);
    return result;
  } catch (error) {
    console.error('Error with convenience function:', error);
  }
}

// Example 4: URL-only generation (no QR code image)
function exampleUrlOnly() {
  try {
    const url = buildPayNowQrUrl({
      mobile: null,
      uen: '201234567M',
      amount: 99.99,
      refId: 'INV-2025-001',
      editable: false,
      expiry: '2025/12/31 23:59',
      company: 'Tech Solutions Pte Ltd'
    });
    
    console.log('PayNow URL:', url);
    return url;
  } catch (error) {
    console.error('Error generating URL:', error);
  }
}

// Example 5: Error handling
async function exampleErrorHandling() {
  try {
    // This will throw an error because both mobile and uen are provided
    await generatePayNowQrCode({
      mobile: '86854221',
      uen: '201234567M', // This should cause an error
      amount: 10.00,
      refId: 'test',
      editable: false
    });
  } catch (error) {
    console.log('Expected error caught:', error instanceof Error ? error.message : error);
  }
  
  try {
    // This will throw an error because of invalid mobile format
    await generatePayNowQrCode({
      mobile: '1234567', // Invalid: only 7 digits
      uen: null,
      amount: 10.00,
      refId: 'test',
      editable: false
    });
  } catch (error) {
    console.log('Expected validation error:', error instanceof Error ? error.message : error);
  }
}

// Run examples
export async function runExamples() {
  console.log('=== PayNow QR Generator Examples ===\n');
  
  console.log('1. Individual Payment:');
  await exampleIndividualPayment();
  
  console.log('\n2. Business Payment:');
  await exampleBusinessPayment();
  
  console.log('\n3. Convenience Function:');
  await exampleConvenienceFunction();
  
  console.log('\n4. URL Only:');
  exampleUrlOnly();
  
  console.log('\n5. Error Handling:');
  await exampleErrorHandling();
  
  console.log('\n=== Examples Complete ===');
}

// Uncomment to run examples
// runExamples();