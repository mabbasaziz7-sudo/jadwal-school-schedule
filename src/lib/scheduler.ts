import { classCapacity, uid, type AppData, type Lesson, type Requirement, type Schedule } from './data';

export interface Slot { dayId: string; period: number; classId: string }
export const teacherSlot = (teacherId: string, dayId: string, period: number) => `${teacherId}|${dayId}|${period}`;
export const classSlot = (classId: string, dayId: string, period: number) => `${classId}|${dayId}|${period}`;

export class ScheduleState {
  lessons: Lesson[] = [];
  teacherBusy = new Map<string, Lesson>();
  classBusy = new Map<string, Lesson>();
  teacherDaily = new Map<string, number>();
  periodCounts = new Map<string, number>();
  subjectDaily = new Map<string, number>();
  teachers: Map<string, AppData['teachers'][number]>;
  classes: Set<string>;
  days: Map<string, AppData['days'][number]>;
  blocked: Set<string>;
  releases = new Map<string, number>();
  limits: Map<string, number>;

  constructor(public data: AppData) {
    this.teachers = new Map(data.teachers.map(item => [item.id, item]));
    this.classes = new Set(data.classes.map(item => item.id));
    this.days = new Map(data.days.map(item => [item.id, item]));
    this.blocked = new Set(data.teacherExceptions.map(item => teacherSlot(item.teacherId, item.dayId, item.period)));
    data.classExceptions.forEach(item => {
      const key = `${item.classId}|${item.dayId}`;
      this.releases.set(key, Math.min(this.releases.get(key) ?? 13, item.fromPeriod));
    });
    this.limits = new Map(data.limits.map(item => [`${item.teacherId}|${item.period}`, item.count]));
  }

  allowed(teacherId: string, slot: Slot, ignoreLimit = false): boolean {
    const teacher = this.teachers.get(teacherId);
    const day = this.days.get(slot.dayId);
    if (!teacher || !this.classes.has(slot.classId) || !day?.enabled || !Number.isInteger(slot.period) || slot.period < 1 || slot.period > day.periods || !teacher.days.includes(slot.dayId)) return false;
    if (slot.period >= (this.releases.get(`${slot.classId}|${slot.dayId}`) ?? 13)) return false;
    if (this.blocked.has(teacherSlot(teacherId, slot.dayId, slot.period))) return false;
    if (this.classBusy.has(classSlot(slot.classId, slot.dayId, slot.period)) || this.teacherBusy.has(teacherSlot(teacherId, slot.dayId, slot.period))) return false;
    if ((this.teacherDaily.get(`${teacherId}|${slot.dayId}`) ?? 0) >= teacher.maxDaily) return false;
    const periodKey = `${teacherId}|${slot.period}`;
    if (!ignoreLimit && this.limits.has(periodKey) && (this.periodCounts.get(periodKey) ?? 0) >= this.limits.get(periodKey)!) return false;
    let consecutive = 1;
    for (let p = slot.period - 1; p >= 1 && this.teacherBusy.has(teacherSlot(teacherId, slot.dayId, p)); p--) consecutive++;
    for (let p = slot.period + 1; p <= day.periods && this.teacherBusy.has(teacherSlot(teacherId, slot.dayId, p)); p++) consecutive++;
    return consecutive <= teacher.maxConsecutive;
  }

  add(lesson: Lesson) {
    this.lessons.push(lesson);
    this.teacherBusy.set(teacherSlot(lesson.teacherId, lesson.dayId, lesson.period), lesson);
    this.classBusy.set(classSlot(lesson.classId, lesson.dayId, lesson.period), lesson);
    const dailyKey = `${lesson.teacherId}|${lesson.dayId}`;
    const periodKey = `${lesson.teacherId}|${lesson.period}`;
    this.teacherDaily.set(dailyKey, (this.teacherDaily.get(dailyKey) ?? 0) + 1);
    this.periodCounts.set(periodKey, (this.periodCounts.get(periodKey) ?? 0) + 1);
    const subjectKey = `${lesson.requirementId}|${lesson.dayId}`;
    this.subjectDaily.set(subjectKey, (this.subjectDaily.get(subjectKey) ?? 0) + 1);
  }

