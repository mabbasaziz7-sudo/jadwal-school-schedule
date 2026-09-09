import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, Download, Edit3, GraduationCap, Info, LockKeyhole, MousePointerClick, Pencil, Plus, Printer, RefreshCw, Sparkles, Table2, Trash2, Users, X } from 'lucide-react';
import { csvCell, downloadFile, type Lesson } from '../lib/data';
import { moveLesson, removeManualLesson, startBlankSchedule, upsertManualLesson } from '../lib/scheduler';
import { Button, CheckboxList, EmptyState, Field, InlineNotice, Modal, Panel, type WorkspaceProps } from './ui';
import { OfficialPrintHeader, OfficialPrintFooter } from './OfficialPrintHeader';
import AttachmentPanel from './AttachmentPanel';

interface ScheduleProps extends WorkspaceProps {
  onGenerate: () => void;
  generating: boolean;
  progress: number;
  /** True when the signed-in account only has view access to the schedule: editing, manual entry, and generation stay hidden/blocked. */
  readOnly?: boolean;
}

interface ManualEditState {
  dayId: string;
  period: number;
  classId: string;
  teacherId: string;
  subject: string;
  existingId?: string;
}

interface BulkSelection { classIds: string[]; teacherIds: string[]; supervisorIds: string[] }

