import { GoogleGenAI, Type } from '@google/genai';
import type { AppData } from './data';
import type { RawImportRow } from './scheduleImport';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

async function fileToBase64(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

const ROW_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      teacher: { type: Type.STRING, description: 'اسم المعلم كما يظهر في الخانة.' },
      className: { type: Type.STRING, description: 'اسم الفصل أو الصف الدراسي.' },
      day: { type: Type.STRING, description: 'اسم اليوم.' },
      period: { type: Type.STRING, description: 'رقم الحصة.' },
      subject: { type: Type.STRING, description: 'اسم المادة، إن وجدت.' },
    },
    required: ['teacher', 'className', 'day', 'period'],
  },
};

/**
 * Sends an image or PDF of a schedule to Google Gemini (using the school's own API key, entered in
 * Settings) and asks it to read the table back as structured rows. This is the one place in the app
 * that leaves the device — the admin opts into it explicitly and provides their own key.
 */
export async function extractScheduleFromFile(apiKey: string, file: File, data: AppData): Promise<RawImportRow[]> {
  if (!apiKey.trim()) throw new Error('أضف مفتاح API الخاص بالذكاء الاصطناعي من الإعدادات والصلاحيات أولاً.');
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('نوع الملف غير مدعوم لاستخراج الجدول بالذكاء الاصطناعي. استخدم صورة (PNG, JPG, WEBP, GIF) أو ملف PDF.');

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const base64 = await fileToBase64(file);
  const mimeType = isPdf ? 'application/pdf' : file.type;

  const teacherNames = data.teachers.map(t => t.name).join('، ') || 'لا يوجد معلمون مسجلون بعد';
  const classNames = data.classes.map(c => c.name).join('، ') || 'لا توجد فصول مسجلة بعد';
  const dayNames = data.days.filter(d => d.enabled).map(d => d.name).join('، ') || 'غير محددة';

  const instructions = `أنت تستخرج جدولاً دراسياً أسبوعياً من صورة أو مستند مرفق. اقرأ الجدول بعناية واستخرج كل حصة تظهر فيه (كل خانة تحتوي معلماً أو مادة).

معلومات عن هذه المدرسة، لمساعدتك على مطابقة الأسماء المكتوبة بخط اليد أو المختصرة مع الأسماء الصحيحة المسجلة:
- المعلمون المسجلون: ${teacherNames}
- الفصول المسجلة: ${classNames}
- أيام الدوام المفعّلة: ${dayNames}

إن استطعت مطابقة اسم مستخرج مع أحد الأسماء المسجلة أعلاه ولو بتقارب كبير، استخدم الاسم المسجل بالضبط. إن لم تستطع قراءة خانة بوضوح فاستخدم أفضل تخمين متاح بدلاً من تجاهل الحصة كلياً.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: base64, mimeType } },
        instructions,
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: ROW_SCHEMA,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`تعذّر الاتصال بخدمة Gemini: ${message}`);
  }

  const text = response.text?.trim();
  if (!text) throw new Error('لم يُرجع النموذج أي نص. حاول مجدداً.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('تعذّر تفسير استجابة الذكاء الاصطناعي كجدول. حاول برفع صورة أوضح.');
  }
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('لم يتم التعرف على أي حصص في الملف المرفوع.');

  return (parsed as Record<string, unknown>[]).map(item => ({
    teacher: String(item.teacher ?? '').trim(),
    className: String(item.className ?? '').trim(),
    day: String(item.day ?? '').trim(),
    period: typeof item.period === 'number' ? item.period : String(item.period ?? ''),
    subject: String(item.subject ?? '').trim(),
  }));
}
