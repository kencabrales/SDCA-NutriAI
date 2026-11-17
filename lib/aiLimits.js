const DEFAULT_DAILY_FEATURE_LIMIT = 3;
const MAX_DAILY_FEATURE_LIMIT = 25;

/**
 * Server-only, per-user, per-feature daily generation limit.
 * Set NUTRIAI_DAILY_FEATURE_LIMIT in .env.local for local testing.
 * The conservative default remains 3 when no value is configured.
 */
export function getDailyAIFeatureLimit() {
  const configured = Number.parseInt(process.env.NUTRIAI_DAILY_FEATURE_LIMIT || '', 10);
  if (!Number.isFinite(configured) || configured < 1) return DEFAULT_DAILY_FEATURE_LIMIT;
  return Math.min(configured, MAX_DAILY_FEATURE_LIMIT);
}
