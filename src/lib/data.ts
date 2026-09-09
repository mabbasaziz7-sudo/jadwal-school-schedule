export type TabId = 'dashboard' | 'days' | 'teachers' | 'classes' | 'subjects' | 'requirements' | 'exceptions' | 'limits' | 'bookings' | 'distribute' | 'schedule' | 'data' | 'settings';

export interface SchoolDay {
  id: string;
  name: string;
  short: string;
  enabled: boolean;
  periods: number;
}

export interface Teacher {
  id: string;
  name: string;
  code: string;
  minDaily: number;
  maxDaily: number;
  maxConsecutive: number;
  days: string[];
  /** Optional login password for the teacher portal. Empty means anyone can log in by picking the teacher's name, as before. */
  password?: string;
}

/** A grade level (e.g. "العاشر"), grouping several class sections ("الفصول") under one label. */
export interface Grade {
  id: string;
  name: string;
}

/** A subject taught at the school (e.g. "الرياضيات"). A simple registry used to suggest/standardize subject names elsewhere. */
export interface Subject {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  /** The grade this section belongs to ("" means not yet assigned to a grade). */
  gradeId: string;
}

export interface Requirement {
  id: string;
  teacherId: string;
  classId: string;
  subject: string;
  count: number;
}

export interface TeacherException {
  id: string;
  teacherId: string;
  dayId: string;
  period: number;
}

export interface ClassException {
  id: string;
  classId: string;
  dayId: string;
  fromPeriod: number;
}

export interface PeriodLimit {
  id: string;
  teacherId: string;
  period: number;
  count: number;
}

export interface Booking {
  id: string;
  teacherId: string;
  classId: string;
  dayId: string;
  period: number;
  subject: string;
}

/** A group of classes an admin hands off to a section supervisor for read-only monitoring. */
export interface Section {
  id: string;
  name: string;
  classIds: string[];
}

/** A read-only account scoped to one section, assigned by the admin. Logs in by picking a name, like a teacher. */
export interface Supervisor {
  id: string;
  name: string;
  sectionId: string;
}

/** A group of classes an existing teacher additionally follows up on as "مشرف الجناح" — an extra duty, not a separate account. */
export interface Wing {
  id: string;
  name: string;
  classIds: string[];
  teacherId: string;
}

/** A file or image the admin attaches to one teacher's or one class's schedule (e.g. a scanned/signed copy). Stored as a data URL — this app has no server. */
export interface Attachment {
  id: string;
  targetType: 'teacher' | 'class';
  targetId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
}

export type PermissionResource = 'dashboard' | 'days' | 'teachers' | 'classes' | 'subjects' | 'requirements' | 'exceptions' | 'limits' | 'bookings' | 'distribute' | 'schedule' | 'data' | 'settings';
export type PermissionLevel = 'none' | 'view' | 'edit';
export type PermissionMap = Record<PermissionResource, PermissionLevel>;

/** A staff account (principal, assistant principal, supervisor, department head, specialist, ...) with admin-defined, per-page permissions. */
export interface StaffAccount {
  id: string;
  name: string;
  /** Free-text job title shown in the UI, e.g. "مدير مدرسة" or "أخصائي اجتماعي". Doesn't itself grant access — permissions do. */
  title: string;
  username: string;
  password: string;
  permissions: PermissionMap;
}

export interface Lesson {
  id: string;
  teacherId: string;
  classId: string;
  dayId: string;
  period: number;
  subject: string;
  requirementId?: string;
  fixed: boolean;
  /** Typed directly into a schedule cell by the admin, bypassing generation. Always paired with fixed: true. */
  manual?: boolean;
}

export interface Schedule {
  lessons: Lesson[];
  warnings: string[];
  generatedAt: string;
  requested: number;
  placed: number;
}

