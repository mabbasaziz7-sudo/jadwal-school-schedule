import { useState, type FormEvent } from 'react';
import { CalendarClock, CalendarOff, LockKeyhole, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react';
import { uid, type Booking, type PeriodLimit } from '../lib/data';
import { Button, EmptyState, Field, IconButton, InlineNotice, NextFooter, Panel, type WorkspaceProps } from './ui';

export function ExceptionsPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const [kind, setKind] = useState<'teacher' | 'class'>('teacher');
  const blank = () => ({ id: '', entityId: kind === 'teacher' ? data.teachers[0]?.id ?? '' : data.classes[0]?.id ?? '', dayId: data.days.find(day => day.enabled)?.id ?? '', period: 1 });
  const [form, setForm] = useState(blank);
  const days = data.days.filter(day => day.enabled);
  const entities = kind === 'teacher' ? data.teachers : data.classes;
  const ready = entities.length > 0 && days.length > 0;
  const periodCount = days.find(day => day.id === form.dayId)?.periods ?? 7;
  const entityName = (id: string) => entities.find(item => item.id === id)?.name ?? '';
  const switchKind = (value: 'teacher' | 'class') => {
    setKind(value);
    setForm({ id: '', entityId: value === 'teacher' ? data.teachers[0]?.id ?? '' : data.classes[0]?.id ?? '', dayId: days[0]?.id ?? '', period: 1 });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || !form.entityId || !form.dayId) return notify('أضف البيانات الأساسية وأيام الدوام أولاً.', 'error');
    const selectedDay = days.find(day => day.id === form.dayId);
    if (!selectedDay || form.period < 1 || form.period > selectedDay.periods) return notify('اختر يوماً مفعّلاً وحصة ضمن عدد حصص هذا اليوم.', 'error');
    if (kind === 'teacher') {
      if (data.teacherExceptions.some(item => item.id !== form.id && item.teacherId === form.entityId && item.dayId === form.dayId && item.period === form.period)) return notify('هذا الاستثناء مسجّل بالفعل.', 'error');
      const item = { id: form.id || uid(), teacherId: form.entityId, dayId: form.dayId, period: form.period };
      commit({ teacherExceptions: form.id ? data.teacherExceptions.map(existing => existing.id === form.id ? item : existing) : [...data.teacherExceptions, item] });
    } else {
      if (data.classExceptions.some(item => item.id !== form.id && item.classId === form.entityId && item.dayId === form.dayId)) return notify('يوجد انصراف مبكر لهذا الفصل في اليوم نفسه. عدّله من القائمة.', 'error');
      const item = { id: form.id || uid(), classId: form.entityId, dayId: form.dayId, fromPeriod: form.period };
      commit({ classExceptions: form.id ? data.classExceptions.map(existing => existing.id === form.id ? item : existing) : [...data.classExceptions, item] });
    }
    notify(form.id ? 'تم تحديث الاستثناء.' : 'تمت إضافة الاستثناء بنجاح.');
    setForm(blank());
  };
  const items = kind === 'teacher' ? data.teacherExceptions.map(item => ({ id: item.id, entityId: item.teacherId, dayId: item.dayId, period: item.period })) : data.classExceptions.map(item => ({ id: item.id, entityId: item.classId, dayId: item.dayId, period: item.fromPeriod }));

  return <div className="page-stack">
    <div className="section-intro"><div className="segmented-control"><button className={kind === 'teacher' ? 'selected' : ''} onClick={() => switchKind('teacher')}>استثناءات المعلمين</button><button className={kind === 'class' ? 'selected' : ''} onClick={() => switchKind('class')}>استثناءات الفصول</button></div><span className="optional-step">خطوة اختيارية</span></div>
    {!ready && <InlineNotice kind="warning">أضف {kind === 'teacher' ? 'المعلمين' : 'الفصول'} وفعّل أيام الدوام أولاً. <button className="text-link" onClick={() => goTo(!days.length ? 'days' : kind === 'teacher' ? 'teachers' : 'classes')}>إكمال الإعدادات</button></InlineNotice>}
    <Panel title={form.id ? 'تعديل الاستثناء' : kind === 'teacher' ? 'وقت غير متاح للمعلم' : 'انصراف مبكر لفصل'} description={kind === 'teacher' ? 'استثنِ حصة معينة عندما يكون المعلم غير متاح أو مرتبطاً بموعد آخر.' : 'تُستثنى الحصة المحددة وكل الحصص التي تليها في اليوم نفسه.'} icon={CalendarOff} id="exception-form">
      <form className="panel-form" onSubmit={submit}><fieldset disabled={!ready}><div className="form-grid three-columns"><Field label={kind === 'teacher' ? 'المعلم' : 'الفصل'}><select required value={form.entityId} onChange={event => setForm({ ...form, entityId: event.target.value })}><option value="" disabled>اختر {kind === 'teacher' ? 'المعلم' : 'الفصل'}</option>{entities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="اليوم"><select required value={form.dayId} onChange={event => { const day = days.find(item => item.id === event.target.value)!; setForm({ ...form, dayId: day.id, period: Math.min(form.period, day.periods) }); }}><option value="" disabled>اختر اليوم</option>{days.map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></Field><Field label={kind === 'teacher' ? 'الحصة' : 'ابتداءً من الحصة'}><select value={form.period} onChange={event => setForm({ ...form, period: Number(event.target.value) })}>{Array.from({ length: periodCount }, (_, index) => <option key={index + 1} value={index + 1}>الحصة {index + 1}</option>)}</select></Field></div><div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus} disabled={!ready}>{form.id ? 'حفظ التعديلات' : 'إضافة الاستثناء'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}</div></fieldset></form>
    </Panel>
    <Panel title="الاستثناءات المسجّلة" description={`${items.length} استثناء ${kind === 'teacher' ? 'للمعلمين' : 'للفصول'}`}>
      {!items.length ? <EmptyState compact icon={CalendarOff} title="لا توجد استثناءات حتى الآن" description="كل الأوقات متاحة. أضف استثناءً عند الحاجة، أو انتقل إلى الخطوة التالية." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>{kind === 'teacher' ? 'المعلم' : 'الفصل'}</th><th>اليوم</th><th>الحصة المستثناة</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{entityName(item.entityId)}</strong></td><td>{data.days.find(day => day.id === item.dayId)?.name}</td><td>{kind === 'teacher' ? `الحصة ${item.period}` : `من الحصة ${item.period} حتى نهاية اليوم`}</td><td><div className="row-actions"><IconButton icon={Pencil} label="تعديل الاستثناء" onClick={() => { setForm(item); document.getElementById('exception-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} label="حذف الاستثناء" className="delete-button" onClick={() => confirm('حذف الاستثناء؟', 'ستصبح هذه الحصص متاحة عند إعادة توليد الجدول.', () => { if (kind === 'teacher') commit({ teacherExceptions: data.teacherExceptions.filter(existing => existing.id !== item.id) }); else commit({ classExceptions: data.classExceptions.filter(existing => existing.id !== item.id) }); if (form.id === item.id) setForm(blank()); notify('تم حذف الاستثناء.'); }, true)} /></div></td></tr>)}</tbody></table></div>}
      <NextFooter label="التالي: حدود التكرار" onNext={() => goTo('limits')} />
    </Panel>
  </div>;
}

export function LimitsPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const maxPeriods = Math.max(1, ...data.days.filter(day => day.enabled).map(day => day.periods));
  const activeCount = data.days.filter(day => day.enabled).length;
  const blank = (): PeriodLimit => ({ id: '', teacherId: data.teachers[0]?.id ?? '', period: Math.min(7, maxPeriods), count: Math.min(2, activeCount) });
  const [form, setForm] = useState<PeriodLimit>(blank);
  const ready = data.teachers.length > 0 && activeCount > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.teacherId || !ready) return notify('أضف المعلمين وأيام الدوام أولاً.', 'error');
    if (form.period < 1 || form.period > maxPeriods || form.count < 0 || form.count > activeCount) return notify('اختر رقم حصة وتكراراً يتناسبان مع أيام الدوام الحالية.', 'error');
    if (data.limits.some(item => item.id !== form.id && item.teacherId === form.teacherId && item.period === form.period)) return notify('يوجد قيد لهذا المعلم ورقم الحصة. يمكنك تعديله من القائمة.', 'error');
    const limit = { ...form, id: form.id || uid() };
    commit({ limits: form.id ? data.limits.map(item => item.id === form.id ? limit : item) : [...data.limits, limit] });
    notify(form.id ? 'تم تحديث قيد التكرار.' : 'تمت إضافة قيد التكرار.');
    setForm(blank());
  };
  return <div className="page-stack">
    <InlineNotice>مثال: إسناد الحصة السابعة لمعلم مرتين بالضبط أسبوعياً، بغض النظر عن اليوم أو الفصل. هذه الخطوة اختيارية.</InlineNotice>
    {!ready && <InlineNotice kind="warning">أكمل بيانات المعلمين وأيام الدوام لتتمكن من إضافة القيود. <button className="text-link" onClick={() => goTo(!activeCount ? 'days' : 'teachers')}>إكمال الإعدادات</button></InlineNotice>}
    <Panel title={form.id ? 'تعديل عدد التكرار' : 'تكرار المعلم في حصة محددة'} description="حدّد عدد مرات ظهور المعلم في رقم حصة معين على مدار الأسبوع." icon={Repeat2} id="limit-form">
      <form className="panel-form" onSubmit={submit}><fieldset disabled={!ready}><div className="form-grid three-columns"><Field label="المعلم"><select required value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="" disabled>اختر المعلم</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field><Field label="رقم الحصة"><select value={form.period} onChange={event => setForm({ ...form, period: Number(event.target.value) })}>{Array.from({ length: maxPeriods }, (_, index) => <option key={index} value={index + 1}>الحصة {index + 1}</option>)}</select></Field><Field label="العدد الإلزامي أسبوعياً"><input required type="number" min={0} max={activeCount} value={form.count} onChange={event => setForm({ ...form, count: Number(event.target.value) })} /></Field></div><div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus} disabled={!ready}>{form.id ? 'حفظ التعديلات' : 'إضافة قيد التكرار'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}</div></fieldset></form>
    </Panel>
    <Panel title="قيود التكرار" description="يعرض ملخص الجدول تنبيهاً إذا تعذّر تحقيق أي عدد مطلوب.">
      {!data.limits.length ? <EmptyState compact icon={Repeat2} title="توزيع مرن بلا قيود إضافية" description="أضف قيود التكرار عند الحاجة، أو تابع إلى حجز الحصص." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المعلم</th><th>رقم الحصة</th><th>التكرار المطلوب</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{data.limits.map(item => <tr key={item.id}><td><strong>{data.teachers.find(teacher => teacher.id === item.teacherId)?.name}</strong></td><td>الحصة {item.period}</td><td>{item.count} مرات أسبوعياً</td><td><div className="row-actions"><IconButton icon={Pencil} label="تعديل قيد التكرار" onClick={() => { setForm(item); document.getElementById('limit-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} label="حذف قيد التكرار" className="delete-button" onClick={() => confirm('حذف قيد التكرار؟', 'سيصبح توزيع المعلم على هذا الرقم من الحصص مرناً.', () => { commit({ limits: data.limits.filter(limit => limit.id !== item.id) }); if (form.id === item.id) setForm(blank()); notify('تم حذف قيد التكرار.'); }, true)} /></div></td></tr>)}</tbody></table></div>}
      <NextFooter label="التالي: حجز الحصص" onNext={() => goTo('bookings')} />
    </Panel>
  </div>;
}

export function BookingsPage({ data, commit, notify, goTo, confirm }: WorkspaceProps) {
  const days = data.days.filter(day => day.enabled);
  const blank = (): Booking => ({ id: '', teacherId: data.teachers[0]?.id ?? '', classId: data.classes[0]?.id ?? '', dayId: days[0]?.id ?? '', period: 1, subject: '' });
  const [form, setForm] = useState<Booking>(blank);
  const ready = data.teachers.length > 0 && data.classes.length > 0 && days.length > 0;
  const periodCount = days.find(day => day.id === form.dayId)?.periods ?? 7;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || !form.teacherId || !form.classId || !form.dayId) return notify('اختر المعلم والفصل واليوم أولاً.', 'error');
    const selectedDay = days.find(day => day.id === form.dayId);
    if (!selectedDay || form.period < 1 || form.period > selectedDay.periods) return notify('اختر يوماً مفعّلاً وحصة ضمن عدد حصص هذا اليوم.', 'error');
    const teacher = data.teachers.find(item => item.id === form.teacherId)!;
    if (!teacher.days.includes(form.dayId)) return notify('المعلم غير متاح في هذا اليوم حسب إعدادات دوامه.', 'error');
    if (data.teacherExceptions.some(item => item.teacherId === form.teacherId && item.dayId === form.dayId && item.period === form.period)) return notify('هذه الحصة مستثناة من دوام المعلم.', 'error');
    if (data.classExceptions.some(item => item.classId === form.classId && item.dayId === form.dayId && form.period >= item.fromPeriod)) return notify('هذه الحصة تقع بعد وقت انصراف الفصل.', 'error');
    const existing = data.bookings.filter(item => item.id !== form.id);
    if (existing.some(item => item.dayId === form.dayId && item.period === form.period && (item.teacherId === form.teacherId || item.classId === form.classId))) return notify('يوجد حجز آخر للمعلم أو الفصل في الموعد نفسه.', 'error');
    const bookedPeriods = existing.filter(item => item.teacherId === form.teacherId && item.dayId === form.dayId).map(item => item.period);
    if (bookedPeriods.length >= teacher.maxDaily) return notify('هذا الحجز يتجاوز الحد الأقصى اليومي لحصص المعلم.', 'error');
    let consecutive = 1;
    for (let p = form.period - 1; bookedPeriods.includes(p); p--) consecutive++;
    for (let p = form.period + 1; bookedPeriods.includes(p); p++) consecutive++;
    if (consecutive > teacher.maxConsecutive) return notify('هذا الحجز يتجاوز عدد الحصص المتتالية المسموح به للمعلم.', 'error');
    const booking = { ...form, id: form.id || uid(), subject: form.subject.trim() };
    commit({ bookings: form.id ? data.bookings.map(item => item.id === form.id ? booking : item) : [...data.bookings, booking] });
    notify(form.id ? 'تم تحديث الحصة المحجوزة.' : 'تم حجز الحصة وتثبيت موعدها.');
    setForm(blank());
  };
  return <div className="page-stack">
    {!ready && <InlineNotice kind="warning">أضف المعلمين والفصول وفعّل أيام الدوام قبل حجز الحصص. <button className="text-link" onClick={() => goTo(!days.length ? 'days' : !data.teachers.length ? 'teachers' : 'classes')}>إكمال الإعدادات</button></InlineNotice>}
    <Panel title={form.id ? 'تعديل الحصة المحجوزة' : 'حجز حصة ثابتة'} description="ثبّت موعد حصة أو نشاط مسبقاً، وسيحافظ المولّد عليه عند توزيع بقية الحصص." icon={CalendarClock} id="booking-form">
      <form className="panel-form" onSubmit={submit}><fieldset disabled={!ready}><div className="form-grid two-columns"><Field label="المعلم"><select required value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="" disabled>اختر المعلم</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field><Field label="الفصل الدراسي"><select required value={form.classId} onChange={event => setForm({ ...form, classId: event.target.value })}><option value="" disabled>اختر الفصل</option>{data.classes.map(schoolClass => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></Field></div><div className="form-grid three-columns"><Field label="اليوم"><select required value={form.dayId} onChange={event => { const day = days.find(item => item.id === event.target.value)!; setForm({ ...form, dayId: day.id, period: Math.min(form.period, day.periods) }); }}><option value="" disabled>اختر اليوم</option>{days.map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></Field><Field label="الحصة"><select value={form.period} onChange={event => setForm({ ...form, period: Number(event.target.value) })}>{Array.from({ length: periodCount }, (_, index) => <option key={index} value={index + 1}>الحصة {index + 1}</option>)}</select></Field><Field label="المادة أو النشاط" optional><input maxLength={60} placeholder="مثال: نشاط مدرسي" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /></Field></div><div className="form-actions"><Button type="submit" icon={form.id ? Pencil : Plus} disabled={!ready}>{form.id ? 'حفظ التعديلات' : 'حجز الحصة'}</Button>{form.id && <Button variant="ghost" onClick={() => setForm(blank())}>إلغاء التعديل</Button>}<p className="form-help">تُحتسب الحصة المحجوزة ضمن نصاب المعلم إن كان مسجّلاً.</p></div></fieldset></form>
    </Panel>
    <Panel title="الحصص المحجوزة" description={`${data.bookings.length} حصة بموعد ثابت`}>
      {!data.bookings.length ? <EmptyState compact icon={LockKeyhole} title="المواعيد مرنة حتى الآن" description="ليس لديك حصص ثابتة؟ يمكنك الانتقال مباشرة إلى إنشاء الجدول." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>المعلم</th><th>الفصل</th><th>المادة</th><th>الموعد</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>{data.bookings.map(item => <tr key={item.id}><td><strong>{data.teachers.find(teacher => teacher.id === item.teacherId)?.name}</strong></td><td>{data.classes.find(schoolClass => schoolClass.id === item.classId)?.name}</td><td>{item.subject || <span className="muted">من النصاب</span>}</td><td><span className="booking-time"><LockKeyhole size={12} />{data.days.find(day => day.id === item.dayId)?.name}، حصة {item.period}</span></td><td><div className="row-actions"><IconButton icon={Pencil} label="تعديل الحصة المحجوزة" onClick={() => { setForm(item); document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' }); }} /><IconButton icon={Trash2} label="حذف الحجز" className="delete-button" onClick={() => confirm('إلغاء حجز الحصة؟', 'سيُعاد توزيع الحصة بصورة مرنة عند توليد الجدول التالي.', () => { commit({ bookings: data.bookings.filter(booking => booking.id !== item.id) }); if (form.id === item.id) setForm(blank()); notify('تم إلغاء حجز الحصة.'); }, true)} /></div></td></tr>)}</tbody></table></div>}
      <NextFooter label="التالي: إنشاء الجدول" onNext={() => goTo('schedule')} />
    </Panel>
  </div>;
}