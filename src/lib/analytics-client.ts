type EventPayload = Record<string, any> | undefined;

export function trackEvent(event: string, payload?: EventPayload) {
  // For now, just console log; can be extended to send to backend

  console.log(`[analytics] ${event}`, payload || {});
}

export const analyticsClient = {
  trackEvent,
};