export interface AppData {
  version: 1;
  schoolName: string;
  year: string;
  days: SchoolDay[];
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  requirements: Requirement[];
  teacherExceptions: TeacherException[];
  classExceptions: ClassException[];
  limits: PeriodLimit[];
  bookings: Booking[];
  schedule: Schedule | null;
  adminPassword?: string;
  /** Start time ("HH:MM", 24h) of each period, indexed from period 1 at position 0. Powers class-time reminders. */
  periodTimes: string[];
  sections: Section[];
  supervisors: Supervisor[];
  /** Kuwait MOE-style official fields, used for the printable letterhead. All optional/free-form for schools outside Kuwait. */
  educationZone: string;
  stage: string;
  semester: string;
  schoolCode: string;
  showOfficialHeader: boolean;
  grades: Grade[];
  wings: Wing[];
  staffAccounts: StaffAccount[];
  attachments: Attachment[];
}

/** Files this size or smaller (bytes, before base64 encoding) are accepted for a schedule attachment. */
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'] as const;

export type UserRole = 'admin' | 'teacher' | 'supervisor' | 'staff';
export interface UserSession {
  role: UserRole;
  teacherId?: string;
  supervisorId?: string;
  staffId?: string;
}

export const SESSION_KEY = 'jadwal-session-v1';
export const STORAGE_KEY = 'jadwal-school-v1';

/** Kuwait's six educational zones (المناطق التعليمية), used on the official print header. */
export const KUWAIT_EDUCATION_ZONES = ['العاصمة', 'حولي', 'الفروانية', 'مبارك الكبير', 'الأحمدي', 'الجهراء'] as const;
export const SCHOOL_STAGES = ['رياض أطفال', 'ابتدائي', 'متوسط', 'ثانوي'] as const;
export const SEMESTERS = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني'] as const;

export const PERMISSION_RESOURCES: { id: PermissionResource; label: string }[] = [
  { id: 'dashboard', label: 'لوحة المعلومات' },
  { id: 'days', label: 'أيام الدوام' },
  { id: 'teachers', label: 'المعلمون' },
  { id: 'classes', label: 'الفصول الدراسية' },
  { id: 'subjects', label: 'المواد الدراسية' },
  { id: 'requirements', label: 'نصاب المعلمين' },
  { id: 'exceptions', label: 'الاستثناءات' },
  { id: 'limits', label: 'حدود التكرار' },
  { id: 'bookings', label: 'حجز الحصص' },
  { id: 'distribute', label: 'التوزيع اليدوي' },
  { id: 'schedule', label: 'الجدول المدرسي' },
  { id: 'data', label: 'إدارة البيانات' },
  { id: 'settings', label: 'الإعدادات والصلاحيات' },
];

export function permissionsWithLevel(level: PermissionLevel): PermissionMap {
  return Object.fromEntries(PERMISSION_RESOURCES.map(resource => [resource.id, level])) as PermissionMap;
}

export const ADMIN_PERMISSIONS: PermissionMap = permissionsWithLevel('edit');

/** Starting points the admin can pick when creating a staff account, then fine-tune freely. */
export const STAFF_TITLE_PRESETS: { title: string; permissions: PermissionMap }[] = [
  { title: 'مدير مدرسة', permissions: permissionsWithLevel('edit') },
  {
    title: 'مدير مساعد',
    permissions: { ...permissionsWithLevel('view'), teachers: 'edit', classes: 'edit', subjects: 'edit', requirements: 'edit', exceptions: 'edit', limits: 'edit', bookings: 'edit', distribute: 'edit', schedule: 'edit' },
  },
  {
    title: 'مشرف',
    permissions: { ...permissionsWithLevel('view'), distribute: 'none', data: 'none', settings: 'none' },
  },
  {
    title: 'رئيس قسم',
    permissions: { ...permissionsWithLevel('view'), requirements: 'edit', exceptions: 'edit', limits: 'edit', data: 'none', settings: 'none' },
  },
  {
    title: 'أخصائي',
    permissions: { ...permissionsWithLevel('none'), dashboard: 'view', teachers: 'view', classes: 'view', schedule: 'view' },
  },
];

