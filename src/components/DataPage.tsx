import { useRef, type ChangeEvent } from 'react';
import { ArrowUpFromLine, Database, Download, FileJson, FolderOpen, HardDrive, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { createDefaultData, downloadFile, parseBackup } from '../lib/data';
import { Button, Panel, type WorkspaceProps } from './ui';

interface DataPageProps extends WorkspaceProps {
  /** True when the signed-in account only has view access here: import, demo data, and reset stay hidden. Export always stays available. */
  readOnly?: boolean;
}

export default function DataPage({ data, commit, notify, confirm, loadDemo, readOnly = false }: DataPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const exportBackup = () => {
    downloadFile(JSON.stringify(data, null, 2), `jadwal-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8;');
    notify('تم تصدير نسخة احتياطية من بيانات مدرستك.');
  };
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return notify('حجم الملف أكبر من 25 ميجابايت. اختر نسخة احتياطية أصغر.', 'error');
    try {
      const imported = parseBackup(await file.text());
      confirm('استيراد النسخة الاحتياطية؟', `تحتوي النسخة على ${imported.teachers.length} معلم و${imported.classes.length} فصل باسم "${imported.schoolName}". ستستبدل بياناتك الحالية، وستحتاج إلى إعادة توليد الجدول. ننصح بتصدير نسخة من بياناتك أولاً.`, () => { commit(imported); notify('تم استيراد البيانات بنجاح. يمكنك الآن توليد الجدول.'); });
    } catch (error) { notify(error instanceof SyntaxError ? 'تعذّر قراءة الملف. تأكد أنه ملف JSON صالح من تطبيق جَدوَل.' : error instanceof Error ? error.message : 'تعذّر استيراد البيانات.', 'error'); }
  };

  return <div className="page-stack">
    <Panel title="حفظ واستيراد البيانات" description="احتفظ بنسخة من عملك، وانقله إلى جهاز آخر في أي وقت." icon={Database}>
      <div className="local-storage-info"><div className="storage-symbol"><HardDrive size={27} strokeWidth={1.5} /><span><ShieldCheck size={14} /></span></div><div><h3>بيانات مدرستك، على جهازك فقط</h3><p>يتم حفظ التغييرات تلقائياً في هذا المتصفح. لا تُرسل بياناتك إلى أي خادم، ولا تحتاج إلى إنشاء حساب.</p></div></div>
      <div className="data-action-row"><span className="data-action-icon"><Download size={23} strokeWidth={1.6} /></span><div><h3>تصدير نسخة احتياطية</h3><p>ملف JSON يضم المعلمين والفصول والأنصبة وجميع إعداداتك.</p></div><Button variant="secondary" icon={Download} onClick={exportBackup}>تصدير البيانات</Button></div>
      {!readOnly && <div className="data-action-row"><span className="data-action-icon"><FolderOpen size={23} strokeWidth={1.6} /></span><div><h3>استيراد بيانات سابقة</h3><p>استعد نسخة محفوظة من جَدوَل أو انقل عملك من جهاز آخر.</p></div><input ref={inputRef} type="file" accept=".json,application/json" onChange={importBackup} className="visually-hidden" aria-label="اختيار ملف النسخة الاحتياطية" tabIndex={-1} /><Button variant="secondary" icon={ArrowUpFromLine} onClick={() => inputRef.current?.click()}>استيراد نسخة</Button></div>}
      {!readOnly && <div className="data-action-row"><span className="data-action-icon"><Sparkles size={23} strokeWidth={1.6} /></span><div><h3>استكشف بمثال جاهز</h3><p>مدرسة تجريبية من 7 معلمين و3 فصول، مع أنصبة جاهزة للتوليد.</p></div><Button variant="secondary" icon={FileJson} onClick={loadDemo}>تحميل المثال</Button></div>}
      <div className="data-tip"><ShieldCheck size={17} /><p>تذكير صغير: مسح بيانات المتصفح يزيل بيانات التطبيق. صدّر نسخة احتياطية بانتظام للحفاظ على عملك.</p></div>
    </Panel>
    {!readOnly && <section className="reset-section"><div><h3>بداية جديدة</h3><p>احذف جميع البيانات والإعدادات المحفوظة، وابدأ جدولاً جديداً.</p></div><Button variant="danger" icon={Trash2} onClick={() => confirm('حذف جميع البيانات والبدء من جديد؟', 'سيتم حذف جميع المعلمين والفصول والأنصبة والقيود والجداول من هذا المتصفح. هذه الخطوة لا يمكن التراجع عنها. صدّر نسخة احتياطية أولاً إذا كنت تحتاج إلى بياناتك.', () => { commit(createDefaultData()); notify('تم مسح البيانات. يمكنك البدء من جديد.'); }, true)}>مسح جميع البيانات</Button></section>}
  </div>;
}