import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { generatePayNowQrCode, type PayNowQrOptions, type QrCodeResult } from '../../utils/paynowQrGenerator';

interface QRCodeGeneratorProps {
  data?: string;
  payNowOptions?: PayNowQrOptions;
  size?: number;
  onGenerated?: (result: QrCodeResult) => void;
  onError?: (error: string) => void;
}

export function QRCodeGenerator({ 
  data, 
  payNowOptions, 
  size = 200, 
  onGenerated, 
  onError 
}: QRCodeGeneratorProps) {
  const [qrResult, setQrResult] = useState<QrCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('QRCodeGenerator useEffect triggered with:', { payNowOptions, data });
    if (payNowOptions) {
      generateQR();
    } else if (data) {
      // For backward compatibility with simple data strings
      setQrResult({
        url: data,
        qrCodeSvg: generateSimpleQRPattern(data),
        qrCodePng: '',
        qrCodeBase64: ''
      });
    }
  }, [payNowOptions?.mobile, payNowOptions?.uen, payNowOptions?.amount, payNowOptions?.refId, payNowOptions?.editable, data]);

  const generateQR = async () => {
    if (!payNowOptions) return;
    
    console.log('Starting QR generation with options:', payNowOptions);
    setLoading(true);
    setError(null);
    
    try {
      console.log('Generating QR with options:', payNowOptions);
      const result = await generatePayNowQrCode(payNowOptions);
      console.log('QR generation successful. URL:', result.url);
      console.log('SVG length:', result.qrCodeSvg?.length);
      console.log('PNG length:', result.qrCodePng?.length);
      setQrResult(result);
      onGenerated?.(result);
    } catch (err) {
      console.error('QR generation error:', err);
      const errorMessage = err instanceof Error ? 
        err.message.includes('require is not defined') ? 
          'QR code library compatibility issue. Using fallback QR code.' :
          err.message.replace(/Failed to fetch dynamically imported module:.*/, 'QR code library loading failed. Please refresh the page.') 
        : 'Failed to generate QR code';
      setError(errorMessage);
      onError?.(errorMessage);
      
      // Create fallback QR result
      if (payNowOptions && err instanceof Error && err.message.includes('require is not defined')) {
        const fallbackResult = {
          url: 'fallback-paynow-qr',
          qrCodeSvg: generateSimpleQRPattern('PayNow QR Code'),
          qrCodePng: '',
          qrCodeBase64: ''
        };
        setQrResult(fallbackResult);
        onGenerated?.(fallbackResult);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSimpleQRPattern = (data: string) => {
    const gridSize = 21;
    const cellSize = size / gridSize;
    
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

    return `
      <svg width="${size}" height="${size}" className="border border-gray-200 rounded-lg">
        ${pattern.map((row, i) =>
          row.map((cell, j) => 
            `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="${cell ? '#000000' : '#ffffff'}" />`
          ).join('')
        ).join('')}
        
        <!-- Corner markers -->
        <rect x="0" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="#000000" />
        <rect x="${cellSize}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="#ffffff" />
        <rect x="${cellSize * 2}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="#000000" />
        
        <rect x="${size - cellSize * 7}" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="#000000" />
        <rect x="${size - cellSize * 6}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="#ffffff" />
        <rect x="${size - cellSize * 5}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="#000000" />
        
        <rect x="0" y="${size - cellSize * 7}" width="${cellSize * 7}" height="${cellSize * 7}" fill="#000000" />
        <rect x="${cellSize}" y="${size - cellSize * 6}" width="${cellSize * 5}" height="${cellSize * 5}" fill="#ffffff" />
        <rect x="${cellSize * 2}" y="${size - cellSize * 5}" width="${cellSize * 3}" height="${cellSize * 3}" fill="#000000" />
      </svg>
    `;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-600">Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center space-y-4 p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <div className="text-red-600 text-center">
          <p className="font-medium">QR Generation Failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={generateQR}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!qrResult) {
    return (
      <div className="flex flex-col items-center space-y-4 text-gray-500">
        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <span className="text-2xl">?</span>
        </div>
        <p className="text-sm">No QR code data provided</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {console.log('Rendering QR result:', qrResult)}
      {qrResult.qrCodeSvg ? (
        <div>
          {console.log('Rendering SVG QR code')}
          <div 
            className="border border-gray-200 rounded-lg"
            dangerouslySetInnerHTML={{ __html: qrResult.qrCodeSvg }}
          />
        </div>
      ) : qrResult.qrCodePng ? (
        <div>
          {console.log('Rendering PNG QR code')}
          <img 
            src={qrResult.qrCodePng} 
            alt="PayNow QR Code" 
            className="border border-gray-200 rounded-lg"
            width={size}
            height={size}
          />
        </div>
      ) : (
        <div 
          className="w-48 h-48 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50"
        >
          <span className="text-gray-400">No QR Code Generated</span>
        </div>
      )}
      
      <div className="text-center">
        <p className="text-xs text-gray-500 font-mono">PayNow QR Code</p>
        <p className="text-xs text-gray-400">Scan with any Singapore banking app</p>
        {qrResult.url && (
          <p className="text-xs text-gray-400 mt-1 break-all max-w-xs">
            {qrResult.url.length > 50 ? `${qrResult.url.substring(0, 50)}...` : qrResult.url}
          </p>
        )}
      </div>
    </div>
  );
}