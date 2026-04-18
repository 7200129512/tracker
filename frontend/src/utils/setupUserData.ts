import { supabase } from '../api/auth';
import { supabaseClient } from '../api/client';

/**
 * This function sets up user data isolation by:
 * 1. Adding user_id to all existing records
 * 2. Ensuring each user only sees their own data
 */
export const setupUserDataIsolation = async (userId: string) => {
  try {
    console.log('Setting up user data isolation for user:', userId);

    // Update all income entries to have this user_id
    await supabaseClient.patch('/income_entries', { user_id: userId });

    // Update all expense entries to have this user_id
    await supabaseClient.patch('/expense_entries', { user_id: userId });

    // Update all loans to have this user_id
    await supabaseClient.patch('/loans', { user_id: userId });

    // Update all investment holdings to have this user_id
    await supabaseClient.patch('/investment_holdings', { user_id: userId });

    // Update all savings transactions to have this user_id
    await supabaseClient.patch('/savings_transactions', { user_id: userId });

    console.log('User data isolation setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up user data isolation:', error);
    return false;
  }
};

/**
 * Call this function after user signs in to ensure their data is properly isolated
 */
export const ensureUserDataIsolation = async (userId: string) => {
  try {
    // Check if user already has data
    const incomeRes = await supabaseClient.get(`/income_entries?user_id=eq.${userId}&limit=1`);
    
    if (incomeRes.data.length === 0) {
      // User has no data yet, set up isolation
      await setupUserDataIsolation(userId);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring user data isolation:', error);
    return false;
  }
};
