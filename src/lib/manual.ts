import { uid, type AppData, type Lesson, type Requirement, type Schedule } from './data';
import { auditSchedule, classSlot, ScheduleState, teacherSlot } from './scheduler';

/**
 * شرح التغيير الذي سيطرأ على الجدول قبل تنفيذه.
 * يُعرض للمستخدم ليعرف تماماً ماذا سيحدث للحصة والمعلم والنصاب.
 */
export interface ChangeExplanation {
  kind: 'assign' | 'replace' | 'swap' | 'remove' | 'move';
  title: string;
  lines: string[];
  warnings: string[];
  canApply: boolean;
  blockedReason?: string;
}

const notReady: ChangeExplanation = {
  kind: 'assign',
  title: 'غير جاهز',
  lines: [],
  warnings: [],
  canApply: false,
  blockedReason: 'يجب توليد الجدول أولاً قبل التوزيع اليدوي.',
};

/** يبني حالة الجدول (انشغالات المعلمين والصفوف) من الدروس الحالية. */
export function buildState(data: AppData, lessons?: Lesson[]): ScheduleState {
  const state = new ScheduleState(data);
  (lessons ?? data.schedule?.lessons ?? []).forEach(lesson => state.add(lesson));
  return state;
}

/** النصاب الأسبوعي لمادة معينة: الإجمالي والموزّع والمتبقي. */
export function remainingCount(data: AppData, lessons: Lesson[], requirementId: string) {
  const req = data.requirements.find(item => item.id === requirementId);
  const total = req?.count ?? 0;
  const assigned = lessons.filter(item => item.requirementId === requirementId).length;
  return { total, assigned, remaining: Math.max(0, total - assigned) };
}

/** يشرح سبب تعذر إسناد معلم إلى موعد معين، أو null إذا كان الإسناد ممكناً. */
export function blockedReason(
  data: AppData,
  state: ScheduleState,
  teacherId: string,
  classId: string,
  dayId: string,
  period: number
): string | null {
  const teacher = data.teachers.find(item => item.id === teacherId);
  const day = data.days.find(item => item.id === dayId);
  if (!teacher || !day) return 'المعلم أو اليوم غير معرّف في البيانات.';
  if (!day.enabled) return `يوم ${day.name} غير مفعّل في الدوام المدرسي.`;
  if (period < 1 || period > day.periods) return `رقم الحصة خارج نطاق يوم ${day.name} (${day.periods} حصص فقط).`;
  if (!teacher.days.includes(dayId)) return `المعلم ${teacher.name} لا يعمل يوم ${day.name}.`;
  if (data.teacherExceptions.some(item => item.teacherId === teacherId && item.dayId === dayId && item.period === period))
    return `المعلم ${teacher.name} مستثنى من الحصة ${period} يوم ${day.name}.`;
  if (data.classExceptions.some(item => item.classId === classId && item.dayId === dayId && period >= item.fromPeriod))
    return 'الصف منصرف في هذا الموعد (انصراف مبكر).';
  if (state.classBusy.has(classSlot(classId, dayId, period))) return 'موعد الصف مشغول بحصة أخرى.';
  const busy = state.teacherBusy.get(teacherSlot(teacherId, dayId, period));
  if (busy) {
    const otherClass = data.classes.find(item => item.id === busy.classId)?.name ?? '';
    return `المعلم مشغول في هذا الموعد بحصة ${busy.subject || 'دراسية'} للصف ${otherClass}.`;
  }
  const daily = state.teacherDaily.get(`${teacherId}|${dayId}`) ?? 0;
  if (daily >= teacher.maxDaily)
    return `المعلم بلغ الحد الأقصى اليومي (${teacher.maxDaily} حصص) يوم ${day.name}.`;
  let consecutive = 1;
  for (let p = period - 1; p >= 1 && state.teacherBusy.has(teacherSlot(teacherId, dayId, p)); p--) consecutive++;
  for (let p = period + 1; p <= day.periods && state.teacherBusy.has(teacherSlot(teacherId, dayId, p)); p++) consecutive++;
  if (consecutive > teacher.maxConsecutive)
    return `الإسناد سيجعل الحصص المتتالية للمعلم ${consecutive} (الحد الأقصى المسموح ${teacher.maxConsecutive}).`;
  return null;
}

