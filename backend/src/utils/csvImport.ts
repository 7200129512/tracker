export interface ImportError {
  row: number;
  field: string;
  reason: string;
}

export interface ImportResult {
  valid: boolean;
  errors: ImportError[];
  records: {
    income_entries: Record<string, string>[];
    expense_entries: Record<string, string>[];
    loans: Record<string, string>[];
    emi_payments: Record<string, string>[];
    investment_holdings: Record<string, string>[];
    sell_transactions: Record<string, string>[];
    savings_transactions: Record<string, string>[];
    monthly_notes: Record<string, string>[];
  };
}

const INCOME_FREQUENCIES = ['monthly', 'one-time', 'annual'];
const EXPENSE_CATEGORIES = ['Rent', 'EMI', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];
const EXPENSE_TYPES = ['Fixed', 'Variable'];
const SAVINGS_TYPES = ['Deposit', 'Withdrawal'];

function isValidDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function isPositiveNumber(value: string): boolean {
  const n = parseFloat(value);
  return isFinite(n) && n > 0;
}

function isNonNegativeNumber(value: string): boolean {
  const n = parseFloat(value);
  return isFinite(n) && n >= 0;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseSections(csvContent: string): Map<string, Record<string, string>[]> {
  const sections = new Map<string, Record<string, string>[]>();
  const lines = csvContent.split('\n').map((l) => l.trimEnd());

  let currentSection: string | null = null;
  let headers: string[] = [];
  let rowIndex = 0;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim();
      headers = [];
      rowIndex = 0;
      sections.set(currentSection, []);
    } else if (currentSection !== null && line.trim() !== '') {
      if (headers.length === 0) {
        headers = parseCsvLine(line);
      } else {
        const values = parseCsvLine(line);
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
          record[h] = values[i] ?? '';
        });
        sections.get(currentSection)!.push(record);
        rowIndex++;
      }
    }
  }

  return sections;
}

function validateIncomeEntries(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-indexed, +1 for header
    if (!row.source_name) errors.push({ row: rowNum, field: 'source_name', reason: 'Required field is missing' });
    if (!row.amount || !isPositiveNumber(row.amount))
      errors.push({ row: rowNum, field: 'amount', reason: 'Must be a positive number' });
    if (!row.frequency || !INCOME_FREQUENCIES.includes(row.frequency))
      errors.push({ row: rowNum, field: 'frequency', reason: `Must be one of: ${INCOME_FREQUENCIES.join(', ')}` });
    if (!row.effective_date || !isValidDate(row.effective_date))
      errors.push({ row: rowNum, field: 'effective_date', reason: 'Must be a valid ISO date' });
  });
}

