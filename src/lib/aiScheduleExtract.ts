import Anthropic from '@anthropic-ai/sdk';
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

/**
 * Sends an image or PDF of a schedule to Claude (using the school's own API key, entered in Settings)
 * and asks it to read the table back as structured rows. This is the one place in the app that leaves
 * the device — the admin opts into it explicitly and provides their own key.
 */
export async function extractScheduleFromFile(apiKey: string, file: File, data: AppData): Promise<RawImportRow[]> {
  if (!apiKey.trim()) throw new Error('أضف مفتاح API الخاص بالذكاء الاصطناعي من الإعدادات والصلاحيات أولاً.');
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('نوع الملف غير مدعوم لاستخراج الجدول بالذكاء الاصطناعي. استخدم صورة (PNG, JPG, WEBP, GIF) أو ملف PDF.');

  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
  const base64 = await fileToBase64(file);

  const teacherNames = data.teachers.map(t => t.name).join('، ') || 'لا يوجد معلمون مسجلون بعد';
  const classNames = data.classes.map(c => c.name).join('، ') || 'لا توجد فصول مسجلة بعد';
  const dayNames = data.days.filter(d => d.enabled).map(d => d.name).join('، ') || 'غير محددة';

  const instructions = `أنت تستخرج جدولاً دراسياً أسبوعياً من صورة أو مستند مرفق. اقرأ الجدول بعناية واستخرج كل حصة تظهر فيه (كل خانة تحتوي معلماً أو مادة).
أعد النتيجة بصيغة JSON فقط (مصفوفة كائنات)، دون أي نص إضافي أو شرح أو تنسيق Markdown، بهذا الشكل بالضبط:
[{"teacher": "اسم المعلم", "className": "اسم الفصل", "day": "اسم اليوم", "period": 1, "subject": "اسم المادة"}]

معلومات عن هذه المدرسة، لمساعدتك على مطابقة الأسماء المكتوبة بخط اليد أو المختصرة مع الأسماء الصحيحة المسجلة:
- المعلمون المسجلون: ${teacherNames}
- الفصول المسجلة: ${classNames}
- أيام الدوام المفعّلة: ${dayNames}

إن استطعت مطابقة اسم مستخرج مع أحد الأسماء المسجلة أعلاه ولو بتقارب كبير، استخدم الاسم المسجل بالضبط. إن لم تستطع قراءة خانة بوضوح فاستخدم أفضل تخمين متاح بدلاً من تجاهل الحصة كلياً. أعد فقط مصفوفة JSON دون أي نص قبلها أو بعدها.`;

  const content: Anthropic.MessageParam['content'] = isPdf
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: instructions },
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
        { type: 'text', text: instructions },
      ];

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
  if (!textBlock) throw new Error('لم يُرجع النموذج أي نص. حاول مجدداً.');
  const jsonText = textBlock.text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
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
