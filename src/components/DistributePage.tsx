import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Info,
  LockKeyhole,
  MousePointerClick,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
  Trash2,
  Users,
} from 'lucide-react';
import { classCapacity, type Lesson } from '../lib/data';
import { moveLesson } from '../lib/scheduler';
import {
  applyAssign,
  applyRemove,
  applyReplace,
  assignableRequirements,
  previewAssign,
  previewMove,
  previewRemove,
  previewReplace,
  remainingCount,
  type ChangeExplanation,
} from '../lib/manual';
import { Button, EmptyState, Field, InlineNotice, Modal, Panel, type WorkspaceProps } from './ui';

interface DistributeProps extends WorkspaceProps {
  onGenerate: () => void;
  generating: boolean;
}

type Scope = 'teacher' | 'day' | 'class';
type EditAction = 'move' | 'replace' | 'remove';

const scopeLabels: Record<Scope, { label: string; hint: string }> = {
  teacher: { label: 'حسب المعلم', hint: 'وزّع حصص معلم واحد على مدار الأسبوع' },
  day: { label: 'حسب اليوم', hint: 'املأ حصص يوم دراسي واحد عبر كل الفصول' },
  class: { label: 'حسب الفصل', hint: 'وزّع حصص فصل واحد على مدار الأسبوع' },
};

