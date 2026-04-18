import axios from 'axios';

// Supabase configuration - get from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zcoildagsacuaceohddal.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2lsZGFnc2FjdWFjZW9oZGRhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzEyNDEwNDAwLCJleHAiOjE4NzAwMTg0MDB9.zcoIdwsacuacohddal_238595cHdleit-i1i';

if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY is not set. API requests will fail with 401 errors.');
}

// Create Supabase client
export const supabaseClient = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});

// For backward compatibility, also export as apiClient
export const apiClient = supabaseClient;

export default supabaseClient;