  remove(lesson: Lesson) {
    this.lessons = this.lessons.filter(item => item.id !== lesson.id);
    this.teacherBusy.delete(teacherSlot(lesson.teacherId, lesson.dayId, lesson.period));
    this.classBusy.delete(classSlot(lesson.classId, lesson.dayId, lesson.period));
    const dailyKey = `${lesson.teacherId}|${lesson.dayId}`;
    const periodKey = `${lesson.teacherId}|${lesson.period}`;
    this.teacherDaily.set(dailyKey, (this.teacherDaily.get(dailyKey) ?? 1) - 1);
    this.periodCounts.set(periodKey, (this.periodCounts.get(periodKey) ?? 1) - 1);
    const subjectKey = `${lesson.requirementId}|${lesson.dayId}`;
    this.subjectDaily.set(subjectKey, (this.subjectDaily.get(subjectKey) ?? 1) - 1);
  }
}

function remainingRequirements(data: AppData, lessons: Lesson[]) {
  const counts = new Map<string, number>();
  lessons.forEach(lesson => { if (lesson.requirementId) counts.set(lesson.requirementId, (counts.get(lesson.requirementId) ?? 0) + 1); });
  return new Map(data.requirements.map(requirement => [requirement.id, Math.max(0, requirement.count - (counts.get(requirement.id) ?? 0))]));
}

export function auditSchedule(data: AppData, lessons: Lesson[]): string[] {
  const warnings: string[] = [];
  const teacherName = (id: string) => data.teachers.find(item => item.id === id)?.name ?? '';
  const className = (id: string) => data.classes.find(item => item.id === id)?.name ?? '';
  const remaining = remainingRequirements(data, lessons);
  const verified = new ScheduleState(data);
  lessons.forEach(lesson => {
    if (!verified.allowed(lesson.teacherId, lesson, true)) warnings.push(`تعارض في حصة ${teacherName(lesson.teacherId)} للصف ${className(lesson.classId)} يوم ${data.days.find(day => day.id === lesson.dayId)?.name}، الحصة ${lesson.period}. راجع الدوام والحدود اليومية.`);
    verified.add(lesson);
  });
  data.requirements.forEach(requirement => {
    const count = remaining.get(requirement.id) ?? 0;
    if (count > 0) warnings.push(`لم تُوزّع ${count} من حصص ${requirement.subject || teacherName(requirement.teacherId)} للصف ${className(requirement.classId)}. راجع النصاب والقيود.`);
  });
  data.limits.forEach(limit => {
    const count = verified.periodCounts.get(`${limit.teacherId}|${limit.period}`) ?? 0;
    if (count !== limit.count) warnings.push(`${teacherName(limit.teacherId)}: تكرار الحصة ${limit.period} هو ${count} من أصل ${limit.count} المطلوبة أسبوعياً.`);
  });
  data.teachers.forEach(teacher => {
    data.days.filter(day => day.enabled && teacher.days.includes(day.id)).forEach(day => {
      const count = verified.teacherDaily.get(`${teacher.id}|${day.id}`) ?? 0;
      if (count < teacher.minDaily) warnings.push(`${teacher.name}: ${count} حصص يوم ${day.name}، أقل من الحد اليومي المحدد (${teacher.minDaily}).`);
    });
  });
  data.classes.forEach(schoolClass => {
    const assigned = lessons.filter(lesson => lesson.classId === schoolClass.id).length;
    const capacity = classCapacity(data, schoolClass.id);
    if (assigned < capacity) warnings.push(`الصف ${schoolClass.name}: توجد ${capacity - assigned} حصص غير مشغولة من إجمالي ${capacity}.`);
    const gapDays = data.days.filter(day => {
      const periods = lessons.filter(lesson => lesson.classId === schoolClass.id && lesson.dayId === day.id).map(lesson => lesson.period);
      return periods.length && periods.length < Math.max(...periods);
    });
    if (gapDays.length) warnings.push(`الصف ${schoolClass.name}: توجد فراغات وسط اليوم في ${gapDays.map(day => day.name).join('، ')}. جرّب إعادة التوليد أو تخفيف القيود.`);
  });
  data.bookings.forEach(booking => {
    if (!lessons.some(lesson => lesson.id === `fixed-${booking.id}`)) warnings.push(`تعذّر تثبيت حجز ${teacherName(booking.teacherId)} للصف ${className(booking.classId)} يوم ${data.days.find(day => day.id === booking.dayId)?.name}، الحصة ${booking.period}. يتعارض مع إعدادات الدوام أو حجز آخر.`);
  });
  return warnings;
}

