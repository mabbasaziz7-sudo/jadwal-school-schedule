import { useState, type FormEvent } from 'react';
import { BookOpenCheck, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { classCapacity, uid, type Requirement } from '../lib/data';
import { Button, EmptyState, Field, IconButton, InlineNotice, NextFooter, Panel, type WorkspaceProps } from './ui';

export default function RequirementsPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const blank = (): Requirement => ({ id: '', teacherId: data.teachers[0]?.id ?? '', classId: data.classes[0]?.id ?? '', subject: '', count: 5 });
  const [form, setForm] = useState<Requirement>(blank);
  const [filter, setFilter] = useState('all');
  const ready = data.teachers.length > 0 && data.classes.length > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.teacherId || !form.classId) return notify('اختر المعلم والفصل أولاً.', 'error');
    if (!form.id && data.requirements.length >= 1000) return notify('الحد المدعوم هو 1000 نصاب. عدّل الأنصبة الموجودة أو احذف غير المستخدم منها.', 'error');
    if (data.requirements.some(item => item.id !== form.id && item.teacherId === form.teacherId && item.classId === form.classId && item.subject === form.subject.trim())) return notify('هذا النصاب موجود بالفعل. يمكنك تعديله من القائمة أدناه.', 'error');
    const requirement = { ...form, id: form.id || uid(), subject: form.subject.trim() };
    commit({ requirements: form.id ? data.requirements.map(item => item.id === form.id ? requirement : item) : [...data.requirements, requirement] });
    notify(form.id ? 'تم تعديل نصاب الحصص.' : 'تمت إضافة النصاب الأسبوعي.');
    setForm({ ...blank(), teacherId: form.teacherId, classId: form.classId });
  };
  const teacherName = (id: string) => data.teachers.find(item => item.id === id)?.name ?? '';
  const className = (id: string) => data.classes.find(item => item.id === id)?.name ?? '';
  const filtered = data.requirements.filter(item => filter === 'all' || item.classId === filter);

  return <div className="page-stack">
    {!ready && <InlineNotice kind="warning">لتوزيع الحصص، أضف معلماً وصفاً واحداً على الأقل. <button className="text-link" onClick={() => goTo(!data.teachers.length ? 'teachers' : 'classes')}>{!data.teachers.length ? 'إضافة المعلمين' : 'إضافة الصفوف'}</button></InlineNotice>}
    <Panel title={form.id ? 'تعديل نصاب الحصص' : 'نصاب المعلم في الفصل'} description="وزّع حصص كل معلم على الفصول طوال الأسبوع، وليس لليوم الواحد." icon={ClipboardList} id="requirement-form">
      <form className="panel-form" onSubmit={submit}><fieldset disabled={!ready}>
        <div className="form-grid two-columns"><Field label="المعلم"><select required value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="" disabled>اختر المعلم</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field><Field label="الفصل الدراسي"><select required value={form.classId} onChange={event => setForm({ ...form, classId: event.target.value })}><option value="" disabled>اختر الفصل</option>{data.classes.map(schoolClass => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></Field></div>
        <div className="form-grid two-columns"><Field label="المادة الدراسية" optional><input maxLength={60} value={form.subject} placeholder="مثال: الرياضيات" onChange={event => setForm({ ...form, subject: event.target.value })} /></Field><Field label="عدد الحصص أسبوعياً"><input required type="number" min={1} max={84} value={form.count} onChange={event => setForm({ ...form, count: Number(event.target.value) })} /></Field></div>
        <div className="form-actions"><Button type="submit" disabled={!ready} icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة النصاب'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}<p className="form-help">يمكن للمعلم تدريس أكثر من مادة للفصل نفسه.</p></div>
      </fieldset></form>
    </Panel>
    {data.classes.length > 0 && <Panel title="تغطية الفصول" description="لأسبوع متكامل، يجب أن يساوي النصاب عدد حصص الفصل المتاحة." icon={BookOpenCheck} className="coverage-section"><div className="coverage-list">{data.classes.map(schoolClass => {
      const total = data.requirements.filter(item => item.classId === schoolClass.id).reduce((sum, item) => sum + item.count, 0);
      const capacity = classCapacity(data, schoolClass.id);
      return <div className="coverage-row" key={schoolClass.id}><strong>{schoolClass.name}</strong><div className="coverage-bar"><div className="progress-track"><motion.div initial={false} animate={{ width: `${Math.min(100, capacity ? total / capacity * 100 : 0)}%` }} className={total > capacity ? 'over-capacity' : ''} /></div><span className="numeric">{total} / {capacity}</span></div><span className={`coverage-label ${total === capacity ? 'is-complete' : total > capacity ? 'is-over' : ''}`}>{total === capacity ? 'تغطية مكتملة' : total > capacity ? `${total - capacity} حصص زائدة` : `${capacity - total} حصص متبقية`}</span></div>;
    })}</div></Panel>}
    <Panel title="الأنصبة المسجّلة" description={`${data.requirements.length} نصاب، بإجمالي ${data.requirements.reduce((sum, item) => sum + item.count, 0)} حصة أسبوعية`} action={data.requirements.length > 0 && <select aria-label="تصفية الأنصبة حسب الفصل" className="compact-select" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">جميع الفصول</option>{data.classes.map(schoolClass => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select>}>
      {!filtered.length ? <EmptyState compact icon={ClipboardList} title={data.requirements.length ? 'لا توجد أنصبة لهذا الفصل' : 'لنوزّع حصص الأسبوع'} description="اختر المعلم والفصل وأضف النصاب من النموذج أعلاه." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المعلم</th><th>الفصل</th><th>المادة</th><th>حصص أسبوعية</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><strong>{teacherName(item.teacherId)}</strong></td><td>{className(item.classId)}</td><td>{item.subject || <span className="muted">غير محددة</span>}</td><td className="numeric">{item.count}</td><td><div className="row-actions"><IconButton icon={Pencil} label="تعديل النصاب" onClick={() => { setForm(item); document.getElementById('requirement-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} label="حذف النصاب" className="delete-button" onClick={() => confirm('حذف نصاب الحصص؟', `سيُحذف نصاب ${teacherName(item.teacherId)} للفصل ${className(item.classId)} فقط.`, () => { commit({ requirements: data.requirements.filter(requirement => requirement.id !== item.id) }); if (form.id === item.id) setForm(blank()); notify('تم حذف النصاب.'); }, true)} /></div></td></tr>)}</tbody></table></div>}
      <NextFooter label="التالي: الاستثناءات" onNext={() => goTo('exceptions')} />
    </Panel>
  </div>;
}