export interface AmortisationRow {
  paymentDate: string;
  principalComponent: number;
  interestComponent: number;
  balanceAfter: number;
}

/**
 * Generate the full amortisation schedule from a given outstanding balance.
 * Uses the reducing-balance method.
 * Returns an array of instalment rows until balance reaches 0.
 * Safety cap: max 600 rows.
 */
export function generateSchedule(
  outstandingPrincipal: number,
  emiAmount: number,
  annualRatePercent: number,
  startDate: Date
): AmortisationRow[] {
  const rows: AmortisationRow[] = [];
  const monthlyRate = annualRatePercent / 12 / 100;
  let balance = outstandingPrincipal;
  const MAX_ROWS = 600;

  const date = new Date(startDate);

  while (balance > 0.005 && rows.length < MAX_ROWS) {
    const interestComponent = parseFloat((balance * monthlyRate).toFixed(2));
    let principalComponent = parseFloat((emiAmount - interestComponent).toFixed(2));

    // Last instalment: principal component is just the remaining balance
    if (principalComponent >= balance) {
      principalComponent = parseFloat(balance.toFixed(2));
      const balanceAfter = 0;
      rows.push({
        paymentDate: date.toISOString().slice(0, 10),
        principalComponent,
        interestComponent,
        balanceAfter,
      });
      break;
    }

    const balanceAfter = parseFloat((balance - principalComponent).toFixed(2));
    rows.push({
      paymentDate: date.toISOString().slice(0, 10),
      principalComponent,
      interestComponent,
      balanceAfter,
    });

    balance = balanceAfter;

    // Advance to next month
    date.setMonth(date.getMonth() + 1);
  }

  return rows;
}

/**
 * Calculate remaining instalments and estimated closure date.
 * Returns a warning when EMI <= monthly interest (loan will never close).
 */
export function remainingInstalments(
  outstandingPrincipal: number,
  emiAmount: number,
  annualRatePercent: number
): { count: number; closureDate: Date; warning?: string } {
  const monthlyRate = annualRatePercent / 12 / 100;
  const monthlyInterest = outstandingPrincipal * monthlyRate;

  if (emiAmount <= monthlyInterest) {
    return {
      count: 0,
      closureDate: new Date(),
      warning: 'emi_below_interest',
    };
  }

  const schedule = generateSchedule(outstandingPrincipal, emiAmount, annualRatePercent, new Date());
  const count = schedule.length;
  const closureDate =
    count > 0 ? new Date(schedule[count - 1].paymentDate) : new Date();

  return { count, closureDate };
}