function candidateScore(state: ScheduleState, requirement: Requirement, slot: Slot, remaining: Map<string, number>) {
  const teacher = state.teachers.get(requirement.teacherId)!;
  const load = state.teacherDaily.get(`${teacher.id}|${slot.dayId}`) ?? 0;
  const sameSubject = state.subjectDaily.get(`${requirement.id}|${slot.dayId}`) ?? 0;
  const target = state.limits.get(`${teacher.id}|${slot.period}`);
  const current = state.periodCounts.get(`${teacher.id}|${slot.period}`) ?? 0;
  return (remaining.get(requirement.id) ?? 0) * 2.4
    + (target === undefined ? 0 : Math.max(0, target - current) * 7)
    + Math.max(0, teacher.minDaily - load) * 3
    + 3 / Math.max(1, teacher.days.length)
    - sameSubject * 7 - load * 0.75 + Math.random() * 4;
}

function balancedWeek(data: AppData): Lesson[] | null {
  const days = data.days.filter(day => day.enabled);
  const periods = days[0]?.periods ?? 0;
  if (!periods || data.bookings.length || data.classes.length > periods || days.some(day => day.periods !== periods)) return null;
  const first = data.requirements.filter(item => item.classId === data.classes[0].id);
  const teacherOrder = first.map(item => item.teacherId);
  if (first.length !== periods || new Set(teacherOrder).size !== periods) return null;
  const requirements = new Map(data.classes.map(schoolClass => [schoolClass.id, new Map(data.requirements.filter(item => item.classId === schoolClass.id).map(item => [item.teacherId, item]))]));
  if (data.classes.some(schoolClass => {
    const entries = data.requirements.filter(item => item.classId === schoolClass.id);
    return entries.length !== periods || entries.some(item => item.count !== days.length || !teacherOrder.includes(item.teacherId));
  })) return null;
  for (let index = teacherOrder.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [teacherOrder[index], teacherOrder[other]] = [teacherOrder[other], teacherOrder[index]];
  }
  const state = new ScheduleState(data);
  // A rotating, evenly spaced assignment solves regular curricula without a search.
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    for (let period = 1; period <= periods; period++) {
      for (let classIndex = 0; classIndex < data.classes.length; classIndex++) {
        const schoolClass = data.classes[classIndex];
        const offset = Math.floor(classIndex * periods / data.classes.length);
        const teacherId = teacherOrder[(period - 1 + offset + dayIndex) % periods];
        const requirement = requirements.get(schoolClass.id)?.get(teacherId);
        const slot = { classId: schoolClass.id, dayId: days[dayIndex].id, period };
        if (!requirement || !state.allowed(teacherId, slot)) return null;
        state.add({ ...slot, id: uid(), teacherId, subject: requirement.subject, requirementId: requirement.id, fixed: false });
      }
    }
  }
  return auditSchedule(data, state.lessons).length ? null : state.lessons;
}

