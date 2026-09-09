import { useEffect, useRef } from 'react';
import { dayIdForDate, type AppData, type Teacher } from './data';

const REMINDER_LEAD_MINUTES = 10;
const CHECK_INTERVAL_MS = 20_000;

function todayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function remindedStorageKey(teacherId: string, date: Date) {
  return `jadwal-reminded-${teacherId}-${todayKey(date)}`;
}

function loadReminded(teacherId: string, date: Date): Set<string> {
  try {
    const raw = sessionStorage.getItem(remindedStorageKey(teacherId, date));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveReminded(teacherId: string, date: Date, ids: Set<string>) {
  try {
    sessionStorage.setItem(remindedStorageKey(teacherId, date), JSON.stringify([...ids]));
  } catch {
    // Best-effort de-duplication only; missing storage just means a reminder could repeat once.
  }
}

/**
 * Watches the clock while a teacher has their schedule open and calls `onReminder`
 * a few minutes before each of their upcoming classes starts today.
 * Time-based, so it only fires while this tab/app instance stays open — there is no backend to push it in the background.
 */
export function useClassReminders(data: AppData, teacher: Teacher | undefined, onReminder: (info: { subject: string; className: string; period: number; time: string }) => void) {
  const remindedRef = useRef<{ dateKey: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!teacher || !data.schedule) return;

    const tick = () => {
      const now = new Date();
      const dateKey = todayKey(now);
      if (!remindedRef.current || remindedRef.current.dateKey !== dateKey) {
        remindedRef.current = { dateKey, ids: loadReminded(teacher.id, now) };
      }
      const reminded = remindedRef.current.ids;

      const todayDayId = dayIdForDate(now);
      if (!teacher.days.includes(todayDayId)) return;

      const lessonsToday = data.schedule!.lessons.filter(lesson => lesson.teacherId === teacher.id && lesson.dayId === todayDayId);
      for (const lesson of lessonsToday) {
        if (reminded.has(lesson.id)) continue;
        const time = data.periodTimes[lesson.period - 1];
        if (!time) continue;
        const [hours, minutes] = time.split(':').map(Number);
        const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        const minutesUntil = (startsAt.getTime() - now.getTime()) / 60_000;
        if (minutesUntil > 0 && minutesUntil <= REMINDER_LEAD_MINUTES) {
          reminded.add(lesson.id);
          const schoolClass = data.classes.find(item => item.id === lesson.classId);
          onReminder({ subject: lesson.subject || 'حصة دراسية', className: schoolClass?.name || 'صف غير محدد', period: lesson.period, time });
        }
      }
      saveReminded(teacher.id, now, reminded);
    };

    tick();
    const interval = window.setInterval(tick, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher?.id, teacher?.days, data.schedule, data.periodTimes]);
}
