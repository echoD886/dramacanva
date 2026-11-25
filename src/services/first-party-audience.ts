// Audience observation is not included in the public frontend.
export const audiencePath = (_path: string) => '';
export const audiencePending = (..._args: unknown[]) => false;
export const audienceAllowed = () => false;
export async function flushAudienceObservation() {}
export function trackAudienceAction(..._args: unknown[]) {}
export function observeAudienceNavigation() {}
export function installAudienceObservation() { return () => {}; }
