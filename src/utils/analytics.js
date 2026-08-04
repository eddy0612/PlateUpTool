// Lightweight client-side engagement tracking for GA4
// Sends periodic 'engagement_heartbeat' events and visibility change events.
const HEARTBEAT_INTERVAL_SEC = 30;
let activeSeconds = 0;
let intervalId = null;

function sendEvent(name, params = {}) {
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', name, params);
    } catch (e) {
      // ignore
    }
  }
}

function getPagePath() {
  return location.pathname + location.search + location.hash;
}

function start() {
  if (intervalId) return;

  // initial event
  sendEvent('engagement_start', { page_path: getPagePath() });

  intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      activeSeconds += HEARTBEAT_INTERVAL_SEC;
      sendEvent('engagement_heartbeat', {
        engagement_time_sec: activeSeconds,
        page_path: getPagePath(),
      });
    }
  }, HEARTBEAT_INTERVAL_SEC * 1000);

  document.addEventListener('visibilitychange', () => {
    sendEvent('engagement_visibility_change', {
      visibility: document.visibilityState,
      engagement_time_sec: activeSeconds,
      page_path: getPagePath(),
    });
  });

  // Try to send a final event when the user leaves. This may not always be delivered,
  // but the periodic heartbeats will give good coverage of session duration.
  window.addEventListener('beforeunload', () => {
    sendEvent('engagement_end', {
      engagement_time_sec: activeSeconds,
      page_path: getPagePath(),
    });
  });
}

// Auto-start when imported
start();

export default { start };
