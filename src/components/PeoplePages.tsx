import { useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, BookText, Eye, EyeOff, GraduationCap, Layers, Lock, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { classCapacity, uid, type Grade, type SchoolClass, type Subject, type Teacher } from '../lib/data';
import { Button, DayCheckboxes, EmptyState, Field, IconButton, NextFooter, Panel, type WorkspaceProps } from './ui';

export function TeachersPage({ data, commit, notify, goTo, confirm, onViewTeacher }: WorkspaceProps) {
  const blank = (): Teacher => ({ id: '', name: '', code: '', minDaily: 0, maxDaily: 7, maxConsecutive: 3, days: data.days.filter(day => day.enabled).map(day => day.id), password: '' });
  const [form, setForm] = useState<Teacher>(blank);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const set = <K extends keyof Teacher>(key: K, value: Teacher[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return notify('أدخل اسم المعلم.', 'error');
    if (form.minDaily > form.maxDaily) return notify('الحد الأدنى للحصص يجب ألا يتجاوز الحد الأقصى.', 'error');
    if (!form.days.some(id => data.days.some(day => day.id === id && day.enabled))) return notify('اختر يوم دوام واحداً على الأقل للمعلم.', 'error');
    if (form.code.trim() && data.teachers.some(teacher => teacher.id !== form.id && teacher.code.toLowerCase() === form.code.trim().toLowerCase())) return notify('رمز المعلم مستخدم بالفعل. اختر رمزاً مختلفاً.', 'error');
    if (!form.id && data.teachers.length >= 100) return notify('الحد المدعوم هو 100 معلم.', 'error');
    const id = form.id || uid();
    const teacher: Teacher = { ...form, id, name: form.name.trim(), code: form.code.trim() || `T-${id.slice(0, 5).toUpperCase()}`, password: form.password?.trim() || '' };
    commit({ teachers: form.id ? data.teachers.map(item => item.id === form.id ? teacher : item) : [...data.teachers, teacher] });
    notify(form.id ? 'تم تحديث بيانات المعلم.' : 'تمت إضافة المعلم بنجاح.');
    setForm(blank());
    setShowPassword(false);
  };
  const remove = (teacher: Teacher) => confirm(`حذف ${teacher.name}؟`, 'سيتم حذف المعلم وجميع الأنصبة والاستثناءات والحجوزات المرتبطة به. لا يمكن التراجع عن هذه الخطوة.', () => {
    commit({
      teachers: data.teachers.filter(item => item.id !== teacher.id),
      requirements: data.requirements.filter(item => item.teacherId !== teacher.id),
      teacherExceptions: data.teacherExceptions.filter(item => item.teacherId !== teacher.id),
      limits: data.limits.filter(item => item.teacherId !== teacher.id),
      bookings: data.bookings.filter(item => item.teacherId !== teacher.id),
      attachments: data.attachments.filter(item => !(item.targetType === 'teacher' && item.targetId === teacher.id)),
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
        <div className="form-grid two-columns">
          <Field label="كلمة مرور المعلم" optional hint="اتركها فارغة للسماح بالدخول باختيار الاسم فقط دون كلمة مرور، كما هو معتاد.">
            <div className="password-input-wrap">
              <input type={showPassword ? 'text' : 'password'} maxLength={100} placeholder="بدون كلمة مرور" value={form.password ?? ''} onChange={event => set('password', event.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        </div>
        <div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة المعلم'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}<p className="form-help">يعمل في أكثر من مدرسة؟ اختر أيام تواجده هنا فقط.</p></div>
      </form>
    </Panel>
    <Panel title="قائمة المعلمين" description={`${data.teachers.length} معلم في فريقك التعليمي`} action={data.teachers.length > 0 && <div className="search-input"><Search size={16} /><input placeholder="ابحث عن معلم..." aria-label="البحث عن معلم" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
      {data.teachers.length === 0 ? <EmptyState compact icon={Users} title="فريقك التعليمي يبدأ من هنا" description="أضف أول معلم باستخدام النموذج أعلاه، وسنرتّب بقية التفاصيل معاً." /> : filtered.length === 0 ? <EmptyState compact title="لا توجد نتائج" description="جرّب البحث باسم أو رمز مختلف." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المعلم</th><th>الرمز</th><th>أيام الدوام</th><th>النصاب الأسبوعي</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map((teacher, index) => <tr key={teacher.id}>
        <td><div className="person-cell"><span className={`person-avatar color-${index % 6}`}>{teacher.name.charAt(0)}</span><strong>{teacher.name}</strong>{teacher.password && <Lock size={13} className="muted" aria-label="محمي بكلمة مرور" />}</div></td><td><span className="latin muted">{teacher.code}</span></td><td><span className="small-text">{data.days.filter(day => day.enabled && teacher.days.includes(day.id)).map(day => day.short).join('، ') || 'لا توجد أيام مفعّلة'}</span></td><td><strong className="numeric">{data.requirements.filter(item => item.teacherId === teacher.id).reduce((sum, item) => sum + item.count, 0)}</strong><span className="muted small-text"> حصة</span></td><td><div className="row-actions">{onViewTeacher && <IconButton icon={Eye} label={`عرض جدول ${teacher.name} كمعلم`} onClick={() => onViewTeacher(teacher.id)} />}<IconButton icon={Pencil} label={`تعديل ${teacher.name}`} onClick={() => { setForm({ ...teacher, days: [...teacher.days] }); setShowPassword(false); document.getElementById('teacher-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} /><IconButton icon={Trash2} label={`حذف ${teacher.name}`} className="delete-button" onClick={() => remove(teacher)} /></div></td>
      </tr>)}</tbody></table></div>}
      <NextFooter label="التالي: الصفوف" onNext={() => goTo('classes')} />
    </Panel>
  </div>;
}

export function ClassesPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  // --- Grades (الصفوف الدراسية) — e.g. "العاشر"، تحتوي عدة فصول ---
  const blankGrade = (): Grade => ({ id: '', name: '' });
  const [gradeForm, setGradeForm] = useState<Grade>(blankGrade);
  const submitGrade = (event: FormEvent) => {
    event.preventDefault();
    if (!gradeForm.name.trim()) return notify('أدخل اسم الصف الدراسي.', 'error');
    if (data.grades.some(item => item.id !== gradeForm.id && item.name === gradeForm.name.trim())) return notify('اسم الصف الدراسي مستخدم بالفعل.', 'error');
    const id = gradeForm.id || uid();
    const grade: Grade = { id, name: gradeForm.name.trim() };
    commit({ grades: gradeForm.id ? data.grades.map(item => item.id === gradeForm.id ? grade : item) : [...data.grades, grade] });
    notify(gradeForm.id ? 'تم تحديث الصف الدراسي.' : 'تمت إضافة الصف الدراسي بنجاح.');
    setGradeForm(blankGrade());
  };
  const removeGrade = (grade: Grade) => {
    const affected = data.classes.filter(item => item.gradeId === grade.id).length;
    confirm(`حذف الصف الدراسي ${grade.name}؟`, affected ? `سيصبح ${affected} فصلاً دراسياً بلا تصنيف صف، ويمكنك إسنادها لصف آخر لاحقاً.` : 'لا توجد فصول مرتبطة بهذا الصف حالياً.', () => {
      commit({ grades: data.grades.filter(item => item.id !== grade.id), classes: data.classes.map(item => item.gradeId === grade.id ? { ...item, gradeId: '' } : item) });
      if (gradeForm.id === grade.id) setGradeForm(blankGrade());
      notify('تم حذف الصف الدراسي.');
    }, true);
  };

  // --- Class sections (الفصول الدراسية) — e.g. "العاشر - 1" ---
  const blankClass = (): SchoolClass => ({ id: '', name: '', code: '', gradeId: data.grades[0]?.id ?? '' });
  const [form, setForm] = useState<SchoolClass>(blankClass);
  const [search, setSearch] = useState('');
  const reset = () => setForm(blankClass());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return notify('أدخل اسم الفصل.', 'error');
    if (data.classes.some(item => item.id !== form.id && (item.name === form.name.trim() || (form.code.trim() && item.code.toLowerCase() === form.code.trim().toLowerCase())))) return notify('اسم الفصل أو رمزه مستخدم بالفعل.', 'error');
    if (!form.id && data.classes.length >= 40) return notify('الحد المدعوم هو 40 فصلاً.', 'error');
    const id = form.id || uid();
    const schoolClass = { ...form, id, name: form.name.trim(), code: form.code.trim() || `C-${id.slice(0, 5).toUpperCase()}` };
    commit({ classes: form.id ? data.classes.map(item => item.id === form.id ? schoolClass : item) : [...data.classes, schoolClass] });
    notify(form.id ? 'تم تحديث بيانات الفصل.' : 'تمت إضافة الفصل بنجاح.');
    reset();
  };
  const remove = (schoolClass: SchoolClass) => confirm(`حذف الفصل ${schoolClass.name}؟`, 'ستُحذف أيضاً أنصبة الحصص والاستثناءات والحجوزات المرتبطة بهذا الفصل، وتُزال من أي قسم أو جناح يضمّه.', () => {
    commit({
      classes: data.classes.filter(item => item.id !== schoolClass.id),
      requirements: data.requirements.filter(item => item.classId !== schoolClass.id),
      classExceptions: data.classExceptions.filter(item => item.classId !== schoolClass.id),
      bookings: data.bookings.filter(item => item.classId !== schoolClass.id),
      sections: data.sections.map(section => ({ ...section, classIds: section.classIds.filter(id => id !== schoolClass.id) })),
      wings: data.wings.map(wing => ({ ...wing, classIds: wing.classIds.filter(id => id !== schoolClass.id) })),
      attachments: data.attachments.filter(item => !(item.targetType === 'class' && item.targetId === schoolClass.id)),
    });
    if (form.id === schoolClass.id) reset();
    notify('تم حذف الفصل والبيانات المرتبطة به.');
  }, true);
  const gradeName = (gradeId: string) => data.grades.find(item => item.id === gradeId)?.name || 'بلا تصنيف';
  const filtered = data.classes.filter(item => `${item.name} ${item.code} ${gradeName(item.gradeId)}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="page-stack">
    <Panel title={gradeForm.id ? 'تعديل الصف الدراسي' : 'إضافة صف دراسي'} description="مثال: العاشر، الحادي عشر، الثاني عشر. أضف كل صف مرة واحدة، ثم أضف فصوله (شُعبه) أدناه." icon={Layers} id="grade-form">
      <form className="panel-form" onSubmit={submitGrade}>
        <div className="form-grid two-columns">
          <Field label="اسم الصف الدراسي"><input required maxLength={40} placeholder="مثال: العاشر" value={gradeForm.name} onChange={event => setGradeForm({ ...gradeForm, name: event.target.value })} /></Field>
        </div>
        <div className="form-actions"><Button type="submit" icon={gradeForm.id ? Pencil : Plus}>{gradeForm.id ? 'حفظ التعديلات' : 'إضافة الصف الدراسي'}</Button>{gradeForm.id && <Button variant="ghost" onClick={() => setGradeForm(blankGrade())}>إلغاء التعديل</Button>}</div>
      </form>
      {data.grades.length > 0 && <div className="grade-chip-list">{data.grades.map(grade => (
        <span className="grade-chip" key={grade.id}>
          {grade.name}
          <small>{data.classes.filter(item => item.gradeId === grade.id).length} فصل</small>
          <button type="button" onClick={() => setGradeForm(grade)} aria-label={`تعديل ${grade.name}`}><Pencil size={11} /></button>
          <button type="button" onClick={() => removeGrade(grade)} aria-label={`حذف ${grade.name}`}><Trash2 size={11} /></button>
        </span>
      ))}</div>}
    </Panel>

    <Panel title={form.id ? 'تعديل بيانات الفصل' : 'إضافة فصل دراسي'} description="أضف الفصول (الشُعب) داخل كل صف دراسي، مثل «العاشر - 1»." icon={GraduationCap} id="class-form">
      <form className="panel-form" onSubmit={submit}>
        <div className="form-grid two-columns"><Field label="اسم الفصل"><input required maxLength={80} placeholder="مثال: العاشر - 1" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field><Field label="رمز الفصل" optional><input maxLength={20} placeholder="مثال: C01" value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></Field></div>
        <div className="form-grid"><Field label="الصف الدراسي" optional hint={!data.grades.length ? 'أضف صفاً دراسياً أعلاه لتتمكن من التصنيف.' : undefined}><select value={form.gradeId} onChange={event => setForm({ ...form, gradeId: event.target.value })} disabled={!data.grades.length}><option value="">بلا تصنيف</option>{data.grades.map(grade => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></Field></div>
        <div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة الفصل'}</Button>{form.id && <Button variant="ghost" onClick={reset}>إلغاء التعديل</Button>}</div>
      </form>
    </Panel>
    <Panel title="الفصول الدراسية" description={`${data.classes.length} فصل في مدرستك`} action={data.classes.length > 0 && <div className="search-input"><Search size={16} /><input placeholder="ابحث عن فصل..." aria-label="البحث عن فصل" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
      {!data.classes.length ? <EmptyState compact icon={GraduationCap} title="مساحة لكل فصل" description="أضف الفصول الدراسية، ثم خصّص نصاب المعلمين لكل فصل في الخطوة التالية." /> : !filtered.length ? <EmptyState compact title="لا توجد نتائج" description="جرّب البحث باسم فصل مختلف." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>الفصل الدراسي</th><th>الصف الدراسي</th><th>رمز الفصل</th><th>الحصص المخصصة</th><th>تغطية الأسبوع</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map(schoolClass => {
        const assigned = data.requirements.filter(item => item.classId === schoolClass.id).reduce((sum, item) => sum + item.count, 0);
        const capacity = classCapacity(data, schoolClass.id);
        return <tr key={schoolClass.id}><td><div className="person-cell"><span className="class-icon"><BookOpen size={18} /></span><strong>{schoolClass.name}</strong></div></td><td><span className="small-text">{gradeName(schoolClass.gradeId)}</span></td><td className="latin muted">{schoolClass.code}</td><td><strong className="numeric">{assigned}</strong><span className="muted"> / {capacity}</span></td><td><div className="coverage-inline"><div className="progress-track"><div style={{ width: `${Math.min(100, capacity ? assigned / capacity * 100 : 0)}%` }} className={assigned > capacity ? 'over-capacity' : ''} /></div><span>{assigned === capacity ? 'مكتمل' : assigned > capacity ? 'حصص زائدة' : 'غير مكتمل'}</span></div></td><td><div className="row-actions"><IconButton icon={Pencil} label={`تعديل ${schoolClass.name}`} onClick={() => { setForm(schoolClass); document.getElementById('class-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} className="delete-button" label={`حذف ${schoolClass.name}`} onClick={() => remove(schoolClass)} /></div></td></tr>;
      })}</tbody></table></div>}
      <NextFooter label="التالي: المواد الدراسية" onNext={() => goTo('subjects')} />
    </Panel>
    {data.classes.length > 0 && !data.teachers.length && <div className="text-hint"><Users size={16} /><span>لا تنسَ إضافة المعلمين قبل توزيع الحصص.</span><button onClick={() => goTo('teachers')}>إضافة المعلمين<ArrowLeft size={14} /></button></div>}
  </div>;
}

export function SubjectsPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const blank = (): Subject => ({ id: '', name: '' });
  const [form, setForm] = useState<Subject>(blank);
  const [search, setSearch] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return notify('أدخل اسم المادة الدراسية.', 'error');
    if (data.subjects.some(item => item.id !== form.id && item.name.toLowerCase() === name.toLowerCase())) return notify('هذه المادة مضافة بالفعل.', 'error');
    if (!form.id && data.subjects.length >= 300) return notify('الحد المدعوم هو 300 مادة دراسية.', 'error');
    const id = form.id || uid();
    const subject: Subject = { id, name };
    commit({ subjects: form.id ? data.subjects.map(item => item.id === form.id ? subject : item) : [...data.subjects, subject] });
    notify(form.id ? 'تم تحديث المادة الدراسية.' : 'تمت إضافة المادة الدراسية بنجاح.');
    setForm(blank());
  };
  const usageCount = (subject: Subject) => data.requirements.filter(item => item.subject.trim().toLowerCase() === subject.name.trim().toLowerCase()).length;
  const remove = (subject: Subject) => {
    const usage = usageCount(subject);
    confirm(`حذف مادة ${subject.name}؟`, usage ? `تُستخدم هذه المادة في ${usage} نصاب حصص حالياً — لن يتأثر ذلك النصاب، لكن المادة لن تظهر ضمن الاقتراحات بعد الآن.` : 'لا يوجد نصاب حصص مرتبط بهذه المادة حالياً.', () => {
      commit({ subjects: data.subjects.filter(item => item.id !== subject.id) });
      if (form.id === subject.id) setForm(blank());
      notify('تم حذف المادة الدراسية.');
    }, true);
  };
  const filtered = data.subjects.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return <div className="page-stack">
    <Panel title={form.id ? 'تعديل مادة دراسية' : 'إضافة مادة دراسية'} description="سجّل المواد التي تُدرَّس في مدرستك لتظهر كاقتراحات جاهزة عند إدخال نصاب الحصص." icon={BookText} id="subject-form">
      <form className="panel-form" onSubmit={submit}>
        <div className="form-grid two-columns"><Field label="اسم المادة"><input required maxLength={60} placeholder="مثال: الرياضيات" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field></div>
        <div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus}>{form.id ? 'حفظ التعديلات' : 'إضافة المادة'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}</div>
      </form>
    </Panel>
    <Panel title="المواد الدراسية" description={`${data.subjects.length} مادة مسجّلة في مدرستك`} action={data.subjects.length > 0 && <div className="search-input"><Search size={16} /><input placeholder="ابحث عن مادة..." aria-label="البحث عن مادة" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
      {!data.subjects.length ? <EmptyState compact icon={BookText} title="أضف موادك الدراسية" description="سجّل المواد هنا لتظهر كاقتراحات سريعة عند إدخال نصاب الحصص، بدلاً من كتابتها يدوياً كل مرة." /> : !filtered.length ? <EmptyState compact title="لا توجد نتائج" description="جرّب البحث باسم مادة مختلف." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المادة الدراسية</th><th>عدد الأنصبة المرتبطة</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{filtered.map(subject => (
        <tr key={subject.id}><td><div className="person-cell"><span className="class-icon"><BookText size={18} /></span><strong>{subject.name}</strong></div></td><td><strong className="numeric">{usageCount(subject)}</strong></td><td><div className="row-actions"><IconButton icon={Pencil} label={`تعديل ${subject.name}`} onClick={() => { setForm(subject); document.getElementById('subject-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} className="delete-button" label={`حذف ${subject.name}`} onClick={() => remove(subject)} /></div></td></tr>
      ))}</tbody></table></div>}
      <NextFooter label="التالي: نصاب المعلمين" onNext={() => goTo('requirements')} />
    </Panel>
  </div>;
}