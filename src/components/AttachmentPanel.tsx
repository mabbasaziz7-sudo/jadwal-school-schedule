import { useRef, useState, type ChangeEvent } from 'react';
import { Download, FileText, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, uid, type Attachment, type AppData } from '../lib/data';
import { Button, Modal } from './ui';

interface AttachmentPanelProps {
  data: AppData;
  targetType: 'teacher' | 'class';
  targetId: string;
  /** Admin (or an "edit" staff account) can upload/remove; teachers and supervisors only ever view. */
  editable: boolean;
  commit?: (changes: Partial<AppData>) => void;
  notify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Lets the admin attach a file/image to one teacher's or class's schedule (e.g. a scanned signed copy); everyone else just views it. */
export default function AttachmentPanel({ data, targetType, targetId, editable, commit, notify }: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const items = data.attachments.filter(item => item.targetType === targetType && item.targetId === targetId);

  if (!editable && !items.length) return null;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !commit) return;
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
      notify?.('نوع الملف غير مدعوم. استخدم صورة (PNG, JPG, WEBP, GIF) أو ملف PDF.', 'error');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      notify?.('حجم الملف كبير جداً. الحد الأقصى 1.5 ميجابايت.', 'error');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const attachment: Attachment = { id: uid(), targetType, targetId, fileName: file.name, mimeType: file.type, dataUrl, uploadedAt: new Date().toISOString() };
      commit({ attachments: [...data.attachments, attachment], schedule: data.schedule });
      notify?.('تم رفع الملف بنجاح.');
    } catch {
      notify?.('تعذّر قراءة الملف. حاول مجدداً.', 'error');
    }
  };

  const remove = (attachment: Attachment) => {
    if (!commit) return;
    commit({ attachments: data.attachments.filter(item => item.id !== attachment.id), schedule: data.schedule });
    notify?.('تم حذف المرفق.');
  };

  return (
    <div className="attachment-bar">
      <span className="attachment-bar-label"><Paperclip size={14} />مرفقات الجدول</span>
      <div className="attachment-chip-list">
        {items.map(item => (
          <button type="button" className="attachment-chip" key={item.id} onClick={() => setViewing(item)}>
            {item.mimeType.startsWith('image/') ? <img src={item.dataUrl} alt={item.fileName} /> : <FileText size={16} />}
            <span>{item.fileName}</span>
            {editable && (
              <span
                role="button"
                tabIndex={0}
                className="attachment-remove"
                aria-label={`حذف ${item.fileName}`}
                onClick={event => { event.stopPropagation(); remove(item); }}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); remove(item); } }}
              >
                <X size={11} />
              </span>
            )}
          </button>
        ))}
        {editable && (
          <>
            <input ref={inputRef} type="file" accept={ALLOWED_ATTACHMENT_TYPES.join(',')} onChange={handleUpload} className="visually-hidden" aria-label="رفع ملف أو صورة" tabIndex={-1} />
            <Button variant="ghost" icon={Upload} onClick={() => inputRef.current?.click()} className="attachment-upload-btn">إرفاق ملف أو صورة</Button>
          </>
        )}
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.fileName ?? ''} description={viewing ? `أُرفق بتاريخ ${new Date(viewing.uploadedAt).toLocaleDateString('ar')}` : ''}>
        {viewing && (
          <div className="modal-body">
            {viewing.mimeType.startsWith('image/') ? (
              <img src={viewing.dataUrl} alt={viewing.fileName} className="attachment-preview-image" />
            ) : (
              <p className="modal-copy">هذا الملف من نوع PDF. اضغط "تنزيل" لفتحه وعرضه.</p>
            )}
            <div className="modal-actions">
              <Button icon={Download} onClick={() => { const a = document.createElement('a'); a.href = viewing.dataUrl; a.download = viewing.fileName; a.click(); }}>تنزيل</Button>
              <Button variant="secondary" onClick={() => setViewing(null)}>إغلاق</Button>
              {editable && <Button variant="danger" icon={Trash2} onClick={() => { remove(viewing); setViewing(null); }}>حذف</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