function validateExpenseEntries(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.name) errors.push({ row: rowNum, field: 'name', reason: 'Required field is missing' });
    if (!row.amount || !isPositiveNumber(row.amount))
      errors.push({ row: rowNum, field: 'amount', reason: 'Must be a positive number' });
    if (!row.category || !EXPENSE_CATEGORIES.includes(row.category))
      errors.push({ row: rowNum, field: 'category', reason: `Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
    if (!row.type || !EXPENSE_TYPES.includes(row.type))
      errors.push({ row: rowNum, field: 'type', reason: `Must be one of: ${EXPENSE_TYPES.join(', ')}` });
    if (!row.date || !isValidDate(row.date))
      errors.push({ row: rowNum, field: 'date', reason: 'Must be a valid ISO date' });
  });
}

function validateLoans(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.loan_name) errors.push({ row: rowNum, field: 'loan_name', reason: 'Required field is missing' });
    if (!row.original_principal || !isPositiveNumber(row.original_principal))
      errors.push({ row: rowNum, field: 'original_principal', reason: 'Must be a positive number' });
    if (row.outstanding_principal === undefined || row.outstanding_principal === '' || !isNonNegativeNumber(row.outstanding_principal))
      errors.push({ row: rowNum, field: 'outstanding_principal', reason: 'Must be a non-negative number' });
    if (!row.emi_amount || !isPositiveNumber(row.emi_amount))
      errors.push({ row: rowNum, field: 'emi_amount', reason: 'Must be a positive number' });
    if (row.interest_rate_pa === undefined || row.interest_rate_pa === '' || !isNonNegativeNumber(row.interest_rate_pa))
      errors.push({ row: rowNum, field: 'interest_rate_pa', reason: 'Must be a non-negative number' });
    if (!row.emi_start_date || !isValidDate(row.emi_start_date))
      errors.push({ row: rowNum, field: 'emi_start_date', reason: 'Must be a valid ISO date' });
  });
}

function validateEmiPayments(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.loan_id || !isPositiveNumber(row.loan_id))
      errors.push({ row: rowNum, field: 'loan_id', reason: 'Must be a positive integer' });
    if (!row.payment_month || !isValidDate(row.payment_month))
      errors.push({ row: rowNum, field: 'payment_month', reason: 'Must be a valid ISO date' });
    if (!row.emi_paid || !isPositiveNumber(row.emi_paid))
      errors.push({ row: rowNum, field: 'emi_paid', reason: 'Must be a positive number' });
    if (!row.principal_component || !isPositiveNumber(row.principal_component))
      errors.push({ row: rowNum, field: 'principal_component', reason: 'Must be a positive number' });
    if (!row.interest_component || !isNonNegativeNumber(row.interest_component))
      errors.push({ row: rowNum, field: 'interest_component', reason: 'Must be a non-negative number' });
    if (row.balance_after === undefined || row.balance_after === '' || !isNonNegativeNumber(row.balance_after))
      errors.push({ row: rowNum, field: 'balance_after', reason: 'Must be a non-negative number' });
  });
}

function validateInvestmentHoldings(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.stock_symbol) errors.push({ row: rowNum, field: 'stock_symbol', reason: 'Required field is missing' });
    if (!row.stock_name) errors.push({ row: rowNum, field: 'stock_name', reason: 'Required field is missing' });
    if (!row.quantity || !isNonNegativeNumber(row.quantity))
      errors.push({ row: rowNum, field: 'quantity', reason: 'Must be a non-negative number' });
    if (!row.purchase_price || !isPositiveNumber(row.purchase_price))
      errors.push({ row: rowNum, field: 'purchase_price', reason: 'Must be a positive number' });
    if (!row.purchase_date || !isValidDate(row.purchase_date))
      errors.push({ row: rowNum, field: 'purchase_date', reason: 'Must be a valid ISO date' });
  });
}

function validateSellTransactions(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.holding_id || !isPositiveNumber(row.holding_id))
      errors.push({ row: rowNum, field: 'holding_id', reason: 'Must be a positive integer' });
    if (!row.quantity_sold || !isPositiveNumber(row.quantity_sold))
      errors.push({ row: rowNum, field: 'quantity_sold', reason: 'Must be a positive number' });
    if (!row.sell_price || !isPositiveNumber(row.sell_price))
      errors.push({ row: rowNum, field: 'sell_price', reason: 'Must be a positive number' });
    if (!row.sell_date || !isValidDate(row.sell_date))
      errors.push({ row: rowNum, field: 'sell_date', reason: 'Must be a valid ISO date' });
  });
}

function validateSavingsTransactions(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.type || !SAVINGS_TYPES.includes(row.type))
      errors.push({ row: rowNum, field: 'type', reason: `Must be one of: ${SAVINGS_TYPES.join(', ')}` });
    if (!row.amount || !isPositiveNumber(row.amount))
      errors.push({ row: rowNum, field: 'amount', reason: 'Must be a positive number' });
    if (!row.date || !isValidDate(row.date))
      errors.push({ row: rowNum, field: 'date', reason: 'Must be a valid ISO date' });
  });
}

function validateMonthlyNotes(
  rows: Record<string, string>[],
  errors: ImportError[]
): void {
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.month || !isValidDate(row.month))
      errors.push({ row: rowNum, field: 'month', reason: 'Must be a valid ISO date' });
    if (!row.note) errors.push({ row: rowNum, field: 'note', reason: 'Required field is missing' });
  });
}

export function parseAndValidateCsv(csvContent: string): ImportResult {
  const errors: ImportError[] = [];
  const sections = parseSections(csvContent);

  const income_entries = sections.get('income_entries') ?? [];
  const expense_entries = sections.get('expense_entries') ?? [];
  const loans = sections.get('loans') ?? [];
  const emi_payments = sections.get('emi_payments') ?? [];
  const investment_holdings = sections.get('investment_holdings') ?? [];
  const sell_transactions = sections.get('sell_transactions') ?? [];
  const savings_transactions = sections.get('savings_transactions') ?? [];
  const monthly_notes = sections.get('monthly_notes') ?? [];

  validateIncomeEntries(income_entries, errors);
  validateExpenseEntries(expense_entries, errors);
  validateLoans(loans, errors);
  validateEmiPayments(emi_payments, errors);
  validateInvestmentHoldings(investment_holdings, errors);
  validateSellTransactions(sell_transactions, errors);
  validateSavingsTransactions(savings_transactions, errors);
  validateMonthlyNotes(monthly_notes, errors);

  return {
    valid: errors.length === 0,
    errors,
    records: {
      income_entries,
      expense_entries,
      loans,
      emi_payments,
      investment_holdings,
      sell_transactions,
      savings_transactions,
      monthly_notes,
    },
  };
}