/** تنبيه ليّن: مخالفة عدد التكرار الإلزامي لمعلم في رقم حصة معين. */
export function periodLimitWarning(data: AppData, state: ScheduleState, teacherId: string, period: number): string | null {
  const limit = data.limits.find(item => item.teacherId === teacherId && item.period === period);
  if (!limit) return null;
  const current = state.periodCounts.get(`${teacherId}|${period}`) ?? 0;
  if (current >= limit.count)
    return `المعلم ملتزم بتكرار ${limit.count} مرة للحصة ${period} أسبوعياً (الحالي ${current}). هذا الإسناد سيخالف الالتزام وسيظهر تنبيه في الجدول.`;
  return null;
}

/** الأنصبة المتاحة (ذات رصيد متبقٍ) التي يمكن إسنادها لصف في موعد فارغ. */
export interface AssignableOption {
  requirement: Requirement;
  teacherName: string;
  remaining: number;
  total: number;
}

export function assignableRequirements(
  data: AppData,
  lessons: Lesson[],
  classId: string,
  dayId: string,
  period: number,
  fixedTeacherId?: string
): AssignableOption[] {
  const state = buildState(data, lessons);
  return data.requirements
    .filter(req => req.classId === classId)
    .filter(req => !fixedTeacherId || req.teacherId === fixedTeacherId)
    .filter(req => {
      const { remaining } = remainingCount(data, lessons, req.id);
      return remaining > 0 && !blockedReason(data, state, req.teacherId, classId, dayId, period);
    })
    .map(req => ({
      requirement: req,
      teacherName: data.teachers.find(item => item.id === req.teacherId)?.name ?? '',
      ...remainingCount(data, lessons, req.id),
    }));
}

/** معاينة إسناد حصة جديدة لموعد فارغ. */
export function previewAssign(
  data: AppData,
  classId: string,
  dayId: string,
  period: number,
  requirementId: string
): ChangeExplanation {
  const schedule = data.schedule;
  const req = data.requirements.find(item => item.id === requirementId);
  const teacher = data.teachers.find(item => item.id === req?.teacherId);
  const cls = data.classes.find(item => item.id === classId);
  const day = data.days.find(item => item.id === dayId);
  if (!schedule || !req || !teacher || !cls || !day) return notReady;

  const lines: string[] = [
    `المعلم: ${teacher.name}`,
    `الصف: ${cls.name}`,
    `المادة: ${req.subject || 'غير محددة'}`,
    `الموعد: ${day.name} - الحصة ${period}`,
  ];
  const { remaining, total, assigned } = remainingCount(data, schedule.lessons, req.id);
  lines.push(`نصاب هذه المادة: ${total} حصص أسبوعياً (الموزّع حالياً ${assigned}).`);

  if (remaining <= 0)
    return { kind: 'assign', title: 'إسناد حصة جديدة', lines, warnings: [], canApply: false, blockedReason: 'اكتمل نصاب هذه المادة، لا توجد حصص متبقية للإسناد.' };

  const existing = schedule.lessons.find(item => item.classId === classId && item.dayId === dayId && item.period === period);
  if (existing)
    return { kind: 'assign', title: 'إسناد حصة جديدة', lines, warnings: [], canApply: false, blockedReason: 'هذا الموعد مشغول بحصة أخرى. استخدم «استبدال» لتغيير المعلم في هذا الموعد.' };

  const state = buildState(data, schedule.lessons);
  const reason = blockedReason(data, state, teacher.id, classId, dayId, period);
  if (reason)
    return { kind: 'assign', title: 'إسناد حصة جديدة', lines, warnings: [], canApply: false, blockedReason: reason };

  lines.push(`بعد الإسناد: سيتبقى ${remaining - 1} حصص من نصاب هذه المادة، وسيصبح نصاب المعلم اليومي في هذا اليوم ${(state.teacherDaily.get(`${teacher.id}|${dayId}`) ?? 0) + 1} حصص.`);
  const warnings: string[] = [];
  const limitWarning = periodLimitWarning(data, state, teacher.id, period);
  if (limitWarning) warnings.push(limitWarning);
  return { kind: 'assign', title: 'إسناد حصة جديدة', lines, warnings, canApply: true };
}

