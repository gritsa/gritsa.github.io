const DEFAULT_PAID_SICK_QUOTA = 18;
const DEFAULT_HOLIDAY_QUOTA = 10;

export interface LeaveBalanceRow {
  paid_and_sick: number;
  national_holidays: number;
}

export interface LeaveHistoryItem {
  status: string;
  leave_type: string;
  from_date: string;
  to_date: string;
}

function countLeaveDays(fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Sums approved leave days for a given calendar year, keyed by from_date.
 * The leave_balances table's used_* counters are unreliable (RLS blocks managers
 * from updating another employee's row on approval), so used days are always
 * derived from leave_requests history instead of trusting the stored counters.
 */
export function calculateUsedLeaveDays(leaveHistory: LeaveHistoryItem[], year: number) {
  let paidSick = 0;
  let nationalHolidays = 0;

  for (const leave of leaveHistory) {
    if (leave.status !== 'Approved') continue;
    if (new Date(leave.from_date).getFullYear() !== year) continue;

    const days = countLeaveDays(leave.from_date, leave.to_date);
    if (leave.leave_type === 'Paid' || leave.leave_type === 'Sick') {
      paidSick += days;
    } else if (leave.leave_type === 'National Holiday') {
      nationalHolidays += days;
    }
  }

  return { paidSick, nationalHolidays };
}

export function getLeaveBalanceSummary(
  balance: LeaveBalanceRow | null,
  leaveHistory: LeaveHistoryItem[],
  year: number = new Date().getFullYear()
) {
  const used = calculateUsedLeaveDays(leaveHistory, year);
  const totalPaidSick = balance?.paid_and_sick ?? DEFAULT_PAID_SICK_QUOTA;
  const totalHolidays = balance?.national_holidays ?? DEFAULT_HOLIDAY_QUOTA;

  return {
    totalPaidSick,
    usedPaidSick: used.paidSick,
    remainingPaidSick: totalPaidSick - used.paidSick,
    totalHolidays,
    usedHolidays: used.nationalHolidays,
    remainingHolidays: totalHolidays - used.nationalHolidays,
  };
}
