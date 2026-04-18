import pool from '../db/client';
import { generateSchedule, remainingInstalments } from '../utils/amortisation';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

interface LoanRow {
  id: number;
  loan_name: string;
  original_principal: string;
  outstanding_principal: string;
  emi_amount: string;
  interest_rate_pa: string;
  emi_start_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

function formatLoan(row: LoanRow) {
  const outstanding = parseFloat(row.outstanding_principal);
  const emi = parseFloat(row.emi_amount);
  const rate = parseFloat(row.interest_rate_pa);

  const { count, closureDate, warning } = remainingInstalments(outstanding, emi, rate);

  return {
    id: row.id,
    loanName: row.loan_name,
    originalPrincipal: parseFloat(row.original_principal),
    outstandingPrincipal: outstanding,
    emiAmount: emi,
    interestRatePa: rate,
    emiStartDate: row.emi_start_date,
    isClosed: row.is_closed,
    remainingInstalments: count,
    estimatedClosureDate: closureDate.toISOString().slice(0, 10),
    ...(warning ? { warning } : {}),
  };
}

export async function getAllLoans() {
  const result = await pool.query<LoanRow>(
    'SELECT * FROM loans ORDER BY created_at DESC'
  );
  return result.rows.map(formatLoan);
}

export async function getLoanById(id: number) {
  const result = await pool.query<LoanRow>('SELECT * FROM loans WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${id} not found`);
  }
  return formatLoan(result.rows[0]);
}

export async function createLoan(data: {
  loanName: string;
  originalPrincipal: number;
  outstandingPrincipal: number;
  emiAmount: number;
  interestRatePa: number;
  emiStartDate: string;
}) {
  const result = await pool.query<LoanRow>(
    `INSERT INTO loans (loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.loanName,
      data.originalPrincipal,
      data.outstandingPrincipal,
      data.emiAmount,
      data.interestRatePa,
      data.emiStartDate,
    ]
  );
  return formatLoan(result.rows[0]);
}

export async function updateLoan(
  id: number,
  data: Partial<{
    loanName: string;
    originalPrincipal: number;
    outstandingPrincipal: number;
    emiAmount: number;
    interestRatePa: number;
    emiStartDate: string;
    isClosed: boolean;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.loanName !== undefined) {
    fields.push(`loan_name = $${idx++}`);
    values.push(data.loanName);
  }
  if (data.originalPrincipal !== undefined) {
    fields.push(`original_principal = $${idx++}`);
    values.push(data.originalPrincipal);
  }
  if (data.outstandingPrincipal !== undefined) {
    fields.push(`outstanding_principal = $${idx++}`);
    values.push(data.outstandingPrincipal);
  }
  if (data.emiAmount !== undefined) {
    fields.push(`emi_amount = $${idx++}`);
    values.push(data.emiAmount);
  }
  if (data.interestRatePa !== undefined) {
    fields.push(`interest_rate_pa = $${idx++}`);
    values.push(data.interestRatePa);
  }
  if (data.emiStartDate !== undefined) {
    fields.push(`emi_start_date = $${idx++}`);
    values.push(data.emiStartDate);
  }
  if (data.isClosed !== undefined) {
    fields.push(`is_closed = $${idx++}`);
    values.push(data.isClosed);
  }

  if (fields.length === 0) {
    return getLoanById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<LoanRow>(
    `UPDATE loans SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${id} not found`);
  }
  return formatLoan(result.rows[0]);
}

export async function deleteLoan(id: number) {
  const result = await pool.query('DELETE FROM loans WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${id} not found`);
  }
}

export async function recordEmiPayment(loanId: number, paymentMonth: string) {
  const loanResult = await pool.query<LoanRow>('SELECT * FROM loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${loanId} not found`);
  }

  const loan = loanResult.rows[0];
  if (loan.is_closed) {
    throw new ValidationError('Loan is already closed');
  }

  const outstanding = parseFloat(loan.outstanding_principal);
  const emi = parseFloat(loan.emi_amount);
  const rate = parseFloat(loan.interest_rate_pa);
  const monthlyRate = rate / 12 / 100;

  const interestComponent = parseFloat((outstanding * monthlyRate).toFixed(2));
  let principalComponent = parseFloat((emi - interestComponent).toFixed(2));

  // If principal component exceeds outstanding, cap it
  if (principalComponent > outstanding) {
    principalComponent = outstanding;
  }

  const balanceAfter = parseFloat((outstanding - principalComponent).toFixed(2));
  const isClosed = balanceAfter <= 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `INSERT INTO emi_payments (loan_id, payment_month, emi_paid, principal_component, interest_component, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [loanId, paymentMonth, emi, principalComponent, interestComponent, balanceAfter]
    );

    await client.query(
      `UPDATE loans SET outstanding_principal = $1, is_closed = $2, updated_at = NOW() WHERE id = $3`,
      [balanceAfter, isClosed, loanId]
    );

    await client.query('COMMIT');

    const payment = paymentResult.rows[0];
    return {
      id: payment.id,
      loanId: payment.loan_id,
      paymentMonth: payment.payment_month,
      emiPaid: parseFloat(payment.emi_paid),
      principalComponent: parseFloat(payment.principal_component),
      interestComponent: parseFloat(payment.interest_component),
      balanceAfter: parseFloat(payment.balance_after),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Re-throw as ConflictError for duplicate payment month
    if ((err as any).code === '23505') {
      throw new ConflictError(`EMI payment already recorded for month ${paymentMonth}`);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function getLoanPayments(loanId: number) {
  // Verify loan exists
  const loanCheck = await pool.query('SELECT id FROM loans WHERE id = $1', [loanId]);
  if (loanCheck.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${loanId} not found`);
  }

  const result = await pool.query(
    `SELECT * FROM emi_payments WHERE loan_id = $1 ORDER BY payment_month ASC`,
    [loanId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    loanId: row.loan_id,
    paymentMonth: row.payment_month,
    emiPaid: parseFloat(row.emi_paid),
    principalComponent: parseFloat(row.principal_component),
    interestComponent: parseFloat(row.interest_component),
    balanceAfter: parseFloat(row.balance_after),
  }));
}

export async function getAmortisationSchedule(loanId: number) {
  const loanResult = await pool.query<LoanRow>('SELECT * FROM loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) {
    throw new NotFoundError(`Loan with id ${loanId} not found`);
  }

  const loan = loanResult.rows[0];
  const outstanding = parseFloat(loan.outstanding_principal);
  const emi = parseFloat(loan.emi_amount);
  const rate = parseFloat(loan.interest_rate_pa);

  const schedule = generateSchedule(outstanding, emi, rate, new Date());
  return schedule;
}
