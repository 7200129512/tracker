import axios from 'axios';

// Supabase configuration
const SUPABASE_URL = 'https://zcoldagsacuaceohddal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2xkYWdzYWN1YWNlb2hkZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMzNzc5NDEsImV4cCI6MTcyODk2OTk0MX0.8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8_8';

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
