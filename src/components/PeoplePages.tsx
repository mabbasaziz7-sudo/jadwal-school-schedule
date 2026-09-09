import { useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Eye, GraduationCap, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { classCapacity, uid, type SchoolClass, type Teacher } from '../lib/data';
import { Button, DayCheckboxes, EmptyState, Field, IconButton, NextFooter, Panel, type WorkspaceProps } from './ui';

export function TeachersPage({ data, commit, notify, goTo, confirm, onViewTeacher }: WorkspaceProps) {
  const blank = (): Teacher => ({ id: '', name: '', code: '', minDaily: 0, maxDaily: 7, maxConsecutive: 3, days: data.days.filter(day => day.enabled).map(day => day.id) });
  const [form, setForm] = useState<Teacher>(blank);
  const [search, setSearch] = useState('');
  const set = <K extends keyof Teacher>(key: K, value: Teacher[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return notify('أدخل اسم المعلم.', 'error');
    if (form.minDaily > form.maxDaily) return notify('الحد الأدنى للحصص يجب ألا يتجاوز الحد الأقصى.', 'error');
    if (!form.days.some(id => data.days.some(day => day.id === id && day.enabled))) return notify('اختر يوم دوام واحداً على الأقل للمعلم.', 'error');
    if (form.code.trim() && data.teachers.some(teacher => teacher.id !== form.id && teacher.code.toLowerCase() === form.code.trim().toLowerCase())) return notify('رمز المعلم مستخدم بالفعل. اختر رمزاً مختلفاً.', 'error');
    if (!form.id && data.teachers.length >= 100) return notify('الحد المدعوم هو 100 معلم.', 'error');
    const id = form.id || uid();
    const teacher: Teacher = { ...form, id, name: form.name.trim(), code: form.code.trim() || `T-${id.slice(0, 5).toUpperCase()}` };
    commit({ teachers: form.id ? data.teachers.map(item => item.id === form.id ? teacher : item) : [...data.teachers, teacher] });
    notify(form.id ? 'تم تحديث بيانات المعلم.' : 'تمت إضافة المعلم بنجاح.');
    setForm(blank());
  };
  const remove = (teacher: Teacher) => confirm(`حذف ${teacher.name}؟`, 'سيتم حذف المعلم وجميع الأنصبة والاستثناءات والحجوزات المرتبطة به. لا يمكن التراجع عن هذه الخطوة.', () => {
    commit({
      teachers: data.teachers.filter(item => item.id !== teacher.id),
      requirements: data.requirements.filter(item => item.teacherId !== teacher.id),
      teacherExceptions: data.teacherExceptions.filter(item => item.teacherId !== teacher.id),
      limits: data.limits.filter(item => item.teacherId !== teacher.id),
      bookings: data.bookings.filter(item => item.teacherId !== teacher.id),
    });
    if (form.id === teacher.id) setForm(blank());
    notify('تم حذف المعلم والبيانات المرتبطة به.');
  }, true);
  const filtered = data.teachers.filter(teacher => `${teacher.name} ${teacher.code}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="page-stack">
    <Panel title={form.id ? 'تعديل بيانات المعلم' : 'إضافة معلم'} description="أضف فريقك التعليمي وحدّد أوقات تواجد كل معلم في المدرسة." icon={Users} id="teacher-form">
      <form className="panel-form" onSubmit={submit}>
        <div className="form-grid two-columns"><Field label="اسم المعلم"><input required maxLength={80} placeholder="مثال: أحمد عبدالله" value={form.name} onChange={event => set('name', event.target.value)} /></Field><Field label="رمز المعلم" optional><input maxLength={20} placeholder="مثال: T01" value={form.code} onChange={event => set('code', event.target.value)} /></Field></div>
        <div className="form-grid three-columns"><Field label="أقل عدد حصص يومية"><input required type="number" min={0} max={12} value={form.minDaily} onChange={event => set('minDaily', Number(event.target.value))} /></Field><Field label="أقصى عدد حصص يومية"><input required type="number" min={1} max={12} value={form.maxDaily} onChange={event => set('maxDaily', Number(event.target.value))} /></Field><Field label="أقصى عدد حصص متتالية"><input required type="number" min={1} max={12} value={form.maxConsecutive} onChange={event => set('maxConsecutive', Number(event.target.value))} /></Field></div>
        <div className="field"><span className="field-label">أيام دوام المعلم في هذه المدرسة</span><DayCheckboxes data={data} selected={form.days} onChange={days => set('days', days)} /></div>
        <div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة المعلم'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}<p className="form-help">يعمل في أكثر من مدرسة؟ اختر أيام تواجده هنا فقط.</p></div>
      </form>
    </Panel>
    <Panel title="قائمة المعلمين" description={`${data.teachers.length} معلم في فريقك التعليمي`} action={data.teachers.length > 0 && <div className="search-input"><Search size={16} /><input placeholder="ابحث عن معلم..." aria-label="البحث عن معلم" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
      {data.teachers.length === 0 ? <EmptyState compact icon={Users} title="فريقك التعليمي يبدأ من هنا" description="أضف أول معلم باستخدام النموذج أعلاه، وسنرتّب بقية التفاصيل معاً." /> : filtered.length === 0 ? <EmptyState compact title="لا توجد نتائج" description="جرّب البحث باسم أو رمز مختلف." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المعلم</th><th>الرمز</th><th>أيام الدوام</th><th>النصاب الأسبوعي</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map((teacher, index) => <tr key={teacher.id}>
        <td><div className="person-cell"><span className={`person-avatar color-${index % 6}`}>{teacher.name.charAt(0)}</span><strong>{teacher.name}</strong></div></td><td><span className="latin muted">{teacher.code}</span></td><td><span className="small-text">{data.days.filter(day => day.enabled && teacher.days.includes(day.id)).map(day => day.short).join('، ') || 'لا توجد أيام مفعّلة'}</span></td><td><strong className="numeric">{data.requirements.filter(item => item.teacherId === teacher.id).reduce((sum, item) => sum + item.count, 0)}</strong><span className="muted small-text"> حصة</span></td><td><div className="row-actions">{onViewTeacher && <IconButton icon={Eye} label={`عرض جدول ${teacher.name} كمعلم`} onClick={() => onViewTeacher(teacher.id)} />}<IconButton icon={Pencil} label={`تعديل ${teacher.name}`} onClick={() => { setForm({ ...teacher, days: [...teacher.days] }); document.getElementById('teacher-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} /><IconButton icon={Trash2} label={`حذف ${teacher.name}`} className="delete-button" onClick={() => remove(teacher)} /></div></td>
      </tr>)}</tbody></table></div>}
      <NextFooter label="التالي: الصفوف" onNext={() => goTo('classes')} />
    </Panel>
  </div>;
}

export function ClassesPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const [form, setForm] = useState<SchoolClass>({ id: '', name: '', code: '' });
  const [search, setSearch] = useState('');
  const reset = () => setForm({ id: '', name: '', code: '' });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return notify('أدخل اسم الصف.', 'error');
    if (data.classes.some(item => item.id !== form.id && (item.name === form.name.trim() || (form.code.trim() && item.code.toLowerCase() === form.code.trim().toLowerCase())))) return notify('اسم الصف أو رمزه مستخدم بالفعل.', 'error');
    if (!form.id && data.classes.length >= 40) return notify('الحد المدعوم هو 40 صفاً.', 'error');
    const id = form.id || uid();
    const schoolClass = { ...form, id, name: form.name.trim(), code: form.code.trim() || `C-${id.slice(0, 5).toUpperCase()}` };
    commit({ classes: form.id ? data.classes.map(item => item.id === form.id ? schoolClass : item) : [...data.classes, schoolClass] });
    notify(form.id ? 'تم تحديث بيانات الصف.' : 'تمت إضافة الصف بنجاح.');
    reset();
  };
  const remove = (schoolClass: SchoolClass) => confirm(`حذف الصف ${schoolClass.name}؟`, 'ستُحذف أيضاً أنصبة الحصص والاستثناءات والحجوزات المرتبطة بهذا الصف، وتُزال من أي قسم يضمّها.', () => {
    commit({
      classes: data.classes.filter(item => item.id !== schoolClass.id),
      requirements: data.requirements.filter(item => item.classId !== schoolClass.id),
      classExceptions: data.classExceptions.filter(item => item.classId !== schoolClass.id),
      bookings: data.bookings.filter(item => item.classId !== schoolClass.id),
      sections: data.sections.map(section => ({ ...section, classIds: section.classIds.filter(id => id !== schoolClass.id) })),
    });
    if (form.id === schoolClass.id) reset();
    notify('تم حذف الصف والبيانات المرتبطة به.');
  }, true);
  const filtered = data.classes.filter(item => `${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-stack">
    <Panel title={form.id ? 'تعديل بيانات الصف' : 'إضافة صف دراسي'} description="أضف الصفوف والشُعب التي ترغب في تنظيم جداولها." icon={GraduationCap} id="class-form">
      <form className="panel-form" onSubmit={submit}><div className="form-grid two-columns"><Field label="اسم الصف"><input required maxLength={80} placeholder="مثال: الأول متوسط - أ" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field><Field label="رمز الصف" optional><input maxLength={20} placeholder="مثال: C01" value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></Field></div><div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة الصف'}</Button>{form.id && <Button variant="ghost" onClick={reset}>إلغاء التعديل</Button>}</div></form>
    </Panel>
    <Panel title="الصفوف الدراسية" description={`${data.classes.length} صف في مدرستك`} action={data.classes.length > 0 && <div className="search-input"><Search size={16} /><input placeholder="ابحث عن صف..." aria-label="البحث عن صف" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
      {!data.classes.length ? <EmptyState compact icon={GraduationCap} title="مساحة لكل صف" description="أضف الصفوف الدراسية، ثم خصّص نصاب المعلمين لكل صف في الخطوة التالية." /> : !filtered.length ? <EmptyState compact title="لا توجد نتائج" description="جرّب البحث باسم صف مختلف." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>الصف الدراسي</th><th>رمز الصف</th><th>الحصص المخصصة</th><th>تغطية الأسبوع</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map(schoolClass => {
        const assigned = data.requirements.filter(item => item.classId === schoolClass.id).reduce((sum, item) => sum + item.count, 0);
        const capacity = classCapacity(data, schoolClass.id);
        return <tr key={schoolClass.id}><td><div className="person-cell"><span className="class-icon"><BookOpen size={18} /></span><strong>{schoolClass.name}</strong></div></td><td className="latin muted">{schoolClass.code}</td><td><strong className="numeric">{assigned}</strong><span className="muted"> / {capacity}</span></td><td><div className="coverage-inline"><div className="progress-track"><div style={{ width: `${Math.min(100, capacity ? assigned / capacity * 100 : 0)}%` }} className={assigned > capacity ? 'over-capacity' : ''} /></div><span>{assigned === capacity ? 'مكتمل' : assigned > capacity ? 'حصص زائدة' : 'غير مكتمل'}</span></div></td><td><div className="row-actions"><IconButton icon={Pencil} label={`تعديل ${schoolClass.name}`} onClick={() => { setForm(schoolClass); document.getElementById('class-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} className="delete-button" label={`حذف ${schoolClass.name}`} onClick={() => remove(schoolClass)} /></div></td></tr>;
      })}</tbody></table></div>}
      <NextFooter label="التالي: نصاب المعلمين" onNext={() => goTo('requirements')} />
    </Panel>
    {data.classes.length > 0 && !data.teachers.length && <div className="text-hint"><Users size={16} /><span>لا تنسَ إضافة المعلمين قبل توزيع الحصص.</span><button onClick={() => goTo('teachers')}>إضافة المعلمين<ArrowLeft size={14} /></button></div>}
  </div>;
}