export async function generateSchedule(data: AppData, onProgress: (value: number) => void): Promise<Schedule> {
  const days = data.days.filter(day => day.enabled);
  if (!days.length) throw new Error('فعّل يوماً دراسياً واحداً على الأقل من أيام الدوام.');
  if (!data.teachers.length || !data.classes.length) throw new Error('أضف المعلمين والصفوف أولاً لتتمكن من إنشاء الجدول.');
  if (!data.requirements.length && !data.bookings.length) throw new Error('أضف نصاب الحصص أو الحصص المحجوزة قبل توليد الجدول.');
  const balanced = balancedWeek(data);
  if (balanced) {
    onProgress(100);
    return { lessons: balanced, warnings: [], generatedAt: new Date().toISOString(), requested: data.requirements.reduce((sum, item) => sum + item.count, 0), placed: balanced.length };
  }

  const slots: Slot[] = days.flatMap(day => Array.from({ length: day.periods }, (_, index) => data.classes.map(schoolClass => ({ dayId: day.id, period: index + 1, classId: schoolClass.id }))).flat());
  const requirementsByClass = new Map(data.classes.map(schoolClass => [schoolClass.id, data.requirements.filter(item => item.classId === schoolClass.id)]));
  const slotsByClass = new Map(data.classes.map(schoolClass => [schoolClass.id, slots.filter(slot => slot.classId === schoolClass.id)]));
  const bookingBudget = new Map(data.requirements.map(item => [item.id, item.count]));
  let requested = data.requirements.reduce((sum, item) => sum + item.count, 0);
  data.bookings.forEach(booking => {
    const match = data.requirements.find(item => item.teacherId === booking.teacherId && item.classId === booking.classId && (!booking.subject || item.subject === booking.subject) && (bookingBudget.get(item.id) ?? 0) > 0);
    if (match) bookingBudget.set(match.id, bookingBudget.get(match.id)! - 1);
    else requested++;
  });
  let bestLessons: Lesson[] = [];
  let bestScore = -Infinity;
  const maxAttempts = slots.length > 700 ? 16 : 48;
  const start = Date.now();
  const deadline = start + 7000;
  let lastYield = start;
  let reportedProgress = 0;
  const yieldToBrowser = async () => {
    if (Date.now() - lastYield < 25) return;
    reportedProgress = Math.max(reportedProgress, Math.min(97, Math.round((Date.now() - start) / 70)));
    onProgress(reportedProgress);
    await new Promise(resolve => setTimeout(resolve, 0));
    lastYield = Date.now();
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = new ScheduleState(data);
    const remaining = new Map(data.requirements.map(item => [item.id, item.count]));

    // Fixed bookings enter first and consume the matching weekly requirement.
    data.bookings.forEach(booking => {
      if (!state.allowed(booking.teacherId, booking, true)) return;
      const requirement = data.requirements.find(item => item.teacherId === booking.teacherId && item.classId === booking.classId && (!booking.subject || item.subject === booking.subject) && (remaining.get(item.id) ?? 0) > 0);
      state.add({ ...booking, id: `fixed-${booking.id}`, fixed: true, requirementId: requirement?.id, subject: booking.subject || requirement?.subject || '' });
      if (requirement) remaining.set(requirement.id, remaining.get(requirement.id)! - 1);
    });

    const candidates = (slot: Slot) => (requirementsByClass.get(slot.classId) ?? []).filter(requirement => (remaining.get(requirement.id) ?? 0) > 0 && state.allowed(requirement.teacherId, slot));
    const put = (requirement: Requirement, slot: Slot) => {
      state.add({ ...slot, id: uid(), teacherId: requirement.teacherId, subject: requirement.subject, requirementId: requirement.id, fixed: false });
      remaining.set(requirement.id, remaining.get(requirement.id)! - 1);
    };

    // Work chronologically, handling the most constrained class first in each period.
    assignment: for (const day of days) {
      for (let period = 1; period <= day.periods; period++) {
        if (Date.now() > deadline) break assignment;
        const open = data.classes.map(schoolClass => ({ classId: schoolClass.id, dayId: day.id, period })).filter(slot => !state.classBusy.has(classSlot(slot.classId, slot.dayId, slot.period)));
        while (open.length) {
          let chosen = 0;
          let available = candidates(open[0]);
          for (let index = 1; index < open.length; index++) {
            const next = candidates(open[index]);
            if (next.length < available.length || (next.length === available.length && Math.random() < 0.35)) { chosen = index; available = next; }
          }
          const slot = open.splice(chosen, 1)[0];
          const options = available.map(requirement => ({ requirement, score: candidateScore(state, requirement, slot, remaining) })).sort((a, b) => b.score - a.score);
          if (options.length) put(options[0].requirement, slot);
        }
        await yieldToBrowser();
      }
    }

    // Repair missed assignments by relocating one non-fixed lesson into a free slot.
    repair: for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (const requirement of data.requirements) {
        if (Date.now() > deadline) break repair;
        await yieldToBrowser();
        while ((remaining.get(requirement.id) ?? 0) > 0) {
          const classSlots = slotsByClass.get(requirement.classId) ?? [];
          const free = classSlots.filter(slot => !state.classBusy.has(classSlot(slot.classId, slot.dayId, slot.period)));
          if (!free.length) break;
          const direct = free.find(slot => state.allowed(requirement.teacherId, slot));
          if (direct) { put(requirement, direct); changed = true; continue; }
          let repaired = false;
          for (const displaced of [...state.lessons].filter(lesson => lesson.classId === requirement.classId && !lesson.fixed)) {
            state.remove(displaced);
            if (state.allowed(requirement.teacherId, displaced)) {
              const replacement: Lesson = { ...displaced, id: uid(), teacherId: requirement.teacherId, subject: requirement.subject, requirementId: requirement.id };
              state.add(replacement);
              const destination = free.find(slot => state.allowed(displaced.teacherId, slot));
              if (destination) {
                state.add({ ...displaced, ...destination });
                remaining.set(requirement.id, remaining.get(requirement.id)! - 1);
                repaired = true;
                changed = true;
                break;
              }
              state.remove(replacement);
            }
            state.add(displaced);
          }
          if (!repaired) break;
        }
      }
      if (!changed) break;
    }

    // Move lessons into earlier empty periods when the teacher constraints allow it.
    compression: for (const day of days) {
      for (const schoolClass of data.classes) {
        if (Date.now() > deadline) break compression;
        await yieldToBrowser();
        for (let period = 1; period <= day.periods; period++) {
          const slot = { classId: schoolClass.id, dayId: day.id, period };
          if (state.classBusy.has(classSlot(slot.classId, slot.dayId, period))) continue;
          const later = state.lessons.filter(lesson => !lesson.fixed && lesson.classId === schoolClass.id && lesson.dayId === day.id && lesson.period > period).sort((a, b) => b.period - a.period);
          for (const lesson of later) {
            state.remove(lesson);
            if (state.allowed(lesson.teacherId, slot)) { state.add({ ...lesson, period }); break; }
            state.add(lesson);
          }
        }
      }
    }

    const warnings = auditSchedule(data, state.lessons);
    const assigned = state.lessons.filter(lesson => lesson.requirementId).length;
    const score = assigned * 10000 + state.lessons.filter(lesson => lesson.fixed).length * 10000 - warnings.length * 100;
    if (score > bestScore) { bestScore = score; bestLessons = state.lessons.map(lesson => ({ ...lesson })); }
    reportedProgress = Math.max(reportedProgress, Math.round(((attempt + 1) / maxAttempts) * 100));
    onProgress(reportedProgress);
    if (warnings.length === 0 || Date.now() > deadline) break;
    if (attempt % 3 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  onProgress(100);
  return {
    lessons: bestLessons,
    warnings: auditSchedule(data, bestLessons),
    generatedAt: new Date().toISOString(),
    requested,
    placed: bestLessons.length,
  };
}

/** An empty schedule an admin can fill in entirely by hand, without ever running the generator. */
export function startBlankSchedule(): Schedule {
  return { lessons: [], warnings: [], generatedAt: new Date().toISOString(), requested: 0, placed: 0 };
}

/**
 * Directly sets (or replaces) the lesson in one schedule cell. Used by the manual "type into any cell"
 * editor — bypasses requirements/generation entirely. Conflicts (double-booked teacher, etc.) are still
 * surfaced through the normal warnings list rather than blocked, since manual entry is meant to override.
 */
export function upsertManualLesson(data: AppData, input: { id?: string; teacherId: string; classId: string; dayId: string; period: number; subject: string }): Schedule {
  const base = data.schedule ?? startBlankSchedule();
  const withoutSlot = base.lessons.filter(lesson => lesson.id !== input.id && !(lesson.classId === input.classId && lesson.dayId === input.dayId && lesson.period === input.period));
  const lesson: Lesson = { id: input.id ?? uid(), teacherId: input.teacherId, classId: input.classId, dayId: input.dayId, period: input.period, subject: input.subject.trim(), fixed: true, manual: true };
  const lessons = [...withoutSlot, lesson];
  return { ...base, lessons, warnings: auditSchedule(data, lessons), placed: lessons.length };
}

export function removeManualLesson(data: AppData, lessonId: string): Schedule {
  if (!data.schedule) throw new Error('لا يوجد جدول لتعديله.');
  const lessons = data.schedule.lessons.filter(lesson => lesson.id !== lessonId);
  return { ...data.schedule, lessons, warnings: auditSchedule(data, lessons), placed: lessons.length };
}

export function moveLesson(data: AppData, lessonId: string, dayId: string, period: number): Schedule {
  if (!data.schedule) throw new Error('لا يوجد جدول لتعديله.');
  const source = data.schedule.lessons.find(lesson => lesson.id === lessonId);
  if (!source || source.fixed) throw new Error('الحصة المحجوزة ثابتة. يمكنك تعديلها من قسم حجز الحصص ثم إعادة التوليد.');
  if (source.dayId === dayId && source.period === period) return data.schedule;
  const target = data.schedule.lessons.find(lesson => lesson.classId === source.classId && lesson.dayId === dayId && lesson.period === period);
  if (target?.fixed) throw new Error('لا يمكن التبديل مع حصة محجوزة وثابتة.');
  const state = new ScheduleState(data);
  data.schedule.lessons.filter(lesson => lesson.id !== source.id && lesson.id !== target?.id).forEach(lesson => state.add(lesson));
  const moved = { ...source, dayId, period };
  if (!state.allowed(moved.teacherId, moved)) throw new Error('الموعد غير متاح: يوجد تعارض مع دوام المعلم أو حصصه أو أحد القيود.');
  state.add(moved);
  if (target) {
    const swapped = { ...target, dayId: source.dayId, period: source.period };
    if (!state.allowed(swapped.teacherId, swapped)) throw new Error('لا يمكن تبديل الحصتين لأن الموعد الآخر يتعارض مع قيود المعلم.');
    state.add(swapped);
  }
  return { ...data.schedule, lessons: state.lessons, warnings: auditSchedule(data, state.lessons) };
}