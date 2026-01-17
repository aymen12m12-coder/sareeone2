// server/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase configuration for storage
const supabaseUrl = process.env.SUPABASE_URL || 'https://flftwguecvlvnksvtgon.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZnR3Z3VlY3Zsdm5rc3Z0Z29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxMzYyNiwiZXhwIjoyMDczNzg5NjI2fQ.6b7x3xDJGnpe0vYHX9Td5NMTxC3vt41jTe8c9pECDAI';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

export const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Storage bucket name for images
export const STORAGE_BUCKET = 'restaurant-images';