/** معاينة نقل حصة إلى موعد آخر داخل الصف نفسه (مع تبديل إن كان الموعد مشغولاً). */
export function previewMove(data: AppData, lessonId: string, dayId: string, period: number): ChangeExplanation {
  const schedule = data.schedule;
  const lesson = schedule?.lessons.find(item => item.id === lessonId);
  const day = data.days.find(item => item.id === dayId);
  const cls = data.classes.find(item => item.id === lesson?.classId);
  const teacher = data.teachers.find(item => item.id === lesson?.teacherId);
  if (!schedule || !lesson || !day || !cls || !teacher) return notReady;

  const lines: string[] = [
    `الحصة: ${lesson.subject || 'حصة دراسية'} - المعلم ${teacher.name}`,
    `من: ${data.days.find(item => item.id === lesson.dayId)?.name} الحصة ${lesson.period}`,
    `إلى: ${day.name} الحصة ${period}`,
  ];
  if (lesson.dayId === dayId && lesson.period === period)
    return { kind: 'move', title: 'نقل الحصة', lines, warnings: [], canApply: false, blockedReason: 'اختر موعداً مختلفاً عن الموعد الحالي.' };

  const target = schedule.lessons.find(item => item.classId === lesson.classId && item.dayId === dayId && item.period === period);
  if (target?.fixed)
    return { kind: 'move', title: 'نقل الحصة', lines, warnings: [], canApply: false, blockedReason: 'الموعد الجديد مشغول بحصة محجوزة ثابتة لا يمكن نقلها.' };

  const state = buildState(data, schedule.lessons.filter(item => item.id !== lesson.id && item.id !== target?.id));
  const reason = blockedReason(data, state, teacher.id, lesson.classId, dayId, period);
  if (reason)
    return { kind: 'move', title: 'نقل الحصة', lines, warnings: [], canApply: false, blockedReason: reason };

  const targetTeacher = data.teachers.find(item => item.id === target?.teacherId);
  if (target && targetTeacher) {
    lines.push(`الموعد الجديد مشغول بحصة ${target.subject || 'دراسية'} للمعلم ${targetTeacher.name}، وسيتم التبديل: تنتقل حصته إلى ${data.days.find(item => item.id === lesson.dayId)?.name} الحصة ${lesson.period}.`);
    const swapReason = blockedReason(data, state, targetTeacher.id, target.classId, lesson.dayId, lesson.period);
    if (swapReason)
      return { kind: 'move', title: 'نقل الحصة', lines, warnings: [], canApply: false, blockedReason: `لا يمكن إتمام التبديل: ${swapReason}` };
  } else {
    lines.push('الموعد الجديد فارغ، وسيصبح الموعد القديم متاحاً لإسناد جديد.');
  }
  const warnings: string[] = [];
  const limitWarning = periodLimitWarning(data, state, teacher.id, period);
  if (limitWarning) warnings.push(limitWarning);
  return { kind: 'move', title: 'نقل الحصة', lines, warnings, canApply: true };
}

/** معاينة استبدال معلم حصة قائمة بمعلم/مادة أخرى. */
export function previewReplace(data: AppData, lessonId: string, requirementId: string): ChangeExplanation {
  const schedule = data.schedule;
  const lesson = schedule?.lessons.find(item => item.id === lessonId);
  const req = data.requirements.find(item => item.id === requirementId);
  const newTeacher = data.teachers.find(item => item.id === req?.teacherId);
  const cls = data.classes.find(item => item.id === lesson?.classId);
  const day = data.days.find(item => item.id === lesson?.dayId);
  if (!schedule || !lesson || !req || !newTeacher || !cls || !day) return notReady;

  const oldTeacher = data.teachers.find(item => item.id === lesson.teacherId);
  const lines: string[] = [
    `الموعد: ${day.name} - الحصة ${lesson.period} - الصف ${cls.name}`,
    `الحصة الحالية: ${lesson.subject || 'حصة دراسية'} (المعلم ${oldTeacher?.name ?? 'غير معرّف'})`,
    `الحصة الجديدة: ${req.subject || 'حصة دراسية'} (المعلم ${newTeacher.name})`,
  ];

  if (lesson.fixed)
    return { kind: 'replace', title: 'استبدال الحصة', lines, warnings: [], canApply: false, blockedReason: 'هذه حصة محجوزة ثابتة. عدّلها من قسم «حجز الحصص».' };

  const { remaining } = remainingCount(data, schedule.lessons, req.id);
  if (req.id === lesson.requirementId)
    return { kind: 'replace', title: 'استبدال الحصة', lines, warnings: [], canApply: false, blockedReason: 'هذه هي المادة المسندة حالياً. اختر مادة/معلماً مختلفاً.' };
  if (remaining <= 0)
    return { kind: 'replace', title: 'استبدال الحصة', lines, warnings: [], canApply: false, blockedReason: 'اكتمل نصاب المادة الجديدة، لا توجد حصص متبقية للإسناد.' };

  const state = buildState(data, schedule.lessons.filter(item => item.id !== lesson.id));
  const reason = blockedReason(data, state, newTeacher.id, cls.id, day.id, lesson.period);
  if (reason)
    return { kind: 'replace', title: 'استبدال الحصة', lines, warnings: [], canApply: false, blockedReason: reason };

  lines.push('بعد الاستبدال: تُزال الحصة الحالية من نصاب معلمها (تُتاح حصة جديدة لإسنادها)، وتُحتسب الحصة الجديدة ضمن نصاب المعلم الجديد.');
  if (lesson.requirementId) {
    const oldBalance = remainingCount(data, schedule.lessons, lesson.requirementId);
    lines.push(`نصاب المادة السابقة: كان موزّعاً ${oldBalance.assigned} من ${oldBalance.total}، وسيصبح ${oldBalance.assigned - 1} (متبقٍ ${oldBalance.remaining + 1}).`);
  }
  const warnings: string[] = [];
  const limitWarning = periodLimitWarning(data, state, newTeacher.id, lesson.period);
  if (limitWarning) warnings.push(limitWarning);
  return { kind: 'replace', title: 'استبدال الحصة', lines, warnings, canApply: true };
}