export const defaultDays: SchoolDay[] = [
  { id: 'sun', name: 'الأحد', short: 'أحد', enabled: true, periods: 7 },
  { id: 'mon', name: 'الإثنين', short: 'إثنين', enabled: true, periods: 7 },
  { id: 'tue', name: 'الثلاثاء', short: 'ثلاثاء', enabled: true, periods: 7 },
  { id: 'wed', name: 'الأربعاء', short: 'أربعاء', enabled: true, periods: 7 },
  { id: 'thu', name: 'الخميس', short: 'خميس', enabled: true, periods: 7 },
  { id: 'fri', name: 'الجمعة', short: 'جمعة', enabled: false, periods: 7 },
  { id: 'sat', name: 'السبت', short: 'سبت', enabled: false, periods: 7 },
];

/** Default period start times: periods back-to-back from 07:30, 45 minutes each. */
export function defaultPeriodTimes(count = 12): string[] {
  return Array.from({ length: count }, (_, index) => {
    const startMinutes = 7 * 60 + 30 + index * 45;
    const hours = Math.floor(startMinutes / 60) % 24;
    const minutes = startMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTimeString = (value: unknown): value is string => typeof value === 'string' && TIME_PATTERN.test(value);

export function createDefaultData(): AppData {
  return {
    version: 1,
    schoolName: 'مدرستي',
    year: '2025 - 2026',
    days: defaultDays.map(day => ({ ...day })),
    teachers: [],
    classes: [],
    subjects: [],
    requirements: [],
    teacherExceptions: [],
    classExceptions: [],
    limits: [],
    bookings: [],
    schedule: null,
    adminPassword: 'admin',
    periodTimes: defaultPeriodTimes(),
    sections: [],
    supervisors: [],
    educationZone: '',
    stage: SCHOOL_STAGES[1],
    semester: SEMESTERS[0],
    schoolCode: '',
    showOfficialHeader: true,
    grades: [],
    wings: [],
    staffAccounts: [],
    attachments: [],
  };
}

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Maps JS Date#getDay() (0 = Sunday) to our day ids, since defaultDays is ordered the same way. */
export const WEEKDAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const dayIdForDate = (date: Date) => WEEKDAY_ORDER[date.getDay()];
export const weeklyPeriods = (data: AppData) => data.days.filter(day => day.enabled).reduce((sum, day) => sum + day.periods, 0);

export function classCapacity(data: AppData, classId: string) {
  return data.days.filter(day => day.enabled).reduce((sum, day) => {
    const releases = data.classExceptions.filter(item => item.classId === classId && item.dayId === day.id);
    const last = Math.min(day.periods, ...releases.map(item => item.fromPeriod - 1));
    return sum + Math.max(0, last);
  }, 0);
}

export function makeDemoData(): AppData {
  const data = createDefaultData();
  data.schoolName = 'مدرسة الأفق';
  const names = ['أحمد العتيبي', 'سارة عبدالله', 'محمد القحطاني', 'نورة الدوسري', 'عبدالله الغامدي', 'ريم الحربي', 'خالد الزهراني'];
  const subjects = ['الرياضيات', 'اللغة العربية', 'العلوم', 'اللغة الإنجليزية', 'الدراسات الإسلامية', 'الدراسات الاجتماعية', 'المهارات الرقمية'];
  data.teachers = names.map((name, index) => ({
    id: `teacher-${index + 1}`, name, code: `T0${index + 1}`, minDaily: 1, maxDaily: 5, maxConsecutive: 3,
    days: data.days.filter(day => day.enabled).map(day => day.id),
  }));
  data.subjects = subjects.map((name, index) => ({ id: `subject-${index + 1}`, name }));
  data.grades = ['الأول متوسط', 'الثاني متوسط', 'الثالث متوسط'].map((name, index) => ({ id: `grade-${index + 1}`, name }));
  data.classes = ['الأول متوسط - أ', 'الثاني متوسط - أ', 'الثالث متوسط - أ'].map((name, index) => ({ id: `class-${index + 1}`, name, code: `C0${index + 1}`, gradeId: `grade-${index + 1}` }));
  data.requirements = data.classes.flatMap(schoolClass => data.teachers.map((teacher, index) => ({
    id: `req-${schoolClass.id}-${teacher.id}`, teacherId: teacher.id, classId: schoolClass.id, subject: subjects[index], count: 5,
  })));
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max = 200): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isNumber(value: unknown, min = 0, max = 84): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isValidPermissionMap(value: unknown): value is PermissionMap {
  if (!isRecord(value)) return false;
  return PERMISSION_RESOURCES.every(resource => value[resource.id] === 'none' || value[resource.id] === 'view' || value[resource.id] === 'edit');
}

export function parseBackup(raw: string): AppData {
  const value: unknown = JSON.parse(raw);
  const rawValue = value as Record<string, unknown>;
  const error = new Error('الملف غير متوافق. اختر نسخة JSON تم تصديرها من تطبيق جَدوَل.');
  if (!isRecord(value) || value.version !== 1 || !isText(value.schoolName) || !isText(value.year)) throw error;
  const collections = ['days', 'teachers', 'classes', 'requirements', 'teacherExceptions', 'classExceptions', 'limits', 'bookings'] as const;
  for (const key of collections) {
    if (!Array.isArray(value[key]) || value[key].length > 10000 || !value[key].every(isRecord)) throw error;
    const items = value[key] as Record<string, unknown>[];
    if (items.some(item => !isText(item.id) || !item.id) || new Set(items.map(item => item.id)).size !== items.length) throw error;
  }
  const data = value as unknown as AppData;
  if (data.days.length !== 7 || data.days.some(day => !defaultDays.some(original => original.id === day.id) || typeof day.enabled !== 'boolean' || !isNumber(day.periods, 1, 12))) throw error;
  if (data.teachers.length > 100 || data.classes.length > 40 || data.requirements.length > 1000) throw new Error('حجم البيانات كبير جداً. الحد المدعوم هو 100 معلم و40 صفاً و1000 نصاب.');
  const dayIds = new Set(data.days.map(day => day.id));
  const teacherIds = new Set(data.teachers.map(teacher => teacher.id));
  const classIds = new Set(data.classes.map(schoolClass => schoolClass.id));
  if (data.teachers.some(teacher => !isText(teacher.name) || !teacher.name.trim() || !isText(teacher.code) || !isNumber(teacher.minDaily, 0, 12) || !isNumber(teacher.maxDaily, 1, 12) || teacher.minDaily > teacher.maxDaily || !isNumber(teacher.maxConsecutive, 1, 12) || !Array.isArray(teacher.days) || teacher.days.some(day => !dayIds.has(day)) || (teacher.password !== undefined && !isText(teacher.password, 100)))) throw error;
  const teachersWithPassword = data.teachers.map(teacher => ({ ...teacher, password: isText(teacher.password, 100) ? teacher.password : '' }));
  if (data.classes.some(schoolClass => !isText(schoolClass.name) || !schoolClass.name.trim() || !isText(schoolClass.code))) throw error;
  if (data.requirements.some(item => !teacherIds.has(item.teacherId) || !classIds.has(item.classId) || !isText(item.subject) || !isNumber(item.count, 1, 84))) throw error;
  if (data.teacherExceptions.some(item => !teacherIds.has(item.teacherId) || !dayIds.has(item.dayId) || !isNumber(item.period, 1, 12))) throw error;
  if (data.classExceptions.some(item => !classIds.has(item.classId) || !dayIds.has(item.dayId) || !isNumber(item.fromPeriod, 1, 12))) throw error;
  if (data.limits.some(item => !teacherIds.has(item.teacherId) || !isNumber(item.period, 1, 12) || !isNumber(item.count, 0, 7))) throw error;
  if (data.bookings.some(item => !teacherIds.has(item.teacherId) || !classIds.has(item.classId) || !dayIds.has(item.dayId) || !isNumber(item.period, 1, 12) || !isText(item.subject))) throw error;
  const rawPeriodTimes = (value as Record<string, unknown>).periodTimes;
  const periodTimes = Array.isArray(rawPeriodTimes) && rawPeriodTimes.length <= 12 && rawPeriodTimes.every(isValidTimeString)
    ? [...rawPeriodTimes as string[]]
    : defaultPeriodTimes();
  // Sections/supervisors are newer, optional fields — fall back to empty rather than rejecting older backups.
  const rawSections = (value as Record<string, unknown>).sections;
  const sections = Array.isArray(rawSections) && rawSections.length <= 100 && rawSections.every(isRecord)
    ? (rawSections as Record<string, unknown>[]).filter(item =>
        isText(item.id) && item.id && isText(item.name) && item.name.toString().trim() &&
        Array.isArray(item.classIds) && item.classIds.every(id => classIds.has(id)))
      .map(item => ({ id: item.id as string, name: item.name as string, classIds: [...new Set(item.classIds as string[])] }))
    : [];
  const sectionIds = new Set(sections.map(section => section.id));
  const rawSupervisors = rawValue.supervisors;
  const supervisors = Array.isArray(rawSupervisors) && rawSupervisors.length <= 100 && rawSupervisors.every(isRecord)
    ? (rawSupervisors as Record<string, unknown>[]).filter(item =>
        isText(item.id) && item.id && isText(item.name) && item.name.toString().trim() && sectionIds.has(item.sectionId as string))
      .map(item => ({ id: item.id as string, name: item.name as string, sectionId: item.sectionId as string }))
    : [];
  const rawGrades = rawValue.grades;
  const grades = Array.isArray(rawGrades) && rawGrades.length <= 60 && rawGrades.every(isRecord)
    ? (rawGrades as Record<string, unknown>[]).filter(item => isText(item.id) && item.id && isText(item.name) && item.name.toString().trim())
      .map(item => ({ id: item.id as string, name: item.name as string }))
    : [];
  const gradeIds = new Set(grades.map(grade => grade.id));
  const classesWithGrade = data.classes.map(schoolClass => ({ ...schoolClass, gradeId: gradeIds.has(schoolClass.gradeId) ? schoolClass.gradeId : '' }));
  const rawSubjects = rawValue.subjects;
  const subjects = Array.isArray(rawSubjects) && rawSubjects.length <= 300 && rawSubjects.every(isRecord)
    ? (rawSubjects as Record<string, unknown>[]).filter(item => isText(item.id) && item.id && isText(item.name) && item.name.toString().trim())
      .map(item => ({ id: item.id as string, name: item.name as string }))
    : [];
  const rawWings = rawValue.wings;
  const wings = Array.isArray(rawWings) && rawWings.length <= 100 && rawWings.every(isRecord)
    ? (rawWings as Record<string, unknown>[]).filter(item =>
        isText(item.id) && item.id && isText(item.name) && item.name.toString().trim() && teacherIds.has(item.teacherId as string) &&
        Array.isArray(item.classIds) && item.classIds.every(id => classIds.has(id)))
      .map(item => ({ id: item.id as string, name: item.name as string, teacherId: item.teacherId as string, classIds: [...new Set(item.classIds as string[])] }))
    : [];
  const rawStaff = rawValue.staffAccounts;
  const staffUsernames = new Set<string>();
  const staffAccounts = Array.isArray(rawStaff) && rawStaff.length <= 200 && rawStaff.every(isRecord)
    ? (rawStaff as Record<string, unknown>[]).filter(item => {
        if (!isText(item.id) || !item.id || !isText(item.name) || !item.name.toString().trim() || !isText(item.title, 60) ||
          !isText(item.username, 60) || !item.username.toString().trim() || !isText(item.password, 100) || !isValidPermissionMap(item.permissions)) return false;
        const username = (item.username as string).toLowerCase();
        if (username === 'admin' || staffUsernames.has(username)) return false;
        staffUsernames.add(username);
        return true;
      })
      .map(item => ({ id: item.id as string, name: item.name as string, title: item.title as string, username: item.username as string, password: item.password as string, permissions: item.permissions as PermissionMap }))
    : [];
  const rawAttachments = rawValue.attachments;
  const attachments = Array.isArray(rawAttachments) && rawAttachments.length <= 300 && rawAttachments.every(isRecord)
    ? (rawAttachments as Record<string, unknown>[]).filter(item =>
        isText(item.id) && item.id && (item.targetType === 'teacher' || item.targetType === 'class') &&
        isText(item.targetId) && (item.targetType === 'teacher' ? teacherIds.has(item.targetId) : classIds.has(item.targetId)) &&
        isText(item.fileName, 150) && isText(item.mimeType, 60) && isText(item.dataUrl, 2_200_000) && isText(item.uploadedAt, 40))
      .map(item => ({ id: item.id as string, targetType: item.targetType as 'teacher' | 'class', targetId: item.targetId as string, fileName: item.fileName as string, mimeType: item.mimeType as string, dataUrl: item.dataUrl as string, uploadedAt: item.uploadedAt as string }))
    : [];
  const optionalText = (field: string, max = 60) => isText(rawValue[field], max) ? (rawValue[field] as string) : '';
  // Rebuild derived schedules rather than trusting imported, potentially stale assignments.
  return {
    ...createDefaultData(),
    schoolName: data.schoolName,
    year: data.year,
    days: defaultDays.map(day => ({ ...day, enabled: data.days.find(item => item.id === day.id)!.enabled, periods: data.days.find(item => item.id === day.id)!.periods })),
    teachers: teachersWithPassword,
    classes: classesWithGrade,
    subjects,
    requirements: data.requirements,
    teacherExceptions: data.teacherExceptions,
    classExceptions: data.classExceptions,
    limits: data.limits,
    bookings: data.bookings,
    schedule: null,
    adminPassword: typeof rawValue.adminPassword === 'string' && rawValue.adminPassword ? String(rawValue.adminPassword) : 'admin',
    periodTimes,
    sections,
    supervisors,
    educationZone: optionalText('educationZone'),
    stage: optionalText('stage') || SCHOOL_STAGES[1],
    semester: optionalText('semester') || SEMESTERS[0],
    schoolCode: optionalText('schoolCode', 30),
    showOfficialHeader: typeof rawValue.showOfficialHeader === 'boolean' ? rawValue.showOfficialHeader : true,
    grades,
    wings,
    staffAccounts,
    attachments,
  };
}

export function loadData(): { data: AppData; recovered: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: createDefaultData(), recovered: false };
    const data = parseBackup(raw);
    const saved = JSON.parse(raw) as AppData;
    if (saved.schedule && Array.isArray(saved.schedule.lessons) && saved.schedule.lessons.every(lesson =>
      isRecord(lesson) && isText(lesson.id) && isText(lesson.subject) && isNumber(lesson.period, 1, 12) &&
      typeof lesson.fixed === 'boolean' && data.teachers.some(teacher => teacher.id === lesson.teacherId) &&
      data.classes.some(schoolClass => schoolClass.id === lesson.classId) && data.days.some(day => day.id === lesson.dayId)
    ) && Array.isArray(saved.schedule.warnings) && saved.schedule.warnings.every(item => isText(item, 1000)) && isText(saved.schedule.generatedAt) && isNumber(saved.schedule.placed, 0, 100000) && isNumber(saved.schedule.requested, 0, 100000)) {
      data.schedule = saved.schedule;
    }
    return { data, recovered: false };
  } catch {
    return { data: createDefaultData(), recovered: true };
  }
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}