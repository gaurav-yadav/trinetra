import { SessionPhase } from '@trinetra/shared';
import { useSettingsStore } from '../stores/settingsStore';

// Phases that should trigger notifications
const NOTIFICATION_PHASES: SessionPhase[] = [
  SessionPhase.WAITING,
  SessionPhase.ERROR,
  SessionPhase.IDLE, // Done/completed state
];

// Human-readable phase names
const PHASE_TITLES: Record<SessionPhase, string> = {
  [SessionPhase.IDLE]: 'Idle',
  [SessionPhase.BUILDING]: 'Building',
  [SessionPhase.TESTING]: 'Testing',
  [SessionPhase.CODING]: 'Coding',
  [SessionPhase.WAITING]: 'Waiting for Input',
  [SessionPhase.ERROR]: 'Error',
};

const PHASE_BODIES: Record<SessionPhase, string> = {
  [SessionPhase.IDLE]: 'Session is idle',
  [SessionPhase.BUILDING]: 'Building project...',
  [SessionPhase.TESTING]: 'Running tests...',
  [SessionPhase.CODING]: 'AI is coding...',
  [SessionPhase.WAITING]: 'Session needs your attention',
  [SessionPhase.ERROR]: 'An error occurred',
};

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Check if notifications are enabled and permitted
 */
export function canSendNotifications(): boolean {
  const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;
  return notificationsEnabled && 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Send a notification for a session phase change
 */
export function notifyPhaseChange(
  sessionId: string,
  sessionTitle: string,
  phase: SessionPhase
): void {
  if (!canSendNotifications()) return;
  if (!NOTIFICATION_PHASES.includes(phase)) return;

  // Don't notify if the app is focused
  if (document.hasFocus()) return;

  const title = `${sessionTitle}: ${PHASE_TITLES[phase]}`;
  const body = PHASE_BODIES[phase];

  sendNotification(title, body, {
    tag: `trinetra-${sessionId}-${phase}`,
    data: { url: `/sessions/${sessionId}` },
    requireInteraction: phase === SessionPhase.WAITING || phase === SessionPhase.ERROR
  });
}

/**
 * Send a generic notification
 */
export function sendNotification(
  title: string,
  body: string,
  options: {
    tag?: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
  } = {}
): void {
  if (!canSendNotifications()) return;

  // Use service worker notification if available for better handling
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title,
        body,
        ...options
      }
    });
  } else {
    // Fallback to regular notification
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction
    });
  }
}

/**
 * Handle notification click from service worker
 */
export function setupNotificationHandlers(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const url = event.data.payload?.url;
        if (url) {
          window.location.href = url;
        }
      }
    });
  }
}
