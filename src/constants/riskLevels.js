/**
 * Risk level string constants.
 *
 * Use these instead of raw strings so that typos are caught at import time
 * and refactors only need a single change.
 *
 * @type {{ SAFE: 'SAFE', WARNING: 'WARNING', DANGER: 'DANGER' }}
 */
const RISK_LEVELS = {
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  DANGER: 'DANGER',
};

/**
 * Threshold configuration that drives risk-level classification.
 *
 * - `SAFE_MIN_DAYS`    : Any value **above** this is considered SAFE.
 * - `WARNING_MIN_DAYS` : Values from this number up to (and including)
 *                        `SAFE_MIN_DAYS` are WARNING.
 * - Below `WARNING_MIN_DAYS` is DANGER.
 * - `SPIKE_PERCENT`    : Percent increase that qualifies as a spending spike.
 *
 * @type {{
 *   SAFE_MIN_DAYS: number,
 *   WARNING_MIN_DAYS: number,
 *   SPIKE_PERCENT: number,
 * }}
 */
const RISK_THRESHOLDS = {
  SAFE_MIN_DAYS: 30,
  WARNING_MIN_DAYS: 15,
  SPIKE_PERCENT: 20,
};

/**
 * Human-readable descriptions for each risk level, useful for UI labels
 * or notification messages.
 *
 * @type {Record<string, string>}
 */
const RISK_LEVEL_DESCRIPTIONS = {
  [RISK_LEVELS.SAFE]: 'Your finances are healthy. Keep it up!',
  [RISK_LEVELS.WARNING]: 'Spending is elevated. Consider reviewing your budget.',
  [RISK_LEVELS.DANGER]: 'Funds are critically low. Immediate action recommended.',
};

/**
 * All risk level values as an ordered array from most severe to least.
 *
 * @type {string[]}
 */
const RISK_LEVEL_VALUES = [
  RISK_LEVELS.DANGER,
  RISK_LEVELS.WARNING,
  RISK_LEVELS.SAFE,
];

module.exports = {
  RISK_LEVELS,
  RISK_THRESHOLDS,
  RISK_LEVEL_DESCRIPTIONS,
  RISK_LEVEL_VALUES,
};
