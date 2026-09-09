import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import type { AppData } from '../lib/data';
import { getAiApiKey } from '../lib/aiKey';
import { extractScheduleFromFile } from '../lib/aiScheduleExtract';
import { downloadImportTemplate, matchImportRows, mergeImportedLessons, parseSpreadsheetFile, type ImportResult } from '../lib/scheduleImport';
import { Button, InlineNotice, Modal } from './ui';

interface ImportScheduleModalProps {
  open: boolean;
  onClose: () => void;
  data: AppData;
  commit: (changes: Partial<AppData>) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSettings?: () => void;
}

export default function ImportScheduleModal({ open, onClose, data, commit, notify, onOpenSettings }: ImportScheduleModalProps) {
  const [mode, setMode] = useState<'file' | 'ai'>('file');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAiKey = !!getAiApiKey();

  const reset = () => { setResult(null); setBusy(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const rows = await parseSpreadsheetFile(file);
      setResult(matchImportRows(data, rows));
    } catch {
      notify('تعذّر قراءة الملف. تأكد أنه بصيغة Excel أو CSV صحيحة.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAiImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const rows = await extractScheduleFromFile(getAiApiKey(), file, data);
      setResult(matchImportRows(data, rows));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذّر استخراج الجدول من الملف.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const applyImport = () => {
    if (!result || !result.lessons.length) return;
    commit({ schedule: mergeImportedLessons(data, result.lessons) });
    notify(`تم استيراد ${result.lessons.length} حصة إلى الجدول بنجاح.`, result.errors.length ? 'info' : 'success');
    handleClose();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="تحويل ملف أو صورة إلى جدول" description="ارفع ملف Excel/CSV منظّماً، أو صورة/مستند جدول ليقرأه الذكاء الاصطناعي ويحوّله تلقائياً." wide>
      <div className="modal-body">
        {!result && (
          <>
            <div className="segmented-control import-mode-tabs">
              <button className={mode === 'file' ? 'selected' : ''} onClick={() => setMode('file')}><FileSpreadsheet size={16} />ملف Excel / CSV</button>
              <button className={mode === 'ai' ? 'selected' : ''} onClick={() => setMode('ai')}><Sparkles size={16} />صورة أو PDF بالذكاء الاصطناعي</button>
            </div>

            {mode === 'file' ? (
              <div className="import-panel">
                <p className="modal-copy">يجب أن يحتوي الملف على أعمدة: المعلم، الفصل، اليوم، الحصة، والمادة (اختياري). كل صف يمثل حصة واحدة.</p>
                <div className="import-actions-row">
                  <Button variant="secondary" onClick={() => downloadImportTemplate(data)}>تنزيل نموذج الملف</Button>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileImport} className="visually-hidden" aria-label="رفع ملف الجدول" tabIndex={-1} />
                  <Button icon={Upload} onClick={() => fileInputRef.current?.click()} loading={busy}>اختيار ملف</Button>
                </div>
              </div>
            ) : (
              <div className="import-panel">
                {!hasAiKey ? (
                  <InlineNotice>
                    لم يتم إضافة مفتاح API للذكاء الاصطناعي بعد.{' '}
                    {onOpenSettings ? <button type="button" className="text-link" onClick={() => { handleClose(); onOpenSettings(); }}>أضفه من الإعدادات والصلاحيات</button> : 'أضفه من الإعدادات والصلاحيات.'}
                  </InlineNotice>
                ) : (
                  <>
                    <InlineNotice kind="info">سيتم إرسال هذا الملف إلى خدمة Anthropic الخارجية لاستخراج الجدول منه. تأكد أن الملف لا يحتوي بيانات لا ترغب بمشاركتها خارجياً.</InlineNotice>
                    <div className="import-actions-row">
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={handleAiImport} className="visually-hidden" id="ai-import-input" disabled={busy} />
                      <Button icon={busy ? LoaderCircle : Sparkles} onClick={() => document.getElementById('ai-import-input')?.click()} loading={busy}>
                        {busy ? 'يقرأ الجدول...' : 'اختيار صورة أو ملف PDF'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="import-review">
            <div className="import-summary">
              <span className="import-summary-ok"><CheckCircle2 size={16} />{result.matchedCount} حصة جاهزة للاستيراد</span>
              {result.errors.length > 0 && <span className="import-summary-warn"><AlertTriangle size={16} />{result.errors.length} صف تم تجاهله</span>}
            </div>
            {result.errors.length > 0 && (
              <ul className="import-error-list">
                {result.errors.map((error, index) => <li key={index}>{error}</li>)}
              </ul>
            )}
            {result.matchedCount === 0 ? (
              <InlineNotice>لم يتم استخراج أي حصة صالحة. راجع الملف وأعد المحاولة.</InlineNotice>
            ) : (
              <p className="modal-copy">سيتم إسناد هذه الحصص إلى الجدول الحالي مباشرة، مع استبدال أي حصة موجودة مسبقاً في نفس الموعد والفصل.</p>
            )}
          </div>
        )}

        <div className="modal-actions">
          {result ? (
            <>
              <Button onClick={applyImport} disabled={!result.matchedCount}>تطبيق على الجدول</Button>
              <Button variant="secondary" onClick={reset}>رجوع</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={handleClose}>إلغاء</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
