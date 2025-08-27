// Simple test to check if orders table exists
import { supabase } from './src/lib/supabase.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Failed to connect to merchants table:', testError);
      return;
    }
    
    console.log('✓ Connected to merchants table successfully');
    
    // Test orders table
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (ordersError) {
      console.error('❌ Failed to connect to orders table:', ordersError);
      
      // Try the backup table
      const { data: backupData, error: backupError } = await supabase
        .from('orders_backup_20250827032010')
        .select('id')
        .limit(1);
        
      if (backupError) {
        console.error('❌ Backup orders table also failed:', backupError);
      } else {
        console.log('✓ Found backup orders table');
      }
      
      return;
    }
    
    console.log('✓ Connected to orders table successfully');
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testConnection().then(() => process.exit(0));