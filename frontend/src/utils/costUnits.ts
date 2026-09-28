/** An item without a real measured unit (a subscription, a flat fee) uses this sentinel
 * instead of being left blank - a signal, not a measurement. Mirrors COUNT_UNIT in the
 * backend (app/costs/service.py). */
export const COUNT_UNIT = "1";

export const isCountUnit = (unit: string | null) => unit === COUNT_UNIT;
