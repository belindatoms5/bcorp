/**
 * BCCM Act compliance utilities
 * Queensland Body Corporate and Community Management Act 1997
 * Standard Module only
 */

import { addDays, differenceInDays } from "date-fns";

// Minimum notice periods (days) before the event date
export const NOTICE_PERIODS = {
  AGM: 21,
  EGM: 21,
  COMMITTEE: 7,
  LEVY: 30,
} as const;

// Resolution thresholds: what fraction of votes needed to pass
export const RESOLUTION_THRESHOLDS = {
  ORDINARY: 0.5,   // Simple majority (>50%)
  MAJORITY: 0.667, // Majority resolution (>2/3)
  SPECIAL: 0.75,   // Special resolution (>75%)
} as const;

/**
 * Returns the earliest allowed date for a meeting of the given type
 */
export function earliestMeetingDate(meetingType: keyof typeof NOTICE_PERIODS): Date {
  return addDays(new Date(), NOTICE_PERIODS[meetingType]);
}

/**
 * Returns the earliest allowed due date for a levy notice issued today
 */
export function earliestLevyDueDate(): Date {
  return addDays(new Date(), NOTICE_PERIODS.LEVY);
}

/**
 * Validates that a due date satisfies the BCCM notice period requirement
 */
export function validateLevyNoticeDate(issuedDate: Date, dueDate: Date): {
  valid: boolean;
  daysNotice: number;
  requiredDays: number;
  message?: string;
} {
  const daysNotice = differenceInDays(dueDate, issuedDate);
  const valid = daysNotice >= NOTICE_PERIODS.LEVY;
  return {
    valid,
    daysNotice,
    requiredDays: NOTICE_PERIODS.LEVY,
    message: valid
      ? undefined
      : `Only ${daysNotice} days notice given. BCCM Act requires at least ${NOTICE_PERIODS.LEVY} days.`,
  };
}

/**
 * Determines if a motion has passed based on resolution type and vote counts.
 * Uses lot entitlements for proper BCCM-weighted voting.
 */
export function motionPassed(
  resolutionType: keyof typeof RESOLUTION_THRESHOLDS,
  votesFor: number,
  votesAgainst: number
): boolean {
  const total = votesFor + votesAgainst;
  if (total === 0) return false;
  return votesFor / total > RESOLUTION_THRESHOLDS[resolutionType];
}

/**
 * Calculates overdue interest on a levy notice.
 * QLD default penalty interest rate (check current BCCM rate — typically ~10% p.a.)
 */
const ANNUAL_INTEREST_RATE = 0.10;

export function calculateInterest(
  principalOwing: number,
  daysOverdue: number
): number {
  const dailyRate = ANNUAL_INTEREST_RATE / 365;
  return principalOwing * dailyRate * daysOverdue;
}

/**
 * By-law breach timeline
 * After Form 1 is issued, the respondent has 14 days to remedy.
 */
export const BREACH_RESPONSE_DAYS = 14;

export function breachResponseDeadline(form1IssuedAt: Date): Date {
  return addDays(form1IssuedAt, BREACH_RESPONSE_DAYS);
}
