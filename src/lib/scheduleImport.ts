import * as XLSX from 'xlsx';
import { auditSchedule, startBlankSchedule } from './scheduler';
import { uid, type AppData, type Lesson, type Schedule, type SchoolClass, type Teacher } from './data';

/** One row read from an uploaded spreadsheet or extracted by AI from an image/PDF, before matching against real data. */
export interface RawImportRow {
  teacher: string;
  className: string;
  day: string;
  period: string | number;
  subject?: string;
}

export interface ImportResult {
  lessons: Lesson[];
  matchedCount: number;
  errors: string[];
  /** Full teacher list after auto-creating any names from the file that didn't already exist — pass this to commit(). */
  teachers: Teacher[];
  /** Full class list after auto-creating any names from the file that didn't already exist — pass this to commit(). */
  classes: SchoolClass[];
  /** Names of teachers newly created from this import, for the review screen. */
  createdTeacherNames: string[];
  /** Names of classes newly created from this import, for the review screen. */
  createdClassNames: string[];
}

const HEADER_ALIASES: Record<keyof RawImportRow, string[]> = {
  teacher: ['المعلم', 'اسم المعلم', 'teacher', 'teacher name'],
  className: ['الفصل', 'الصف', 'اسم الفصل', 'class', 'classroom', 'section'],
  day: ['اليوم', 'day'],
  period: ['الحصة', 'رقم الحصة', 'period', 'period number'],
  subject: ['المادة', 'subject'],
};

function normalizeHeader(value: string) {
  return value.toString().trim().toLowerCase();
}

function pickColumn(row: Record<string, unknown>, field: keyof RawImportRow): string {
  const aliases = HEADER_ALIASES[field].map(normalizeHeader);
  for (const key of Object.keys(row)) {
    if (aliases.includes(normalizeHeader(key))) return String(row[key] ?? '').trim();
  }
  return '';
}

/** Reads the first sheet of a .xlsx/.xls/.csv file into raw rows using the app's expected column names (with a few aliases). */
export async function parseSpreadsheetFile(file: File): Promise<RawImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map(row => ({
    teacher: pickColumn(row, 'teacher'),
    className: pickColumn(row, 'className'),
    day: pickColumn(row, 'day'),
    period: pickColumn(row, 'period'),
    subject: pickColumn(row, 'subject'),
  }));
}

/** Downloads a ready-to-fill .xlsx template with the exact columns the importer expects. */
export function downloadImportTemplate(data: AppData) {
  const exampleTeacher = data.teachers[0]?.name ?? 'أحمد العتيبي';
  const exampleClass = data.classes[0]?.name ?? 'الأول متوسط - أ';
  const header = ['المعلم', 'الفصل', 'اليوم', 'الحصة', 'المادة'];
  const example = [exampleTeacher, exampleClass, 'الأحد', 1, 'الرياضيات'];
  const sheet = XLSX.utils.aoa_to_sheet([header, example]);
  sheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'الجدول');
  XLSX.writeFile(workbook, 'قالب-استيراد-الجدول.xlsx');
}

export interface MatchImportOptions {
  /** When true (default), teacher/class names in the file that don't match an existing record are created automatically. */
  autoCreate?: boolean;
}

/**
 * Matches raw rows against real teachers/classes/days and builds importable lessons, reporting anything it couldn't
 * resolve. Unless `autoCreate` is disabled, a teacher or class name that doesn't already exist is created on the fly
 * (with sensible defaults) so the whole file can be imported in one pass — the caller must commit the returned
 * `teachers`/`classes` lists alongside the schedule for these new records to actually be saved.
 */
export function matchImportRows(data: AppData, rows: RawImportRow[], options: MatchImportOptions = {}): ImportResult {
  const autoCreate = options.autoCreate !== false;
  const errors: string[] = [];
  const lessons: Lesson[] = [];
  const seenSlots = new Set<string>();
  const createdTeacherNames: string[] = [];
  const createdClassNames: string[] = [];
  let teachers = data.teachers;
  let classes = data.classes;

  const norm = (value: string) => value.trim().toLowerCase();
  const findTeacher = (name: string) => teachers.find(t => norm(t.name) === norm(name) || norm(t.code) === norm(name));
  const findClass = (name: string) => classes.find(c => norm(c.name) === norm(name) || norm(c.code) === norm(name));
  const findDay = (name: string) => data.days.find(d => d.name.trim() === name.trim() || d.short.trim() === name.trim());

  const ensureTeacher = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return undefined;
    const existing = findTeacher(name);
    if (existing || !autoCreate) return existing;
    const id = uid();
    const teacher: Teacher = { id, name, code: `T-${id.slice(0, 5).toUpperCase()}`, minDaily: 0, maxDaily: 7, maxConsecutive: 3, days: data.days.filter(d => d.enabled).map(d => d.id) };
    teachers = [...teachers, teacher];
    createdTeacherNames.push(name);
    return teacher;
  };
  const ensureClass = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return undefined;
    const existing = findClass(name);
    if (existing || !autoCreate) return existing;
    const id = uid();
    const schoolClass: SchoolClass = { id, name, code: `C-${id.slice(0, 5).toUpperCase()}`, gradeId: '' };
    classes = [...classes, schoolClass];
    createdClassNames.push(name);
    return schoolClass;
  };

  rows.forEach((row, index) => {
    const rowLabel = `الصف ${index + 2} في الملف`; // +2: header row + 1-indexing
    if (!row.teacher && !row.className && !row.day && !row.period) return; // skip fully blank rows
    const teacher = ensureTeacher(row.teacher);
    if (!teacher) return void errors.push(`${rowLabel}: لم يتم العثور على معلم باسم "${row.teacher}".`);
    const schoolClass = ensureClass(row.className);
    if (!schoolClass) return void errors.push(`${rowLabel}: لم يتم العثور على فصل باسم "${row.className}".`);
    const day = findDay(row.day);
    if (!day || !day.enabled) return void errors.push(`${rowLabel}: يوم "${row.day}" غير معروف أو غير مفعّل في أيام الدوام.`);
    const period = Number(row.period);
    if (!Number.isInteger(period) || period < 1 || period > day.periods) return void errors.push(`${rowLabel}: رقم الحصة "${row.period}" غير صالح ليوم ${day.name} (الحد الأقصى ${day.periods}).`);
    const slotKey = `${schoolClass.id}|${day.id}|${period}`;
    if (seenSlots.has(slotKey)) return void errors.push(`${rowLabel}: يوجد صف آخر بنفس الفصل واليوم والحصة في الملف — تم تجاهل التكرار.`);
    seenSlots.add(slotKey);
    lessons.push({ id: uid(), teacherId: teacher.id, classId: schoolClass.id, dayId: day.id, period, subject: (row.subject || '').trim(), fixed: true, manual: true });
  });

  return { lessons, matchedCount: lessons.length, errors, teachers, classes, createdTeacherNames, createdClassNames };
}

/** Merges imported lessons into the current (or a new) schedule, overwriting any existing lesson in the same slot. */
export function mergeImportedLessons(data: AppData, imported: Lesson[]): Schedule {
  const base = data.schedule ?? startBlankSchedule();
  const importedSlots = new Set(imported.map(lesson => `${lesson.classId}|${lesson.dayId}|${lesson.period}`));
  const kept = base.lessons.filter(lesson => !importedSlots.has(`${lesson.classId}|${lesson.dayId}|${lesson.period}`));
  const lessons = [...kept, ...imported];
  return { ...base, lessons, warnings: auditSchedule(data, lessons), placed: lessons.length };
}
