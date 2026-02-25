/**
 * Get the start of the ISO week (Monday 00:00:00.000) for a given date.
 *
 * @param {Date} [date=new Date()] - Reference date
 * @returns {Date} Monday at midnight of the same ISO week
 */
const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Shift so that Monday = 0. Sunday (0) becomes 6, all others subtract 1.
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the start of the month (1st day, 00:00:00.000) for a given date.
 *
 * @param {Date} [date=new Date()] - Reference date
 * @returns {Date} First day of the month at midnight
 */
const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the ISO week (Sunday 23:59:59.999) for a given date.
 *
 * @param {Date} [date=new Date()] - Reference date
 * @returns {Date} Sunday at 23:59:59.999 of the same ISO week
 */
const getEndOfWeek = (date = new Date()) => {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Get the end of the month (last day, 23:59:59.999) for a given date.
 *
 * @param {Date} [date=new Date()] - Reference date
 * @returns {Date} Last day of the month at 23:59:59.999
 */
const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date);
  // Move to the first day of the next month, then back one millisecond
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - 1);
};

/**
 * Check whether two dates are within a specified number of minutes of each other.
 *
 * @param {Date} date1   - First date
 * @param {Date} date2   - Second date
 * @param {number} minutes - Maximum allowed gap in minutes
 * @returns {boolean} `true` if the absolute difference is less than or equal to `minutes`
 */
const isWithinMinutes = (date1, date2, minutes) => {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const thresholdMs = minutes * 60 * 1000;
  return diffMs <= thresholdMs;
};

/**
 * Determine whether a date falls in the "late night" window (11 PM -- 2 AM).
 *
 * The window spans from 23:00 of one day through 01:59:59 of the next day.
 *
 * @param {Date} [date=new Date()] - Date to evaluate
 * @returns {boolean} `true` if the hour is 23, 0, or 1
 */
const isLateNight = (date = new Date()) => {
  const hour = date.getHours();
  // 23:00 -- 01:59 (i.e. hour 23, 0, or 1)
  return hour >= 23 || hour < 2;
};

/**
 * Get the number of full calendar days between two dates.
 *
 * The result is always a non-negative integer. Partial days are truncated.
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Absolute number of full days between the two dates
 */
const getDaysBetween = (date1, date2) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / msPerDay);
};

/**
 * Get the start of a period (WEEKLY or MONTHLY) for a given date.
 *
 * @param {Date} [date=new Date()] - Reference date
 * @param {'WEEKLY'|'MONTHLY'} period - Budget period type
 * @returns {Date} Start of the requested period
 * @throws {Error} If an unsupported period value is provided
 */
const getStartOfPeriod = (date = new Date(), period) => {
  switch (period) {
    case 'WEEKLY':
      return getStartOfWeek(date);
    case 'MONTHLY':
      return getStartOfMonth(date);
    default:
      throw new Error(`Unsupported period: ${period}. Expected "WEEKLY" or "MONTHLY".`);
  }
};

module.exports = {
  getStartOfWeek,
  getStartOfMonth,
  getEndOfWeek,
  getEndOfMonth,
  isWithinMinutes,
  isLateNight,
  getDaysBetween,
  getStartOfPeriod,
};