/** معاينة إزالة (تفريغ) حصة من موعدها. */
export function previewRemove(data: AppData, lessonId: string): ChangeExplanation {
  const schedule = data.schedule;
  const lesson = schedule?.lessons.find(item => item.id === lessonId);
  const cls = data.classes.find(item => item.id === lesson?.classId);
  const day = data.days.find(item => item.id === lesson?.dayId);
  const teacher = data.teachers.find(item => item.id === lesson?.teacherId);
  if (!schedule || !lesson || !cls || !day || !teacher) return notReady;

  const lines: string[] = [
    `الحصة المزالة: ${lesson.subject || 'حصة دراسية'} - المعلم ${teacher.name}`,
    `الموعد: ${day.name} - الحصة ${lesson.period} - الصف ${cls.name}`,
  ];
  if (lesson.fixed)
    return { kind: 'remove', title: 'إزالة الحصة', lines, warnings: [], canApply: false, blockedReason: 'هذه حصة محجوزة ثابتة. أزل الحجز من قسم «حجز الحصص».' };
  lines.push('بعد الإزالة: يصبح الموعد فارغاً ومتاحاً لإسناد جديد، ويعود رصيد حصة إلى نصاب هذه المادة ليُعاد توزيعه.');
  if (lesson.requirementId) {
    const balance = remainingCount(data, schedule.lessons, lesson.requirementId);
    lines.push(`نصاب المادة: موزّع ${balance.assigned} من ${balance.total}، وسيصبح ${balance.assigned - 1} (متبقٍ ${balance.remaining + 1}).`);
  }
  return { kind: 'remove', title: 'إزالة الحصة', lines, warnings: [], canApply: true };
}

function withAudit(data: AppData, lessons: Lesson[]): Schedule {
  const current = data.schedule!;
  return {
    ...current,
    lessons,
    warnings: auditSchedule(data, lessons),
  };
}

export function applyAssign(data: AppData, classId: string, dayId: string, period: number, requirementId: string): Schedule {
  const req = data.requirements.find(item => item.id === requirementId)!;
  const lesson: Lesson = {
    id: uid(),
    teacherId: req.teacherId,
    classId,
    dayId,
    period,
    subject: req.subject,
    requirementId: req.id,
    fixed: false,
  };
  return withAudit(data, [...data.schedule!.lessons, lesson]);
}

export function applyRemove(data: AppData, lessonId: string): Schedule {
  return withAudit(data, data.schedule!.lessons.filter(item => item.id !== lessonId));
}

export function applyReplace(data: AppData, lessonId: string, requirementId: string): Schedule {
  const req = data.requirements.find(item => item.id === requirementId)!;
  const lessons = data.schedule!.lessons.map(item =>
    item.id === lessonId
      ? { ...item, teacherId: req.teacherId, subject: req.subject, requirementId: req.id, fixed: false }
      : item
  );
  return withAudit(data, lessons);
}

export function applySwap(data: AppData, lessonAId: string, lessonBId: string): Schedule {
  const a = data.schedule!.lessons.find(item => item.id === lessonAId)!;
  const b = data.schedule!.lessons.find(item => item.id === lessonBId)!;
  const lessons = data.schedule!.lessons.map(item => {
    if (item.id === a.id) return { ...item, dayId: b.dayId, period: b.period };
    if (item.id === b.id) return { ...item, dayId: a.dayId, period: a.period };
    return item;
  });
  return withAudit(data, lessons);
}
