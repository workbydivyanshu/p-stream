export function useIsDesktopApp(): boolean {
  return navigator.userAgent.includes("P-Stream/");
}
