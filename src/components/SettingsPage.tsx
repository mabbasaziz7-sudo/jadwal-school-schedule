import { useEffect, useState, type FormEvent } from 'react';
import { Boxes, Building2, Eye, GraduationCap, Landmark, Layers, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { KUWAIT_EDUCATION_ZONES, SCHOOL_STAGES, SEMESTERS, uid, type Section, type Supervisor } from '../lib/data';
import { Button, CheckboxList, EmptyState, Field, IconButton, Panel, Toggle, type WorkspaceProps } from './ui';

export default function SettingsPage({ data, commit, notify, confirm }: WorkspaceProps) {
  // --- School settings ------------------------------------------------
  const [school, setSchool] = useState({
    schoolName: data.schoolName,
    year: data.year,
    adminPassword: data.adminPassword || 'admin',
  });
  const saveSchool = (event: FormEvent) => {
    event.preventDefault();
    if (!school.schoolName.trim() || !school.year.trim()) return;
    commit({
      schoolName: school.schoolName.trim(),
      year: school.year.trim(),
      adminPassword: school.adminPassword.trim() || 'admin',
      schedule: data.schedule,
    });
    notify('تم حفظ إعدادات المدرسة وكلمة المرور.');
  };

  // --- Kuwait MOE fields (used on the official printed letterhead) --------
  const [official, setOfficial] = useState({
    educationZone: data.educationZone,
    stage: data.stage,
    semester: data.semester,
    schoolCode: data.schoolCode,
  });
  const saveOfficial = (event: FormEvent) => {
    event.preventDefault();
    commit({ ...official, schedule: data.schedule });
    notify('تم حفظ بيانات وزارة التربية الرسمية.');
  };
  const toggleOfficialHeader = () => commit({ showOfficialHeader: !data.showOfficialHeader, schedule: data.schedule });

  // --- Sections ---------------------------------------------------------
  const blankSection = (): Section => ({ id: '', name: '', classIds: [] });
  const [sectionForm, setSectionForm] = useState<Section>(blankSection);
  const submitSection = (event: FormEvent) => {
    event.preventDefault();
    if (!sectionForm.name.trim()) return notify('أدخل اسم القسم.', 'error');
    if (!sectionForm.classIds.length) return notify('اختر صفاً واحداً على الأقل لهذا القسم.', 'error');
    if (data.sections.some(item => item.id !== sectionForm.id && item.name === sectionForm.name.trim())) return notify('اسم القسم مستخدم بالفعل.', 'error');
    const id = sectionForm.id || uid();
    const section: Section = { ...sectionForm, id, name: sectionForm.name.trim() };
    commit({ sections: sectionForm.id ? data.sections.map(item => item.id === sectionForm.id ? section : item) : [...data.sections, section] });
    notify(sectionForm.id ? 'تم تحديث القسم.' : 'تمت إضافة القسم بنجاح.');
    setSectionForm(blankSection());
  };
  const removeSection = (section: Section) => {
    const assignedSupervisors = data.supervisors.filter(item => item.sectionId === section.id);
    confirm(
      `حذف قسم ${section.name}؟`,
      assignedSupervisors.length
        ? `سيتم أيضاً حذف ${assignedSupervisors.length} مشرف مُسند لهذا القسم (${assignedSupervisors.map(item => item.name).join('، ')}).`
        : 'لا يوجد مشرفون مسندون لهذا القسم حالياً.',
      () => {
        commit({
          sections: data.sections.filter(item => item.id !== section.id),
          supervisors: data.supervisors.filter(item => item.sectionId !== section.id),
        });
        if (sectionForm.id === section.id) setSectionForm(blankSection());
        notify('تم حذف القسم والمشرفين المرتبطين به.');
      },
      true
    );
  };

  // --- Supervisors --------------------------------------------------------
  const blankSupervisor = (): Supervisor => ({ id: '', name: '', sectionId: data.sections[0]?.id ?? '' });
  const [supervisorForm, setSupervisorForm] = useState<Supervisor>(blankSupervisor);
  // Sections can be created after this form already mounted with an empty sectionId (e.g. the "no sections yet" state
  // above); backfill it once a section becomes available instead of leaving the select stuck on a blank value.
  useEffect(() => {
    if (!supervisorForm.sectionId && data.sections.length) setSupervisorForm(previous => ({ ...previous, sectionId: data.sections[0].id }));
  }, [data.sections, supervisorForm.sectionId]);
  const submitSupervisor = (event: FormEvent) => {
    event.preventDefault();
    if (!supervisorForm.name.trim()) return notify('أدخل اسم المشرف.', 'error');
    if (!supervisorForm.sectionId) return notify('اختر القسم المُسند لهذا المشرف.', 'error');
    const id = supervisorForm.id || uid();
    const supervisor: Supervisor = { ...supervisorForm, id, name: supervisorForm.name.trim() };
    commit({ supervisors: supervisorForm.id ? data.supervisors.map(item => item.id === supervisorForm.id ? supervisor : item) : [...data.supervisors, supervisor] });
    notify(supervisorForm.id ? 'تم تحديث بيانات المشرف.' : 'تمت إضافة المشرف بنجاح.');
    setSupervisorForm(blankSupervisor());
  };
  const removeSupervisor = (supervisor: Supervisor) => confirm(`حذف ${supervisor.name}؟`, 'سيفقد هذا المشرف صلاحية الدخول لعرض قسمه.', () => {
    commit({ supervisors: data.supervisors.filter(item => item.id !== supervisor.id) });
    if (supervisorForm.id === supervisor.id) setSupervisorForm(blankSupervisor());
    notify('تم حذف المشرف.');
  }, true);
  const sectionName = (id: string) => data.sections.find(item => item.id === id)?.name ?? 'قسم محذوف';

  return <div className="page-stack">
    <Panel title="إعدادات المدرسة والحساب" description="اسم المدرسة، العام الدراسي، وكلمة مرور دخول المسؤول." icon={Building2}>
      <form onSubmit={saveSchool} className="panel-form">
        <div className="form-grid two-columns">
          <Field label="اسم المدرسة">
            <input required maxLength={80} value={school.schoolName} onChange={event => setSchool({ ...school, schoolName: event.target.value })} placeholder="اسم مدرستك" />
          </Field>
          <Field label="العام الدراسي">
            <input required maxLength={30} value={school.year} onChange={event => setSchool({ ...school, year: event.target.value })} placeholder="2025 - 2026" />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="كلمة مرور المسؤول" hint="تُستخدم لتسجيل الدخول في صفحة الإدارة (الافتراضية: admin)">
            <input required maxLength={40} type="text" value={school.adminPassword} onChange={event => setSchool({ ...school, adminPassword: event.target.value })} placeholder="admin" />
          </Field>
        </div>
        <div className="form-actions"><Button type="submit">حفظ إعدادات المدرسة</Button></div>
      </form>
    </Panel>

    <Panel title="بيانات وزارة التربية الرسمية" description="تظهر هذه البيانات في ترويسة الجدول عند الطباعة، بما يطابق النموذج الرسمي لوزارة التربية الكويتية." icon={Landmark}>
      <form onSubmit={saveOfficial} className="panel-form">
        <div className="form-grid two-columns">
          <Field label="المنطقة التعليمية">
            <select value={official.educationZone} onChange={event => setOfficial({ ...official, educationZone: event.target.value })}>
              <option value="">بدون تحديد</option>
              {KUWAIT_EDUCATION_ZONES.map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </Field>
          <Field label="المرحلة الدراسية">
            <select value={official.stage} onChange={event => setOfficial({ ...official, stage: event.target.value })}>
              {SCHOOL_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-grid two-columns">
          <Field label="الفصل الدراسي">
            <select value={official.semester} onChange={event => setOfficial({ ...official, semester: event.target.value })}>
              {SEMESTERS.map(semester => <option key={semester} value={semester}>{semester}</option>)}
            </select>
          </Field>
          <Field label="الرقم الوزاري للمدرسة" optional>
            <input maxLength={30} value={official.schoolCode} onChange={event => setOfficial({ ...official, schoolCode: event.target.value })} placeholder="مثال: 12345" />
          </Field>
        </div>
        <div className="form-actions"><Button type="submit">حفظ البيانات الرسمية</Button></div>
      </form>
      <div className="official-header-toggle-row">
        <div>
          <strong>إظهار الترويسة الرسمية عند الطباعة</strong>
          <p>تُضاف تلقائياً أعلى كل جدول مطبوع (للصف، المعلم، أو المشرف). عطّلها إن كانت مدرستك خارج نظام وزارة التربية الكويتية.</p>
        </div>
        <Toggle checked={data.showOfficialHeader} onChange={toggleOfficialHeader} label="إظهار الترويسة الرسمية عند الطباعة" />
      </div>
    </Panel>

    <Panel title={sectionForm.id ? 'تعديل القسم' : 'إضافة قسم دراسي'} description="اجمع مجموعة من الصفوف في قسم واحد لإسناده لمشرف يطّلع عليه فقط." icon={Layers} id="section-form">
      <form className="panel-form" onSubmit={submitSection}>
        <div className="form-grid">
          <Field label="اسم القسم"><input required maxLength={80} placeholder="مثال: المرحلة الابتدائية" value={sectionForm.name} onChange={event => setSectionForm({ ...sectionForm, name: event.target.value })} /></Field>
        </div>
        <div className="field">
          <span className="field-label">الصفوف الدراسية ضمن هذا القسم</span>
          <CheckboxList
            items={data.classes.map(item => ({ id: item.id, label: item.name }))}
            selected={sectionForm.classIds}
            onChange={classIds => setSectionForm({ ...sectionForm, classIds })}
            emptyLabel="أضف صفوفاً دراسية أولاً من صفحة الصفوف الدراسية."
          />
        </div>
        <div className="form-actions">
          <Button type="submit" icon={sectionForm.id ? Pencil : Plus} disabled={!data.classes.length}>{sectionForm.id ? 'حفظ التعديلات' : 'إضافة القسم'}</Button>
          {sectionForm.id && <Button variant="ghost" onClick={() => setSectionForm(blankSection())}>إلغاء التعديل</Button>}
        </div>
      </form>
    </Panel>

    <Panel title="الأقسام الدراسية" description={`${data.sections.length} قسم مُعرّف`}>
      {!data.sections.length ? <EmptyState compact icon={Layers} title="لا توجد أقسام بعد" description="أنشئ أول قسم من النموذج أعلاه، ثم أسند له مشرفاً يطّلع على صفوفه فقط." /> : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>القسم</th><th>عدد الصفوف</th><th>الصفوف</th><th>المشرفون</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>
          {data.sections.map(section => {
            const supervisorsHere = data.supervisors.filter(item => item.sectionId === section.id);
            return <tr key={section.id}>
              <td><div className="person-cell"><span className="class-icon"><Boxes size={18} /></span><strong>{section.name}</strong></div></td>
              <td><strong className="numeric">{section.classIds.length}</strong></td>
              <td><span className="small-text">{section.classIds.map(id => data.classes.find(item => item.id === id)?.name).filter(Boolean).join('، ') || 'لا توجد صفوف'}</span></td>
              <td><span className="small-text">{supervisorsHere.length ? supervisorsHere.map(item => item.name).join('، ') : 'لا يوجد مشرف'}</span></td>
              <td><div className="row-actions">
                <IconButton icon={Pencil} label={`تعديل ${section.name}`} onClick={() => { setSectionForm({ ...section, classIds: [...section.classIds] }); document.getElementById('section-form')?.scrollIntoView({ behavior: 'smooth' }); }} />
                <IconButton icon={Trash2} className="delete-button" label={`حذف ${section.name}`} onClick={() => removeSection(section)} />
              </div></td>
            </tr>;
          })}
        </tbody></table></div>
      )}
    </Panel>

    <Panel title={supervisorForm.id ? 'تعديل مشرف القسم' : 'إسناد مشرف قسم'} description="يدخل المشرف باختيار اسمه فقط، ويرى صفوف قسمه وجدولها بصلاحية عرض دون تعديل." icon={Eye} id="supervisor-form">
      {!data.sections.length ? <EmptyState compact icon={ShieldCheck} title="أنشئ قسماً أولاً" description="أضف قسماً دراسياً واحداً على الأقل قبل إسناد مشرف له." /> : (
        <form className="panel-form" onSubmit={submitSupervisor}>
          <div className="form-grid two-columns">
            <Field label="اسم المشرف"><input required maxLength={80} placeholder="مثال: خالد الزهراني" value={supervisorForm.name} onChange={event => setSupervisorForm({ ...supervisorForm, name: event.target.value })} /></Field>
            <Field label="القسم المُسند">
              <select required value={supervisorForm.sectionId} onChange={event => setSupervisorForm({ ...supervisorForm, sectionId: event.target.value })}>
                <option value="" disabled>اختر القسم</option>
                {data.sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-actions">
            <Button type="submit" icon={supervisorForm.id ? Pencil : Plus}>{supervisorForm.id ? 'حفظ التعديلات' : 'إسناد المشرف'}</Button>
            {supervisorForm.id && <Button variant="ghost" onClick={() => setSupervisorForm(blankSupervisor())}>إلغاء التعديل</Button>}
          </div>
        </form>
      )}
    </Panel>

    <Panel title="مشرفو الأقسام" description={`${data.supervisors.length} مشرف بصلاحية عرض`}>
      {!data.supervisors.length ? <EmptyState compact icon={Eye} title="لا يوجد مشرفون بعد" description="أسند أول مشرف من النموذج أعلاه بعد إنشاء الأقسام." /> : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>المشرف</th><th>القسم المُسند</th><th>الصلاحية</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>
          {data.supervisors.map((supervisor, index) => <tr key={supervisor.id}>
            <td><div className="person-cell"><span className={`person-avatar color-${index % 6}`}>{supervisor.name.charAt(0)}</span><strong>{supervisor.name}</strong></div></td>
            <td>{sectionName(supervisor.sectionId)}</td>
            <td><span className="permission-pill"><Eye size={12} />عرض فقط</span></td>
            <td><div className="row-actions">
              <IconButton icon={Pencil} label={`تعديل ${supervisor.name}`} onClick={() => { setSupervisorForm(supervisor); document.getElementById('supervisor-form')?.scrollIntoView({ behavior: 'smooth' }); }} />
              <IconButton icon={Trash2} className="delete-button" label={`حذف ${supervisor.name}`} onClick={() => removeSupervisor(supervisor)} />
            </div></td>
          </tr>)}
        </tbody></table></div>
      )}
    </Panel>

    {!data.classes.length && (
      <div className="text-hint"><GraduationCap size={16} /><span>أضف صفوفاً دراسية أولاً لتتمكن من تكوين الأقسام.</span></div>
    )}
  </div>;
}
