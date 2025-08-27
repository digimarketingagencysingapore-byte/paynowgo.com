/**
 * Export utilities for CSV and Excel files
 */

import * as XLSX from 'xlsx';

export interface ExportOrder {
  reference: string;
  description: string;
  amount: number;
  status: string;
  timestamp: string;
  createdAt: Date;
}

/**
 * Export orders to CSV format
 */
export function exportToCSV(orders: ExportOrder[], filename: string = 'orders-export') {
  const headers = ['Reference', 'Description', 'Amount (SGD)', 'Status', 'Time', 'Date'];
  
  const csvData = orders.map(order => [
    order.reference,
    order.description,
    order.amount.toFixed(2),
    order.status.charAt(0).toUpperCase() + order.status.slice(1),
    order.timestamp,
    order.createdAt.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export orders to Excel format
 */
export function exportToExcel(orders: ExportOrder[], filename: string = 'orders-export') {
  const worksheetData = [
    ['Reference', 'Description', 'Amount (SGD)', 'Status', 'Time', 'Date'],
    ...orders.map(order => [
      order.reference,
      order.description,
      order.amount,
      order.status.charAt(0).toUpperCase() + order.status.slice(1),
      order.timestamp,
      order.createdAt.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 20 }, // Reference
    { width: 30 }, // Description
    { width: 15 }, // Amount
    { width: 10 }, // Status
    { width: 12 }, // Time
    { width: 12 }  // Date
  ];

  // Style the header row
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } }
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  // Add metadata
  workbook.Props = {
    Title: 'PayNowGo Orders Export',
    Subject: 'Orders and Payments Report',
    Author: 'PayNowGo System',
    CreatedDate: new Date()
  };

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export analytics report to CSV format
 */
export function exportAnalyticsToCSV(
  orders: ExportOrder[], 
  summary: any, 
  dateRange: string, 
  filename: string = 'analytics-report'
) {
  // Summary section
  const summaryData = [
    ['PayNowGo Analytics Report'],
    ['Generated:', new Date().toLocaleString('de-DE')],
    ['Period:', dateRange.charAt(0).toUpperCase() + dateRange.slice(1)],
    [''],
    ['SUMMARY METRICS'],
    ['Total Orders:', summary.totalOrders.toString()],
    ['Successful Payments:', summary.paidOrders.toString()],
    ['Pending Payments:', summary.pendingOrders.toString()],
    ['Failed Payments:', summary.failedOrders.toString()],
    ['Total Revenue (SGD):', summary.totalRevenue.toFixed(2)],
    ['Success Rate (%):', summary.successRate.toFixed(1)],
    ['Average Transaction (SGD):', summary.paidOrders > 0 ? (summary.totalRevenue / summary.paidOrders).toFixed(2) : '0.00'],
    [''],
    ['DETAILED TRANSACTIONS'],
    ['Reference', 'Description', 'Amount (SGD)', 'Status', 'Time', 'Date']
  ];

  // Add order details
  const orderData = orders.map(order => [
    order.reference,
    order.description,
    order.amount.toFixed(2),
    order.status.charAt(0).toUpperCase() + order.status.slice(1),
    order.timestamp,
    order.createdAt.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  ]);

  const allData = [...summaryData, ...orderData];
  const csvContent = allData
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export analytics report to Excel format
 */
export function exportAnalyticsToExcel(
  orders: ExportOrder[], 
  summary: any, 
  dateRange: string, 
  filename: string = 'analytics-report'
) {
  const workbook = XLSX.utils.book_new();

  // Summary worksheet
  const summaryData = [
    ['PayNowGo Analytics Report'],
    ['Generated:', new Date().toLocaleString('de-DE')],
    ['Period:', dateRange.charAt(0).toUpperCase() + dateRange.slice(1)],
    [''],
    ['SUMMARY METRICS'],
    ['Total Orders:', summary.totalOrders],
    ['Successful Payments:', summary.paidOrders],
    ['Pending Payments:', summary.pendingOrders],
    ['Failed Payments:', summary.failedOrders],
    ['Total Revenue (SGD):', summary.totalRevenue],
    ['Success Rate (%):', parseFloat(summary.successRate.toFixed(1))],
    ['Average Transaction (SGD):', summary.paidOrders > 0 ? parseFloat((summary.totalRevenue / summary.paidOrders).toFixed(2)) : 0]
  ];

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Style summary worksheet
  summaryWorksheet['!cols'] = [{ width: 25 }, { width: 20 }];
  
  // Style header cells
  if (summaryWorksheet['A1']) {
    summaryWorksheet['A1'].s = {
      font: { bold: true, size: 16 },
      fill: { fgColor: { rgb: '059669' } },
      font: { color: { rgb: 'FFFFFF' }, bold: true }
    };
  }

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

  // Detailed transactions worksheet
  const transactionData = [
    ['Reference', 'Description', 'Amount (SGD)', 'Status', 'Time', 'Date'],
    ...orders.map(order => [
      order.reference,
      order.description,
      order.amount,
      order.status.charAt(0).toUpperCase() + order.status.slice(1),
      order.timestamp,
      order.createdAt.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    ])
  ];

  const transactionWorksheet = XLSX.utils.aoa_to_sheet(transactionData);
  
  // Set column widths
  transactionWorksheet['!cols'] = [
    { width: 20 }, // Reference
    { width: 30 }, // Description
    { width: 15 }, // Amount
    { width: 10 }, // Status
    { width: 12 }, // Time
    { width: 12 }  // Date
  ];

  // Style header row
  const headerRange = XLSX.utils.decode_range(transactionWorksheet['!ref'] || 'A1:F1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!transactionWorksheet[cellAddress]) continue;
    transactionWorksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } }
    };
  }

  XLSX.utils.book_append_sheet(workbook, transactionWorksheet, 'Transactions');

  // Add metadata
  workbook.Props = {
    Title: 'PayNowGo Analytics Report',
    Subject: `Analytics Report - ${dateRange}`,
    Author: 'PayNowGo System',
    CreatedDate: new Date()
  };

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Generate filename with current date
 */
export function generateFilename(prefix: string = 'orders-export'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `${prefix}-${dateStr}-${timeStr}`;
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get summary statistics for export
 */
export function getOrdersSummary(orders: ExportOrder[]) {
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.status === 'paid').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const failedOrders = orders.filter(o => o.status === 'failed').length;
  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);

  return {
    totalOrders,
    paidOrders,
    pendingOrders,
    failedOrders,
    totalRevenue,
    successRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0
  };
}