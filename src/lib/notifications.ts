import { uid } from './data';

export type NotificationKind = 'success' | 'error' | 'info' | 'reminder';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
}

export const NOTIFICATIONS_KEY = 'jadwal-notifications-v1';
const MAX_NOTIFICATIONS = 60;
const KINDS: NotificationKind[] = ['success', 'error', 'info', 'reminder'];

function isValidNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.message === 'string' &&
    typeof item.createdAt === 'string' && typeof item.read === 'boolean' &&
    typeof item.kind === 'string' && KINDS.includes(item.kind as NotificationKind);
}

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidNotification).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

export function saveNotifications(list: AppNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // Storage can be full or blocked (private browsing); the in-memory list still works for this session.
  }
}

export function createNotification(input: { title: string; message: string; kind: NotificationKind }): AppNotification {
  return { id: uid(), title: input.title, message: input.message, kind: input.kind, createdAt: new Date().toISOString(), read: false };
}

// --- Browser / OS desktop notifications -----------------------------------
// This app has no backend, so there is no real "push" service: these notifications
// only fire while the app is open (a foreground or background tab, or an installed PWA window).

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showBrowserNotification(title: string, options: NotificationOptions & { tag?: string } = {}) {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') return;
  const withDefaults: NotificationOptions = { icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', dir: 'rtl', lang: 'ar', ...options };
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, withDefaults);
        return;
      }
    }
    new Notification(title, withDefaults);
  } catch {
    // Some browsers reject unsupported options or block notifications silently; the in-app center still has the entry.
  }
}
