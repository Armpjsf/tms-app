
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateBucket() {
  console.log('Attempting to update bucket "billing-documents"...');
  
  // Update to allow common document types including Excel, Word, CSV, Images, PDF
  const { data, error } = await supabase.storage.updateBucket('billing-documents', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
        'image/png', 
        'image/jpeg', 
        'image/gif',
        'application/pdf',
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/csv',
        'text/plain'
    ]
  });

  if (error) {
    console.error('Error updating bucket:', error);
  } else {
    console.log('Bucket "billing-documents" updated successfully:', data);
  }
}

updateBucket();
