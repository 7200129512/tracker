-- Enable Row Level Security (RLS) and create policies for user data isolation

-- Enable RLS on all tables
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_notes ENABLE ROW LEVEL SECURITY;

-- Income entries policies
CREATE POLICY "Users can view their own income entries" ON income_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income entries" ON income_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income entries" ON income_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income entries" ON income_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Expense entries policies
CREATE POLICY "Users can view their own expense entries" ON expense_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense entries" ON expense_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense entries" ON expense_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense entries" ON expense_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Loans policies
CREATE POLICY "Users can view their own loans" ON loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans" ON loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans" ON loans
  FOR DELETE USING (auth.uid() = user_id);

-- Investment holdings policies
CREATE POLICY "Users can view their own investment holdings" ON investment_holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investment holdings" ON investment_holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment holdings" ON investment_holdings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment holdings" ON investment_holdings
  FOR DELETE USING (auth.uid() = user_id);

-- Savings transactions policies
CREATE POLICY "Users can view their own savings transactions" ON savings_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings transactions" ON savings_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings transactions" ON savings_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings transactions" ON savings_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Monthly notes policies
CREATE POLICY "Users can view their own monthly notes" ON monthly_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly notes" ON monthly_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly notes" ON monthly_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly notes" ON monthly_notes
  FOR DELETE USING (auth.uid() = user_id);
