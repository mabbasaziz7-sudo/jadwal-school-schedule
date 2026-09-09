import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, BellRing, CheckCheck, CircleAlert, CircleCheck, CircleHelp, Trash2 } from 'lucide-react';
import type { AppNotification, NotificationKind } from '../lib/notifications';

const kindIcon: Record<NotificationKind, typeof Bell> = {
  success: CircleCheck,
  error: CircleAlert,
  info: CircleHelp,
  reminder: BellRing,
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.round(hours / 24);
  return `قبل ${days} يوم`;
}

interface NotificationCenterProps {
  notifications: AppNotification[];
  permission: NotificationPermission | 'unsupported';
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onRequestPermission: () => void;
}

export default function NotificationCenter({ notifications, permission, onMarkRead, onMarkAllRead, onClear, onRequestPermission }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(item => !item.read).length;

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell"
        aria-label={unreadCount ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات'}
        aria-expanded={open}
        onClick={() => setOpen(previous => !previous)}
      >
        <Bell size={17} strokeWidth={1.8} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel"
            role="dialog"
            aria-label="لوحة الإشعارات"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="notif-panel-head">
              <strong>الإشعارات</strong>
              <div className="notif-panel-actions">
                <button type="button" onClick={onMarkAllRead} disabled={!unreadCount} title="تعليم الكل كمقروء">
                  <CheckCheck size={14} />
                </button>
                <button type="button" onClick={onClear} disabled={!notifications.length} title="مسح كل الإشعارات">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {permission === 'default' && (
              <button type="button" className="notif-permission-banner" onClick={onRequestPermission}>
                <BellRing size={15} />
                <span>فعّل إشعارات سطح المكتب/الهاتف لتصلك التنبيهات حتى في الخلفية</span>
              </button>
            )}
            {permission === 'denied' && (
              <div className="notif-permission-denied">
                <BellOff size={13} />
                <span>الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الموقع لاستقبالها.</span>
              </div>
            )}

            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={26} strokeWidth={1.3} />
                  <p>لا توجد إشعارات بعد.</p>
                </div>
              ) : (
                notifications.map(item => {
                  const Icon = kindIcon[item.kind];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`notif-item notif-${item.kind} ${item.read ? '' : 'notif-unread'}`}
                      onClick={() => onMarkRead(item.id)}
                    >
                      <Icon size={16} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <small>{relativeTime(item.createdAt)}</small>
                      </div>
                      {!item.read && <span className="notif-dot" aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
