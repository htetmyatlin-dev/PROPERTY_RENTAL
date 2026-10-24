/** Platform cut on the released deposit, overridable per environment. */
export const PLATFORM_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE ?? 0.3);
