import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, CheckCircle2, Inbox, LoaderCircle, Minus, Plus, X, type LucideIcon } from 'lucide-react';
import type { AppData, TabId } from '../lib/data';

export interface WorkspaceProps {
  data: AppData;
  commit: (changes: Partial<AppData> | ((previous: AppData) => Partial<AppData>)) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  goTo: (tab: TabId) => void;
  confirm: (title: string, description: string, action: () => void, destructive?: boolean) => void;
  loadDemo: () => void;
  onViewTeacher?: (teacherId: string) => void;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({ children, variant = 'primary', icon: Icon, loading, className = '', disabled, ...props }: ButtonProps) {
  return <button type="button" className={`button button-${variant} ${className}`} disabled={disabled || loading} {...props}>
    {loading ? <LoaderCircle size={17} className="spin" /> : Icon ? <Icon size={17} strokeWidth={1.8} /> : null}
    {children}
  </button>;
}

export function IconButton({ icon: Icon, label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return <button type="button" className={`icon-button ${className}`} title={label} aria-label={label} {...props}><Icon size={17} strokeWidth={1.8} /></button>;
}

export function Panel({ title, description, icon: Icon, action, children, className = '', id }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return <section className={`panel ${className}`} id={id}>
    <div className="panel-heading">
      <div className="panel-title-group">
        {Icon && <span className="panel-icon"><Icon size={21} strokeWidth={1.7} /></span>}
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      </div>
      {action && <div className="panel-heading-action">{action}</div>}
    </div>
    {children}
  </section>;
}

export function Field({ label, optional, hint, children, className = '' }: { label: string; optional?: boolean; hint?: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span className="field-label">{label}{optional && <span className="optional">اختياري</span>}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, children, compact }: { title: string; description: string; icon?: LucideIcon; children?: ReactNode; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}>
    <div className="empty-illustration"><div className="empty-ring" /><Icon size={31} strokeWidth={1.3} /><span className="empty-spark spark-one" /><span className="empty-spark spark-two" /></div>
    <h3>{title}</h3><p>{description}</p>{children && <div className="empty-actions">{children}</div>}
  </div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`toggle ${checked ? 'is-on' : ''}`}>
    <motion.span className="toggle-thumb" animate={{ x: checked ? 16 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
  </button>;
}

export function Counter({ value, onChange, min = 1, max = 12, disabled, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; disabled?: boolean; label: string }) {
  return <div className={`counter ${disabled ? 'disabled' : ''}`} dir="ltr">
    <button type="button" aria-label={`تقليل ${label}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={13} /></button>
    {disabled ? <span className="counter-off">-</span> : <input type="number" value={value} min={min} max={max} aria-label={label} onChange={event => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} />}
    <button type="button" aria-label={`زيادة ${label}`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={13} /></button>
  </div>;
}

export function NextFooter({ label, onNext, disabled, note = 'تُحفظ تغييراتك تلقائياً على هذا الجهاز' }: { label: string; onNext: () => void; disabled?: boolean; note?: string }) {
  return <div className="panel-footer"><span className="save-note"><CheckCircle2 size={15} />{note}</span><Button onClick={onNext} disabled={disabled}>{label}<ArrowLeft size={16} /></Button></div>;
}

export function DayCheckboxes({ data, selected, onChange }: { data: AppData; selected: string[]; onChange: (days: string[]) => void }) {
  return <div className="day-checkboxes">{data.days.map(day => <label className={`day-checkbox ${selected.includes(day.id) && day.enabled ? 'checked' : ''} ${!day.enabled ? 'unavailable' : ''}`} key={day.id}>
    <input type="checkbox" disabled={!day.enabled} checked={selected.includes(day.id) && day.enabled} onChange={() => onChange(selected.includes(day.id) ? selected.filter(id => id !== day.id) : [...selected, day.id])} />
    <span className="checkbox-box">{selected.includes(day.id) && day.enabled && <Check size={12} strokeWidth={2.5} />}</span>{day.name}
  </label>)}</div>;
}

export function CheckboxList({ items, selected, onChange, emptyLabel }: { items: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void; emptyLabel?: string }) {
  if (!items.length) return emptyLabel ? <p className="muted small-text">{emptyLabel}</p> : null;
  return <div className="day-checkboxes">{items.map(item => <label className={`day-checkbox ${selected.includes(item.id) ? 'checked' : ''}`} key={item.id}>
    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onChange(selected.includes(item.id) ? selected.filter(id => id !== item.id) : [...selected, item.id])} />
    <span className="checkbox-box">{selected.includes(item.id) && <Check size={12} strokeWidth={2.5} />}</span>{item.label}
  </label>)}</div>;
}

export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const input = ref.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea');
      (input ?? ref.current?.querySelector<HTMLElement>('button'))?.focus();
    });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab' && ref.current) {
        const focusable = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [open]);
  return createPortal(<AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.2 }}>
      <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><IconButton icon={X} label="إغلاق" onClick={onClose} /></div>
      {children}
    </motion.div>
  </motion.div>}</AnimatePresence>, document.body);
}

export function InlineNotice({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'warning' | 'success' }) {
  return <div className={`inline-notice notice-${kind}`}><span className="notice-dot" /><div>{children}</div></div>;
}