export default function SchedulePage({ data, commit, notify, goTo, loadDemo, onGenerate, generating, progress, readOnly = false }: ScheduleProps) {
  const [mode, setMode] = useState<'class' | 'teacher'>('class');
  const [selectedId, setSelectedId] = useState(data.classes[0]?.id ?? '');
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [destination, setDestination] = useState({ dayId: '', period: 1 });
  const [editError, setEditError] = useState('');
  const [manualEditing, setManualEditing] = useState<ManualEditState | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<BulkSelection>({ classIds: [], teacherIds: [], supervisorIds: [] });
  const [bulkJobs, setBulkJobs] = useState<{ kind: 'class' | 'teacher'; id: string }[] | null>(null);
  const days = data.days.filter(day => day.enabled);
  const options = mode === 'class' ? data.classes : data.teachers;
  const selected = options.find(item => item.id === selectedId) ?? options[0];
  const schedule = data.schedule;
  const ready = days.length > 0 && data.teachers.length > 0 && data.classes.length > 0 && (data.requirements.length > 0 || data.bookings.length > 0);
  const maxPeriods = Math.max(1, ...days.map(day => day.periods));
  const visibleLessons = schedule?.lessons.filter(lesson => mode === 'class' ? lesson.classId === selected?.id : lesson.teacherId === selected?.id) ?? [];
  const teacherName = (id: string) => data.teachers.find(teacher => teacher.id === id)?.name ?? '';
  const className = (id: string) => data.classes.find(schoolClass => schoolClass.id === id)?.name ?? '';

  useEffect(() => {
    if (!bulkJobs || !bulkJobs.length) return;
    const timer = window.setTimeout(() => window.print(), 80);
    const clear = () => setBulkJobs(null);
    window.addEventListener('afterprint', clear);
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', clear); };
  }, [bulkJobs]);

  const exportCsv = () => {
    if (!schedule) return;
    const header = ['المدرسة', 'العام الدراسي', 'اليوم', 'الحصة', 'الفصل', 'المادة', 'المعلم', 'حصة ثابتة'];
    const rows = days.flatMap(day => visibleLessons.filter(lesson => lesson.dayId === day.id).sort((a, b) => a.period - b.period).map(lesson => [data.schoolName, data.year, day.name, lesson.period, className(lesson.classId), lesson.subject, teacherName(lesson.teacherId), lesson.fixed ? 'نعم' : 'لا']));
    downloadFile('\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n'), `jadwal-${selected?.code ?? 'schedule'}.csv`, 'text/csv;charset=utf-8;');
    notify('تم تصدير الجدول بصيغة CSV المناسبة لبرامج الجداول.');
  };
  const startEdit = (lesson: Lesson) => { setEditing(lesson); setDestination({ dayId: lesson.dayId, period: lesson.period }); setEditError(''); };
  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try { const updated = moveLesson(data, editing.id, destination.dayId, destination.period); commit({ schedule: updated }); setEditing(null); notify('تم تحديث موعد الحصة مع التحقق من التعارضات.'); }
    catch (error) { setEditError(error instanceof Error ? error.message : 'تعذّر نقل الحصة.'); }
  };

  const openCell = (lesson: Lesson | undefined, dayId: string, period: number) => {
    if (readOnly) return;
    if (lesson) {
      if (lesson.manual) setManualEditing({ dayId, period, classId: lesson.classId, teacherId: lesson.teacherId, subject: lesson.subject, existingId: lesson.id });
      else startEdit(lesson);
      return;
    }
    if (!selected) return;
    setManualEditing({
      dayId,
      period,
      classId: mode === 'class' ? selected.id : (data.classes[0]?.id ?? ''),
      teacherId: mode === 'teacher' ? selected.id : (data.teachers[0]?.id ?? ''),
      subject: '',
    });
  };
  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    if (!manualEditing) return;
    if (!manualEditing.teacherId || !manualEditing.classId || !manualEditing.subject.trim()) return notify('أكمل بيانات الحصة أولاً.', 'error');
    const scheduleResult = upsertManualLesson(data, { id: manualEditing.existingId, teacherId: manualEditing.teacherId, classId: manualEditing.classId, dayId: manualEditing.dayId, period: manualEditing.period, subject: manualEditing.subject });
    commit({ schedule: scheduleResult });
    setManualEditing(null);
    notify(manualEditing.existingId ? 'تم تحديث الحصة.' : 'تمت إضافة الحصة يدوياً.', scheduleResult.warnings.length ? 'info' : 'success');
  };
  const removeManual = () => {
    if (!manualEditing?.existingId) return;
    commit({ schedule: removeManualLesson(data, manualEditing.existingId) });
    setManualEditing(null);
    notify('تم حذف الحصة.');
  };

  const startManualSchedule = () => { commit({ schedule: startBlankSchedule() }); notify('بدأت جدولاً فارغاً. اضغط أي خلية لإدخال حصة يدوياً.'); };

  const printGrid = (kind: 'class' | 'teacher', id: string) => {
    const item = (kind === 'class' ? data.classes : data.teachers).find(entry => entry.id === id);
    if (!item) return null;
    const lessons = data.schedule?.lessons.filter(lesson => kind === 'class' ? lesson.classId === id : lesson.teacherId === id) ?? [];
    return (
      <section className="timetable-panel bulk-print-page" key={`${kind}-${id}`}>
        <OfficialPrintHeader data={data} subtitle={`جدول ${kind === 'class' ? 'الفصل' : 'المعلم'}: ${item.name}`} />
        <div className="timetable-heading"><div><span className="timetable-eyebrow">{data.schoolName}</span><h2>الجدول الأسبوعي: {item.name}</h2></div><span className="academic-year">العام الدراسي <bdi className="latin">{data.year}</bdi></span></div>
        <div className="table-scroll"><table className="timetable"><thead><tr><th>الحصة</th>{days.map(day => <th key={day.id}>{day.name}<span>{day.periods} حصص</span></th>)}</tr></thead><tbody>{Array.from({ length: maxPeriods }, (_, index) => index + 1).map(period => <tr key={period}><th><span className="period-number">{String(period).padStart(2, '0')}</span><span className="period-label">الحصة {period}</span></th>{days.map(day => {
          const lesson = lessons.find(entry => entry.dayId === day.id && entry.period === period);
          return <td key={day.id}>{lesson ? <div className={`lesson-cell color-${Math.max(0, data.teachers.findIndex(teacher => teacher.id === lesson.teacherId)) % 6}`}><strong>{lesson.subject || 'حصة دراسية'}</strong><span>{kind === 'class' ? teacherName(lesson.teacherId) : className(lesson.classId)}</span></div> : <span className="empty-cell">{period > day.periods ? '-' : 'فراغ'}</span>}</td>;
        })}</tr>)}</tbody></table></div>
        <OfficialPrintFooter role={kind === 'class' ? 'معلم الفصل' : 'المعلم'} />
      </section>
    );
  };

  const confirmBulkPrint = () => {
    const supervisorClassIds = bulkSelection.supervisorIds.flatMap(supervisorId => {
      const supervisor = data.supervisors.find(item => item.id === supervisorId);
      const section = data.sections.find(item => item.id === supervisor?.sectionId);
      return section?.classIds ?? [];
    });
    const classIds = [...new Set([...bulkSelection.classIds, ...supervisorClassIds])];
    const jobs = [...classIds.map(id => ({ kind: 'class' as const, id })), ...bulkSelection.teacherIds.map(id => ({ kind: 'teacher' as const, id }))];
    if (!jobs.length) return notify('اختر فصلاً أو معلماً أو مشرفاً واحداً على الأقل.', 'error');
    setBulkOpen(false);
    setBulkJobs(jobs);
  };

  if (bulkJobs) {
    return <div className="bulk-print-only">{bulkJobs.map(job => printGrid(job.kind, job.id))}</div>;
  }

  return <div className="page-stack schedule-page">
    {generating && <div className="generation-status" role="status"><div className="generation-icon"><Sparkles size={21} /></div><div><strong>نرتّب أسبوعك الدراسي...</strong><p>نوزّع الحصص مع مراعاة أوقات المعلمين والقيود المحددة.</p><div className="progress-track"><motion.div animate={{ width: `${Math.max(3, progress)}%` }} /></div></div><span className="numeric">{progress}%</span></div>}
    {!schedule ? <Panel title="الجدول الأسبوعي" description="من التفاصيل الصغيرة إلى أسبوع دراسي أكثر وضوحاً." icon={Table2}>
      <EmptyState icon={CalendarDays} title={ready ? 'كل شيء جاهز. لنصنع جدولك.' : 'جدولك المنظّم، على بُعد خطوات'} description={ready ? 'سنوزّع الحصص حسب الأنصبة، مع تجنّب تعارض المعلمين ومراعاة القيود التي أضفتها.' : 'أكمل البيانات الأساسية لتوليد جدول مدرسي، أو ابدأ جدولاً فارغاً وأدخل الحصص يدوياً بنفسك.'}>
        {!readOnly && <Button icon={Sparkles} onClick={onGenerate} disabled={!ready} loading={generating}>إنشاء الجدول تلقائياً</Button>}
        {!readOnly && <Button variant="secondary" icon={Edit3} onClick={startManualSchedule} disabled={!data.classes.length || !data.teachers.length}>بدء جدول يدوي فارغ</Button>}
        {!readOnly && <Button variant="ghost" onClick={loadDemo} disabled={generating}>تجربة مثال جاهز<ArrowLeft size={15} /></Button>}
      </EmptyState>
      <div className="readiness-list">
        {[{ title: 'أيام الدوام', detail: `${days.length} أيام دراسية`, complete: days.length > 0, tab: 'days' as const, icon: CalendarDays }, { title: 'المعلمون والفصول', detail: `${data.teachers.length} معلم، ${data.classes.length} فصل`, complete: data.teachers.length > 0 && data.classes.length > 0, tab: !data.teachers.length ? 'teachers' as const : 'classes' as const, icon: Users }, { title: 'نصاب الحصص', detail: `${data.requirements.length} نصاب مسجّل`, complete: data.requirements.length > 0 || data.bookings.length > 0, tab: 'requirements' as const, icon: GraduationCap }].map(item => <button key={item.title} onClick={() => goTo(item.tab)}><item.icon size={19} /><div><strong>{item.title}</strong><span>{item.detail}</span></div>{item.complete ? <CheckCircle2 size={18} className="text-green" /> : <ArrowLeft size={17} />}</button>)}
      </div>
    </Panel> : <>
      <div className={`schedule-result ${schedule.warnings.length ? 'needs-review' : ''}`}><div>{schedule.warnings.length ? <AlertTriangle size={19} /> : <CheckCircle2 size={20} />}<strong>{schedule.warnings.length ? 'الجدول يحتاج إلى مراجعة' : 'جدولك جاهز لأسبوع أكثر تنظيماً'}</strong><span>{schedule.placed} من {schedule.requested} حصة موزّعة</span></div>{!readOnly && <Button variant="secondary" icon={RefreshCw} onClick={onGenerate} loading={generating}>إعادة التوليد</Button>}</div>
      {schedule.warnings.length > 0 && <details className="schedule-warnings" open><summary><AlertTriangle size={16} /><strong>ملاحظات تحتاج انتباهك ({schedule.warnings.length})</strong><ChevronDown size={16} /></summary><ul>{schedule.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul><p>المولّد يبحث عن توزيع مناسب، وقد تحتاج القيود المتعارضة إلى تعديل أو إعادة توليد.</p></details>}
      <div className="schedule-controls"><div className="segmented-control"><button className={mode === 'class' ? 'selected' : ''} onClick={() => { setMode('class'); setSelectedId(data.classes[0]?.id ?? ''); }}><GraduationCap size={16} />حسب الفصل</button><button className={mode === 'teacher' ? 'selected' : ''} onClick={() => { setMode('teacher'); setSelectedId(data.teachers[0]?.id ?? ''); }}><Users size={16} />حسب المعلم</button></div><select aria-label={mode === 'class' ? 'اختر الفصل لعرض جدوله' : 'اختر المعلم لعرض جدوله'} value={selected?.id ?? ''} onChange={event => setSelectedId(event.target.value)} className="schedule-select">{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="schedule-export"><Button variant="secondary" icon={MousePointerClick} onClick={() => goTo('distribute')}>توزيع يدوي</Button><Button variant="secondary" icon={Download} onClick={exportCsv}>تصدير CSV</Button><Button variant="secondary" icon={Users} onClick={() => setBulkOpen(true)}>طباعة متعددة</Button><Button variant="secondary" icon={Printer} onClick={() => window.print()}>طباعة</Button></div></div>
      <section className="timetable-panel">
        <OfficialPrintHeader data={data} subtitle={`جدول ${mode === 'class' ? 'الفصل' : 'المعلم'}: ${selected?.name ?? ''}`} />
        <div className="timetable-heading"><div><span className="timetable-eyebrow">{data.schoolName}</span><h2>الجدول الأسبوعي: {selected?.name}</h2></div><span className="academic-year">العام الدراسي <bdi className="latin">{data.year}</bdi></span></div>
        {selected && <AttachmentPanel data={data} targetType={mode} targetId={selected.id} editable={!readOnly} commit={commit} notify={notify} />}
        <div className="table-scroll"><table className="timetable"><thead><tr><th>الحصة</th>{days.map(day => <th key={day.id}>{day.name}<span>{day.periods} حصص</span></th>)}</tr></thead><tbody>{Array.from({ length: maxPeriods }, (_, index) => index + 1).map(period => <tr key={period}><th><span className="period-number">{String(period).padStart(2, '0')}</span><span className="period-label">الحصة {period}</span></th>{days.map(day => {
          const lesson = visibleLessons.find(item => item.dayId === day.id && item.period === period);
          const unavailable = period > day.periods || (mode === 'class' ? data.classExceptions.some(item => item.classId === selected?.id && item.dayId === day.id && period >= item.fromPeriod) : !data.teachers.find(item => item.id === selected?.id)?.days.includes(day.id) || data.teacherExceptions.some(item => item.teacherId === selected?.id && item.dayId === day.id && item.period === period));
          const canEditEmpty = !unavailable && period <= day.periods && !readOnly;
          return <td key={day.id} className={unavailable ? 'unavailable-cell' : ''}>{lesson ? <button className={`lesson-cell color-${Math.max(0, data.teachers.findIndex(teacher => teacher.id === lesson.teacherId)) % 6}`} onClick={() => openCell(lesson, day.id, period)} aria-label={`${lesson.subject || 'حصة'}، ${teacherName(lesson.teacherId)}، ${day.name}، الحصة ${period}${readOnly ? '' : '. عرض وتعديل'}`}><strong>{lesson.subject || 'حصة دراسية'}</strong><span>{mode === 'class' ? teacherName(lesson.teacherId) : className(lesson.classId)}</span>{lesson.manual ? <Pencil size={11} className="lesson-lock" /> : lesson.fixed && <LockKeyhole size={11} className="lesson-lock" />}</button> : (
            <button type="button" className={`empty-cell-btn ${canEditEmpty ? '' : 'empty-cell-disabled'}`} disabled={!canEditEmpty} onClick={() => openCell(undefined, day.id, period)} aria-label={canEditEmpty ? `إضافة حصة يدوياً: ${day.name}، الحصة ${period}` : undefined}>
              <span className="empty-cell">{period > day.periods ? '-' : unavailable ? mode === 'class' ? 'انصراف' : 'غير متاح' : mode === 'class' ? 'غير موزّعة' : 'وقت متاح'}</span>
              {canEditEmpty && <Plus size={12} className="empty-cell-plus" />}
            </button>
          )}</td>;
        })}</tr>)}</tbody></table></div>
        <div className="timetable-footer"><span><Info size={14} />اضغط على أي حصة أو خلية فارغة لتعديلها أو إدخال حصة يدوياً.</span><span><LockKeyhole size={12} />حصة ثابتة</span></div>
        <OfficialPrintFooter role={mode === 'class' ? 'معلم الفصل' : 'المعلم'} />
      </section>
    </>}

    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.fixed ? 'تفاصيل الحصة الثابتة' : 'تعديل موعد الحصة'} description={editing ? `${editing.subject || 'حصة دراسية'} | ${className(editing.classId)}` : ''}>
      {editing && <form onSubmit={submitEdit} className="modal-body"><div className="lesson-detail"><span className="person-avatar color-0"><Users size={20} /></span><div><strong>{teacherName(editing.teacherId)}</strong><span>{data.days.find(day => day.id === editing.dayId)?.name}، الحصة {editing.period}</span></div></div>
        {editing.fixed ? <InlineNotice>هذه الحصة محجوزة مسبقاً. عدّلها من قسم حجز الحصص ثم أعد توليد الجدول.</InlineNotice> : <><p className="modal-copy">اختر موعداً جديداً. إذا كان الموعد مشغولاً في الفصل نفسه، سيتم تبديل الحصتين بعد التحقق من التعارضات.</p><div className="form-grid two-columns"><Field label="اليوم الجديد"><select value={destination.dayId} onChange={event => { const day = days.find(item => item.id === event.target.value)!; setDestination({ dayId: day.id, period: Math.min(destination.period, day.periods) }); setEditError(''); }}>{days.map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></Field><Field label="الحصة الجديدة"><select value={destination.period} onChange={event => { setDestination({ ...destination, period: Number(event.target.value) }); setEditError(''); }}>{Array.from({ length: days.find(day => day.id === destination.dayId)?.periods ?? 7 }, (_, index) => <option key={index} value={index + 1}>الحصة {index + 1}</option>)}</select></Field></div>{editError && <p className="form-error" role="alert">{editError}</p>}</>}
        <div className="modal-actions">{editing.fixed ? <Button onClick={() => { setEditing(null); goTo('bookings'); }}>الانتقال إلى الحجوزات<ArrowLeft size={15} /></Button> : <Button type="submit">حفظ الموعد</Button>}<Button variant="secondary" onClick={() => setEditing(null)}>إغلاق</Button></div>
      </form>}
    </Modal>

    <Modal open={!!manualEditing} onClose={() => setManualEditing(null)} title={manualEditing?.existingId ? 'تعديل حصة يدوية' : 'إضافة حصة يدوياً'} description={manualEditing ? `${data.days.find(day => day.id === manualEditing.dayId)?.name} - الحصة ${manualEditing.period}` : ''}>
      {manualEditing && <form onSubmit={submitManual} className="modal-body">
        <div className="form-grid two-columns">
          {mode === 'class' ? (
            <Field label="المعلم"><select required value={manualEditing.teacherId} onChange={event => setManualEditing({ ...manualEditing, teacherId: event.target.value })}><option value="" disabled>اختر المعلم</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field>
          ) : (
            <Field label="الفصل الدراسي"><select required value={manualEditing.classId} onChange={event => setManualEditing({ ...manualEditing, classId: event.target.value })}><option value="" disabled>اختر الفصل</option>{data.classes.map(schoolClass => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></Field>
          )}
          <Field label="المادة الدراسية"><input required maxLength={60} value={manualEditing.subject} onChange={event => setManualEditing({ ...manualEditing, subject: event.target.value })} placeholder="مثال: الرياضيات" /></Field>
        </div>
        <InlineNotice kind="info">الحصص المُدخلة يدوياً ثابتة ولا يعيد المولّد الآلي ترتيبها عند إعادة التوليد.</InlineNotice>
        <div className="modal-actions">
          <Button type="submit" icon={manualEditing.existingId ? Pencil : Plus}>{manualEditing.existingId ? 'حفظ التعديل' : 'إضافة الحصة'}</Button>
          {manualEditing.existingId && <Button type="button" variant="danger" icon={Trash2} onClick={removeManual}>حذف الحصة</Button>}
          <Button type="button" variant="secondary" onClick={() => setManualEditing(null)}>إلغاء</Button>
        </div>
      </form>}
    </Modal>

    <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="طباعة عدة جداول معاً" description="اختر أي مجموعة من الفصول أو المعلمين أو مشرفي الأقسام، وستُطبع جداولهم كاملة صفحة تلو الأخرى." wide>
      <div className="modal-body">
        <div className="bulk-print-grid">
          <div>
            <span className="field-label">الفصول الدراسية</span>
            <CheckboxList items={data.classes.map(item => ({ id: item.id, label: item.name }))} selected={bulkSelection.classIds} onChange={ids => setBulkSelection({ ...bulkSelection, classIds: ids })} emptyLabel="لا توجد فصول مضافة." />
          </div>
          <div>
            <span className="field-label">المعلمون</span>
            <CheckboxList items={data.teachers.map(item => ({ id: item.id, label: item.name }))} selected={bulkSelection.teacherIds} onChange={ids => setBulkSelection({ ...bulkSelection, teacherIds: ids })} emptyLabel="لا يوجد معلمون مضافون." />
          </div>
          {data.supervisors.length > 0 && (
            <div>
              <span className="field-label">مشرفو الأقسام (تُطبع كل فصول قسم المشرف)</span>
              <CheckboxList items={data.supervisors.map(item => ({ id: item.id, label: item.name }))} selected={bulkSelection.supervisorIds} onChange={ids => setBulkSelection({ ...bulkSelection, supervisorIds: ids })} />
            </div>
          )}
        </div>
        <div className="modal-actions">
          <Button icon={Printer} onClick={confirmBulkPrint}>طباعة المحدد</Button>
          <Button variant="secondary" icon={X} onClick={() => setBulkOpen(false)}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
