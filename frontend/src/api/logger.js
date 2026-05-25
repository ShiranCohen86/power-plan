const isDev = import.meta.env.DEV;

export function logDebug(...args) { if (isDev) console.debug('[power-plan]', ...args); }
export function logInfo(...args)  { if (isDev) console.info('[power-plan]', ...args); }
export function logWarn(...args)  { console.warn('[power-plan]', ...args); }
export function logError(...args) { console.error('[power-plan]', ...args); }
