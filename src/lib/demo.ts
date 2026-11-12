export const DEMO_COOKIE = "releasesignal_demo";
export const DEMO_COOKIE_VALUE = "1";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 8;

export function isDemoValue(value: string | undefined): boolean {
  return value === DEMO_COOKIE_VALUE;
}