export default function DistributePage({ data, commit, notify, goTo, loadDemo, onGenerate, generating }: DistributeProps) {
  const [scope, setScope] = useState<Scope>('class');
  const [teacherId, setTeacherId] = useState(data.teachers[0]?.id ?? '');
  const [dayId, setDayId] = useState(data.days.find(day => day.enabled)?.id ?? '');
  const [classId, setClassId] = useState(data.classes[0]?.id ?? '');
  const [assignTarget, setAssignTarget] = useState<{ classId: string; dayId: string; period: number } | null>(null);
  const [assignReqId, setAssignReqId] = useState('');
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [editAction, setEditAction] = useState<EditAction>('move');
  const [moveTarget, setMoveTarget] = useState({ dayId: '', period: 1 });
  const [replaceReqId, setReplaceReqId] = useState('');

  const days = data.days.filter(day => day.enabled);
  const schedule = data.schedule;
  const maxPeriods = Math.max(1, ...days.map(day => day.periods));
  const ready = days.length > 0 && data.teachers.length > 0 && data.classes.length > 0 && (data.requirements.length > 0 || data.bookings.length > 0);

  const teacher = data.teachers.find(item => item.id === teacherId) ?? data.teachers[0];
  const day = days.find(item => item.id === dayId) ?? days[0];
  const cls = data.classes.find(item => item.id === classId) ?? data.classes[0];
  const teacherName = (id: string) => data.teachers.find(item => item.id === id)?.name ?? '';
  const className = (id: string) => data.classes.find(item => item.id === id)?.name ?? '';

  // الدروس الظاهرة حسب النطاق
  const boardLessons = useMemo(() => {
    if (!schedule) return [];
    if (scope === 'teacher') return schedule.lessons.filter(item => item.teacherId === teacher?.id);
    if (scope === 'day') return schedule.lessons.filter(item => item.dayId === day?.id);
    return schedule.lessons.filter(item => item.classId === cls?.id);
  }, [schedule, scope, teacher?.id, day?.id, cls?.id]);

  // الرصيد المتبقي للمعلم المختار (لإظهار ما يمكن توزيعه)
  const teacherRemaining = useMemo(() => {
    if (!schedule || !teacher) return 0;
    return data.requirements
      .filter(item => item.teacherId === teacher.id)
      .reduce((sum, item) => sum + remainingCount(data, schedule.lessons, item.id).remaining, 0);
  }, [schedule, teacher, data.requirements]);

  // إحصائيات النطاق
  const stats = useMemo(() => {
    if (!schedule || !days.length) return { assigned: 0, capacity: 0, remaining: 0 };
    if (scope === 'teacher' && teacher) {
      const total = data.requirements.filter(item => item.teacherId === teacher.id).reduce((sum, item) => sum + item.count, 0);
      return { assigned: boardLessons.length, capacity: total, remaining: teacherRemaining };
    }
    if (scope === 'day' && day) {
      const capacity = data.classes.reduce((sum, item) => {
        const releases = data.classExceptions.filter(exc => exc.classId === item.id && exc.dayId === day.id);
        const last = Math.min(day.periods, ...releases.map(exc => exc.fromPeriod - 1));
        return sum + Math.max(0, last);
      }, 0);
      return { assigned: boardLessons.length, capacity, remaining: Math.max(0, capacity - boardLessons.length) };
    }
    if (scope === 'class' && cls) {
      const capacity = classCapacity(data, cls.id);
      return { assigned: boardLessons.length, capacity, remaining: Math.max(0, capacity - boardLessons.length) };
    }
    return { assigned: 0, capacity: 0, remaining: 0 };
  }, [schedule, scope, teacher, day, cls, boardLessons.length, teacherRemaining, days.length, data.requirements, data.classExceptions]);

  const changeScope = (next: Scope) => {
    setScope(next);
    setEditing(null);
    setAssignTarget(null);
  };

  // فتح نافذة الإسناد لخلية فارغة
  const openAssign = (target: { classId: string; dayId: string; period: number }) => {
    const options = assignableRequirements(data, schedule?.lessons ?? [], target.classId, target.dayId, target.period, scope === 'teacher' ? teacher?.id : undefined);
    setAssignTarget(target);
    setAssignReqId(options[0]?.requirement.id ?? '');
  };

  // فتح نافذة تعديل حصة قائمة
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setEditAction('move');
    setMoveTarget({ dayId: lesson.dayId, period: lesson.period });
    const replaceOptions = (data.requirements
      .filter(item => item.classId === lesson.classId && item.id !== lesson.requirementId)
      .map(item => ({ req: item, ...remainingCount(data, schedule?.lessons ?? [], item.id) }))
      .filter(item => item.remaining > 0));
    setReplaceReqId(replaceOptions[0]?.req.id ?? '');
  };

  // الشرح الحي لعملية الإسناد
  const assignExplanation: ChangeExplanation | null = useMemo(() => {
    if (!assignTarget || !assignReqId) return null;
    return previewAssign(data, assignTarget.classId, assignTarget.dayId, assignTarget.period, assignReqId);
  }, [data, assignTarget, assignReqId]);

  const moveExplanation: ChangeExplanation | null = useMemo(() => {
    if (!editing || editAction !== 'move' || !moveTarget.dayId) return null;
    return previewMove(data, editing.id, moveTarget.dayId, moveTarget.period);
  }, [data, editing, editAction, moveTarget]);

  const replaceExplanation: ChangeExplanation | null = useMemo(() => {
    if (!editing || editAction !== 'replace' || !replaceReqId) return null;
    return previewReplace(data, editing.id, replaceReqId);
  }, [data, editing, editAction, replaceReqId]);

  const removeExplanation: ChangeExplanation | null = useMemo(() => {
    if (!editing || editAction !== 'remove') return null;
    return previewRemove(data, editing.id);
  }, [data, editing, editAction]);

  const applyFromModal = (event: FormEvent) => {
    event.preventDefault();
    if (!schedule) return;
    try {
      if (assignTarget && assignExplanation?.canApply) {
        commit({ schedule: applyAssign(data, assignTarget.classId, assignTarget.dayId, assignTarget.period, assignReqId) });
        notify('تم إسناد الحصة بنجاح وأُعيد فحص التعارضات.');
        setAssignTarget(null);
      } else if (editing && editAction === 'move' && moveExplanation?.canApply) {
        commit({ schedule: moveLesson(data, editing.id, moveTarget.dayId, moveTarget.period) });
        notify('تم نقل الحصة بنجاح.');
        setEditing(null);
      } else if (editing && editAction === 'replace' && replaceExplanation?.canApply) {
        commit({ schedule: applyReplace(data, editing.id, replaceReqId) });
        notify('تم استبدال الحصة وإعادة احتساب الأنصبة.');
        setEditing(null);
      } else if (editing && editAction === 'remove' && removeExplanation?.canApply) {
        commit({ schedule: applyRemove(data, editing.id) });
        notify('تمت إزالة الحصة. أصبح الموعد متاحاً لإسناد جديد.');
        setEditing(null);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذّر تنفيذ التغيير.', 'error');
    }
  };

  // تحديد محتوى الخلية
  const cellAt = (colId: string, dayIdValue: string, period: number): Lesson | undefined => {
    if (scope === 'day') return boardLessons.find(item => item.classId === colId && item.period === period);
    return boardLessons.find(item => item.dayId === dayIdValue && item.period === period);
  };

  const isUnavailable = (classId: string, dayIdValue: string, period: number): boolean => {
    const currentDay = days.find(item => item.id === dayIdValue);
    if (!currentDay || period > currentDay.periods) return true;
    if (scope === 'teacher') {
      if (teacher && !teacher.days.includes(dayIdValue)) return true;
      if (data.teacherExceptions.some(exc => exc.teacherId === teacher?.id && exc.dayId === dayIdValue && exc.period === period)) return true;
      return false;
    }
    // في نطاق اليوم: الفصل هو العمود واليوم ثابت. في نطاق الفصل: الفصل ثابت واليوم هو العمود.
    const effectiveClassId = scope === 'day' ? classId : cls?.id ?? '';
    if (data.classExceptions.some(exc => exc.classId === effectiveClassId && exc.dayId === dayIdValue && period >= exc.fromPeriod)) return true;
    return false;
  };

  const columns: { id: string; title: string; sub: string }[] = scope === 'day'
    ? data.classes.map(item => ({ id: item.id, title: item.name, sub: item.code }))
    : days.map(item => ({ id: item.id, title: item.name, sub: `${item.periods} حصص` }));

  const assignOptions = assignTarget
    ? assignableRequirements(data, schedule?.lessons ?? [], assignTarget.classId, assignTarget.dayId, assignTarget.period, scope === 'teacher' ? teacher?.id : undefined)
    : [];

  const replaceOptions = editing
    ? data.requirements
        .filter(item => item.classId === editing.classId && item.id !== editing.requirementId)
        .map(item => ({ req: item, ...remainingCount(data, schedule?.lessons ?? [], item.id) }))
        .filter(item => item.remaining > 0)
    : [];

  const renderExplanation = (explanation: ChangeExplanation | null) => {
    if (!explanation) return null;
    return (
      <div className={`change-explanation ${explanation.canApply ? 'is-valid' : 'is-blocked'}`}>
        <div className="explanation-head">
          {explanation.canApply ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <strong>شرح التغيير</strong>
        </div>
        <ul>
          {explanation.lines.map((line, index) => <li key={index}>{line}</li>)}
        </ul>
        {explanation.warnings.map((warning, index) => (
          <p className="explanation-warning" key={`w-${index}`}><AlertTriangle size={13} />{warning}</p>
        ))}
        {!explanation.canApply && explanation.blockedReason && (
          <p className="explanation-blocked" role="alert"><Info size={14} />{explanation.blockedReason}</p>
        )}
      </div>
    );
  };

  return (
    <div className="page-stack distribute-page">
      {generating && (
        <div className="generation-status" role="status">
          <div className="generation-icon"><Sparkles size={21} /></div>
          <div><strong>نرتّب أسبوعك الدراسي...</strong><p>نوزّع الحصص مع مراعاة أوقات المعلمين والقيود المحددة.</p></div>
          <RefreshCw size={16} className="spin" />
        </div>
      )}

      {!schedule ? (
        <Panel title="التوزيع اليدوي للحصص" description="وزّع الحصص بنفسك: اختر معلماً أو يوماً أو فصلاً، ثم أسند الحصص واعرف أثر كل تغيير قبل تطبيقه." icon={MousePointerClick}>
          <EmptyState
            icon={CalendarDays}
            title={ready ? 'ولّد الجدول أولاً ثم وزّع يدوياً' : 'جدولك المنظّم، على بُعد خطوات'}
            description={ready ? 'التوزيع اليدوي يعمل على جدول قائم. أنشئ الجدول آلياً ثم عدّل توزيع الحصص كما تشاء.' : 'أكمل البيانات الأساسية لتوليد جدول مدرسي، أو استكشف التطبيق بمثال جاهز.'}
          >
            <Button icon={Sparkles} onClick={onGenerate} disabled={!ready} loading={generating}>إنشاء الجدول</Button>
            <Button variant="secondary" onClick={loadDemo} disabled={generating}>تجربة مثال جاهز<ArrowLeft size={15} /></Button>
          </EmptyState>
        </Panel>
      ) : (
        <>
          <Panel title="التوزيع اليدوي للحصص" description="اختر نطاق التوزيع، ثم اضغط على خلية فارغة لإسناد حصة أو على حصة قائمة لنقلها أو استبدالها أو إزالتها." icon={MousePointerClick}
            action={<Button variant="secondary" icon={RefreshCw} onClick={onGenerate} loading={generating}>إعادة التوليد الآلي</Button>}>
            <div className="distribute-controls">
              <div className="segmented-control distribute-scope">
                {(Object.keys(scopeLabels) as Scope[]).map(key => (
                  <button key={key} type="button" className={scope === key ? 'selected' : ''} onClick={() => changeScope(key)}>
                    {key === 'teacher' ? <Users size={15} /> : key === 'day' ? <CalendarDays size={15} /> : <GraduationCap size={15} />}
                    {scopeLabels[key].label}
                  </button>
                ))}
              </div>
              <div className="scope-selector">
                <Field label={scope === 'teacher' ? 'اختر المعلم' : scope === 'day' ? 'اختر اليوم' : 'اختر الفصل'}>
                  <select value={scope === 'teacher' ? teacher?.id ?? '' : scope === 'day' ? day?.id ?? '' : cls?.id ?? ''} onChange={event => {
                    if (scope === 'teacher') setTeacherId(event.target.value);
                    else if (scope === 'day') setDayId(event.target.value);
                    else setClassId(event.target.value);
                    setEditing(null);
                    setAssignTarget(null);
                  }}>
                    {(scope === 'teacher' ? data.teachers : scope === 'day' ? days : data.classes).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Field>
                <p className="scope-hint">{scopeLabels[scope].hint}</p>
              </div>
              <div className="distribute-stats">
                <div className={`dist-stat ${scope === 'teacher' ? 'stat-teacher' : ''}`}>
                  <span>الحصص الموزعة</span>
                  <strong className="numeric">{stats.assigned}</strong>
                </div>
                <div className="dist-stat">
                  <span>{scope === 'teacher' ? 'إجمالي النصاب' : 'سعة النطاق'}</span>
                  <strong className="numeric">{stats.capacity}</strong>
                </div>
                <div className={`dist-stat ${stats.remaining > 0 ? 'stat-pending' : 'stat-done'}`}>
                  <span>{scope === 'teacher' ? 'المتبقي للتوزيع' : 'المواعد الفارغة'}</span>
                  <strong className="numeric">{stats.remaining}</strong>
                </div>
              </div>
            </div>
          </Panel>

          <div className="distribute-guide">
            <div className="guide-item"><span className="guide-number">1</span><div><strong>اختر النطاق</strong><p>معلم واحد، أو يوم دراسي، أو فصل كامل.</p></div></div>
            <div className="guide-item"><span className="guide-number">2</span><div><strong>اضغط خلية فارغة</strong><p>اختر المادة والمعلم، واقرأ شرح التغيير قبل التأكيد.</p></div></div>
            <div className="guide-item"><span className="guide-number">3</span><div><strong>عدّل الحصص القائمة</strong><p>نقل أو استبدال أو إزالة، مع فحص فوري للتعارضات.</p></div></div>
          </div>

          {scope === 'teacher' && teacher && teacherRemaining === 0 && (
            <InlineNotice kind="info">اكتمل نصاب هذا المعلم بالكامل. لا توجد حصص متبقية لإسنادها، ويمكنك فقط نقل أو استبدال حصصه الحالية.</InlineNotice>
          )}

          <section className="distribute-board-panel">
            <div className="distribute-board-heading">
              <div>
                <span className="timetable-eyebrow">{data.schoolName}</span>
                <h2>
                  {scope === 'teacher' && `حصص المعلم: ${teacher?.name}`}
                  {scope === 'day' && `حصص يوم: ${day?.name}`}
                  {scope === 'class' && `حصص الفصل: ${cls?.name}`}
                </h2>
              </div>
              <span className="board-legend"><MousePointerClick size={14} />اضغط خلية فارغة للإسناد، أو حصة قائمة للتعديل</span>
            </div>

            <div className="table-scroll distribute-scroll">
              <table className="distribute-board">
                <thead>
                  <tr>
                    <th className="period-col">الحصة</th>
                    {columns.map(col => <th key={col.id}>{col.title}<span>{col.sub}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, index) => index + 1).map(period => (
                    <tr key={period}>
                      <th className="period-row"><span className="period-number">{String(period).padStart(2, '0')}</span><span className="period-label">الحصة {period}</span></th>
                      {columns.map(col => {
                        const colDayId = scope === 'day' ? day!.id : col.id;
                        const colClassId = scope === 'day' ? col.id : cls?.id ?? '';
                        const lesson = cellAt(col.id, colDayId, period);
                        const unavailable = isUnavailable(colClassId, colDayId, period);
                        const teacherIndex = lesson ? Math.max(0, data.teachers.findIndex(item => item.id === lesson.teacherId)) % 6 : 0;
                        if (lesson) {
                          return (
                            <td key={col.id} className="filled-cell">
                              <motion.button
                                type="button"
                                className={`distribute-lesson color-${teacherIndex}`}
                                onClick={() => openEdit(lesson)}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                aria-label={`${lesson.subject || 'حصة'} ${scope === 'day' ? `للفصل ${className(lesson.classId)}` : ''} ${teacherName(lesson.teacherId)}، الحصة ${period}. اضغط للتعديل`}
                              >
                                <strong>{lesson.subject || 'حصة دراسية'}</strong>
                                <span>{scope === 'day' || scope === 'class' ? teacherName(lesson.teacherId) : className(lesson.classId)}</span>
                                {lesson.fixed && <LockKeyhole size={11} className="lesson-lock" />}
                              </motion.button>
                            </td>
                          );
                        }
                        const canAssign = scope !== 'teacher' || teacherRemaining > 0;
                        const cellDayId = scope === 'day' ? day!.id : col.id;
                        const cellDayName = days.find(item => item.id === cellDayId)?.name ?? '';
                        const cellClassId = scope === 'day' ? col.id : scope === 'class' ? cls!.id : '';
                        const cellDayPeriods = days.find(item => item.id === cellDayId)?.periods ?? 0;
                        const beyondDay = period > cellDayPeriods;
                        return (
                          <td key={col.id} className={unavailable || beyondDay ? 'unavailable-cell' : ''}>
                            {beyondDay ? (
                              <span className="empty-cell">-</span>
                            ) : unavailable ? (
                              <span className="empty-cell">{scope === 'teacher' ? 'غير متاح' : 'انصراف'}</span>
                            ) : (
                              <button
                                type="button"
                                className={`distribute-empty ${canAssign ? '' : 'no-credit'}`}
                                onClick={() => canAssign && openAssign({ classId: cellClassId, dayId: cellDayId, period })}
                                disabled={!canAssign}
                                aria-label={`موعد فارغ ${scope === 'day' ? `للفصل ${className(col.id)}` : `يوم ${cellDayName}`} الحصة ${period}. اضغط لإسناد حصة`}
                              >
                                <Plus size={15} />
                                <span>إسناد</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="distribute-footer">
              <span><Info size={13} />كل تغيير يُعاد فحصه فوراً للتأكد من عدم تعارض المعلمين أو تجاوز الحدود اليومية.</span>
              <button type="button" className="text-link" onClick={() => goTo('bookings')}>إدارة الحصص المحجوزة الثابتة<ArrowLeft size={13} /></button>
            </div>
          </section>
        </>
      )}

      {/* نافذة إسناد حصة جديدة */}
      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="إسناد حصة جديدة"
        description={assignTarget ? `يوم ${days.find(item => item.id === assignTarget.dayId)?.name} - الحصة ${assignTarget.period}${assignTarget.classId ? ` - الفصل ${className(assignTarget.classId)}` : ''}` : ''}
      >
        <form onSubmit={applyFromModal} className="modal-body">
          <p className="modal-copy">اختر الفصل والمادة والمعلم لهذا الموعد. سنعرض لك أثر التغيير بالكامل قبل التأكيد.</p>
          {scope === 'teacher' && assignTarget && (
            <Field label="الفصل الدراسي">
              <select
                value={assignTarget.classId}
                onChange={event => {
                  const newClassId = event.target.value;
                  setAssignTarget({ ...assignTarget, classId: newClassId });
                  const first = newClassId
                    ? assignableRequirements(data, schedule?.lessons ?? [], newClassId, assignTarget.dayId, assignTarget.period, teacher?.id)[0]
                    : undefined;
                  setAssignReqId(first?.requirement.id ?? '');
                }}
              >
                <option value="" disabled>اختر الفصل الذي سيدرّسه المعلم</option>
                {data.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
          )}
          {assignTarget && !assignTarget.classId ? (
            <InlineNotice kind="info">اختر الفصل أولاً لعرض المواد والأنصبة المتاحة للمعلم في هذا التوقيت.</InlineNotice>
          ) : assignOptions.length === 0 ? (
            <InlineNotice kind="warning">لا توجد أنصبة متاحة لهذا الموعد. إما أن نصاب الفصل اكتمل، أو أن جميع المعلمين غير متاحين في هذا التوقيت.</InlineNotice>
          ) : (
            <div className="form-grid">
              <Field label={scope === 'teacher' ? 'المادة (النصاب المتبقي)' : 'المادة والمعلم'}>
                <select value={assignReqId} onChange={event => setAssignReqId(event.target.value)}>
                  {assignOptions.map(option => (
                    <option key={option.requirement.id} value={option.requirement.id}>
                      {option.requirement.subject || 'حصة دراسية'}{scope === 'teacher' ? '' : ` - ${option.teacherName}`} (متبقٍ {option.remaining} من {option.total})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          {renderExplanation(assignExplanation)}
          <div className="modal-actions">
            <Button type="submit" disabled={!assignExplanation?.canApply} icon={Plus}>تأكيد الإسناد</Button>
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      {/* نافذة تعديل حصة قائمة */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="تعديل حصة قائمة"
        description={editing ? `${editing.subject || 'حصة دراسية'} | ${className(editing.classId)} | ${teacherName(editing.teacherId)}` : ''}
      >
        {editing && (
          <form onSubmit={applyFromModal} className="modal-body">
            {editing.fixed ? (
              <>
                <InlineNotice kind="info">هذه الحصة محجوزة مسبقاً وثابتة. عدّلها من قسم «حجز الحصص» ثم أعد توليد الجدول.</InlineNotice>
                <div className="modal-actions">
                  <Button type="button" onClick={() => { setEditing(null); goTo('bookings'); }}>الانتقال إلى الحجوزات<ArrowLeft size={15} /></Button>
                  <Button variant="secondary" type="button" onClick={() => setEditing(null)}>إغلاق</Button>
                </div>
              </>
            ) : (
              <>
                <div className="edit-action-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={editAction === 'move'} className={editAction === 'move' ? 'selected' : ''} onClick={() => setEditAction('move')}><ArrowRightLeft size={15} />نقل الحصة</button>
                  <button type="button" role="tab" aria-selected={editAction === 'replace'} className={editAction === 'replace' ? 'selected' : ''} onClick={() => setEditAction('replace')}><RefreshCw size={15} />استبدال</button>
                  <button type="button" role="tab" aria-selected={editAction === 'remove'} className={editAction === 'remove' ? 'selected' : ''} onClick={() => setEditAction('remove')}><Trash2 size={15} />إزالة</button>
                </div>

                {editAction === 'move' && (
                  <div className="form-grid two-columns">
                    <Field label="اليوم الجديد">
                      <select value={moveTarget.dayId} onChange={event => {
                        const selectedDay = days.find(item => item.id === event.target.value)!;
                        setMoveTarget({ dayId: selectedDay.id, period: Math.min(moveTarget.period, selectedDay.periods) });
                      }}>
                        {days.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </Field>
                    <Field label="الحصة الجديدة">
                      <select value={moveTarget.period} onChange={event => setMoveTarget({ ...moveTarget, period: Number(event.target.value) })}>
                        {Array.from({ length: days.find(item => item.id === moveTarget.dayId)?.periods ?? 7 }, (_, index) => <option key={index} value={index + 1}>الحصة {index + 1}</option>)}
                      </select>
                    </Field>
                  </div>
                )}

                {editAction === 'replace' && (
                  <div className="form-grid">
                    <Field label="المادة والمعلم البديل">
                      {replaceOptions.length === 0 ? (
                        <p className="field-hint">لا توجد أنصبة أخرى متبقية لهذا الفصل. أضف نصاباً من قسم «نصاب المعلمين» أو وزّع الفائض على أيام أخرى.</p>
                      ) : (
                        <select value={replaceReqId} onChange={event => setReplaceReqId(event.target.value)}>
                          {replaceOptions.map(option => (
                            <option key={option.req.id} value={option.req.id}>
                              {option.req.subject || 'حصة دراسية'} - {teacherName(option.req.teacherId)} (متبقٍ {option.remaining} من {option.total})
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </div>
                )}

                {editAction === 'remove' && (
                  <p className="modal-copy">ستُزال هذه الحصة من الجدول ويعود رصيدها إلى نصاب المادة ليُعاد توزيعه.</p>
                )}

                {editAction === 'move' && renderExplanation(moveExplanation)}
                {editAction === 'replace' && renderExplanation(replaceExplanation)}
                {editAction === 'remove' && renderExplanation(removeExplanation)}

                <div className="modal-actions">
                  <Button
                    type="submit"
                    disabled={editAction === 'move' ? !moveExplanation?.canApply : editAction === 'replace' ? !replaceExplanation?.canApply : !removeExplanation?.canApply}
                    icon={editAction === 'remove' ? Trash2 : editAction === 'replace' ? RefreshCw : ArrowRightLeft}
                    variant={editAction === 'remove' ? 'danger' : 'primary'}
                  >
                    {editAction === 'move' ? 'تأكيد النقل' : editAction === 'replace' ? 'تأكيد الاستبدال' : 'تأكيد الإزالة'}
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => setEditing(null)}>إلغاء</Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
