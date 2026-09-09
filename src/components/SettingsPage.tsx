import { useEffect, useState, type FormEvent } from 'react';
import { Boxes, Building2, Eye, GraduationCap, KeyRound, Landmark, Layers, Pencil, Plus, ShieldCheck, ShieldQuestion, Trash2, UserCog, Wind } from 'lucide-react';
import {
  KUWAIT_EDUCATION_ZONES,
  PERMISSION_RESOURCES,
  SCHOOL_STAGES,
  SEMESTERS,
  STAFF_TITLE_PRESETS,
  uid,
  type PermissionLevel,
  type PermissionMap,
  type Section,
  type StaffAccount,
  type Supervisor,
  type Wing,
} from '../lib/data';
import { Button, CheckboxList, EmptyState, Field, IconButton, Panel, Toggle, type WorkspaceProps } from './ui';

interface SettingsPageProps extends WorkspaceProps {
  /** True for a staff account with only "view" access here: hides the admin password value so a viewer can't read it off a disabled field. */
  readOnly?: boolean;
}

export default function SettingsPage({ data, commit, notify, confirm, readOnly = false }: SettingsPageProps) {
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

  // --- Wings (الأجنحة) — an existing teacher additionally follows up on a group of classes ---
  const blankWing = (): Wing => ({ id: '', name: '', classIds: [], teacherId: data.teachers[0]?.id ?? '' });
  const [wingForm, setWingForm] = useState<Wing>(blankWing);
  useEffect(() => {
    if (!wingForm.teacherId && data.teachers.length) setWingForm(previous => ({ ...previous, teacherId: data.teachers[0].id }));
  }, [data.teachers, wingForm.teacherId]);
  const submitWing = (event: FormEvent) => {
    event.preventDefault();
    if (!wingForm.name.trim()) return notify('أدخل اسم الجناح.', 'error');
    if (!wingForm.classIds.length) return notify('اختر فصلاً واحداً على الأقل لهذا الجناح.', 'error');
    if (!wingForm.teacherId) return notify('اختر المعلم المسؤول عن متابعة هذا الجناح.', 'error');
    if (data.wings.some(item => item.id !== wingForm.id && item.name === wingForm.name.trim())) return notify('اسم الجناح مستخدم بالفعل.', 'error');
    const id = wingForm.id || uid();
    const wing: Wing = { ...wingForm, id, name: wingForm.name.trim() };
    commit({ wings: wingForm.id ? data.wings.map(item => item.id === wingForm.id ? wing : item) : [...data.wings, wing] });
    notify(wingForm.id ? 'تم تحديث الجناح.' : 'تمت إضافة الجناح بنجاح.');
    setWingForm(blankWing());
  };
  const removeWing = (wing: Wing) => confirm(`حذف جناح ${wing.name}؟`, 'سيفقد المعلم المسؤول صلاحية متابعة فصول هذا الجناح.', () => {
    commit({ wings: data.wings.filter(item => item.id !== wing.id) });
    if (wingForm.id === wing.id) setWingForm(blankWing());
    notify('تم حذف الجناح.');
  }, true);

  // --- Staff accounts (حسابات الموظفين) with a full per-page permission matrix ---
  const blankStaff = (): StaffAccount => ({ id: '', name: '', title: STAFF_TITLE_PRESETS[2].title, username: '', password: '', permissions: { ...STAFF_TITLE_PRESETS[2].permissions } });
  const [staffForm, setStaffForm] = useState<StaffAccount>(blankStaff);
  const applyPreset = (title: string) => {
    const preset = STAFF_TITLE_PRESETS.find(item => item.title === title);
    setStaffForm(previous => ({ ...previous, title, permissions: preset ? { ...preset.permissions } : previous.permissions }));
  };
  const setPermission = (resource: keyof PermissionMap, level: PermissionLevel) => setStaffForm(previous => ({ ...previous, permissions: { ...previous.permissions, [resource]: level } }));
  const submitStaff = (event: FormEvent) => {
    event.preventDefault();
    if (!staffForm.name.trim()) return notify('أدخل اسم الموظف.', 'error');
    if (!staffForm.username.trim()) return notify('أدخل اسم مستخدم لتسجيل الدخول.', 'error');
    if (staffForm.username.trim().toLowerCase() === 'admin') return notify('اسم المستخدم "admin" محجوز لحساب المسؤول.', 'error');
    if (!staffForm.password.trim() || staffForm.password.trim().length < 4) return notify('كلمة المرور يجب ألا تقل عن 4 أحرف.', 'error');
    if (data.staffAccounts.some(item => item.id !== staffForm.id && item.username.toLowerCase() === staffForm.username.trim().toLowerCase())) return notify('اسم المستخدم مستخدم بالفعل.', 'error');
    const id = staffForm.id || uid();
    const account: StaffAccount = { ...staffForm, id, name: staffForm.name.trim(), username: staffForm.username.trim(), password: staffForm.password.trim() };
    commit({ staffAccounts: staffForm.id ? data.staffAccounts.map(item => item.id === staffForm.id ? account : item) : [...data.staffAccounts, account] });
    notify(staffForm.id ? 'تم تحديث بيانات الموظف وصلاحياته.' : 'تمت إضافة حساب الموظف بنجاح.');
    setStaffForm(blankStaff());
  };
  const removeStaff = (account: StaffAccount) => confirm(`حذف حساب ${account.name}؟`, 'سيفقد هذا الموظف صلاحية الدخول فوراً.', () => {
    commit({ staffAccounts: data.staffAccounts.filter(item => item.id !== account.id) });
    if (staffForm.id === account.id) setStaffForm(blankStaff());
    notify('تم حذف حساب الموظف.');
  }, true);
  const permissionLabel: Record<PermissionLevel, string> = { none: 'بلا صلاحية', view: 'عرض فقط', edit: 'عرض وتعديل' };

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
        {!readOnly && (
          <div className="form-grid">
            <Field label="كلمة مرور المسؤول" hint="تُستخدم لتسجيل الدخول في صفحة الإدارة (الافتراضية: admin)">
              <input required maxLength={40} type="text" value={school.adminPassword} onChange={event => setSchool({ ...school, adminPassword: event.target.value })} placeholder="admin" />
            </Field>
          </div>
        )}
        <div className="form-actions"><Button type="submit" disabled={readOnly}>حفظ إعدادات المدرسة</Button></div>
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
          <span className="field-label">الفصول الدراسية ضمن هذا القسم</span>
          <CheckboxList
            items={data.classes.map(item => ({ id: item.id, label: item.name }))}
            selected={sectionForm.classIds}
            onChange={classIds => setSectionForm({ ...sectionForm, classIds })}
            emptyLabel="أضف فصولاً دراسية أولاً من صفحة الفصول الدراسية."
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

    <Panel title={wingForm.id ? 'تعديل الجناح' : 'إضافة جناح ومشرفه'} description="الجناح مجموعة فصول يتابع حصصها معلم من فريقك كمهمة إضافية، دون أن يصبح حساباً منفصلاً." icon={Wind} id="wing-form">
      {!data.teachers.length ? <EmptyState compact icon={Wind} title="أضف معلماً أولاً" description="يحتاج الجناح معلماً مسؤولاً عن متابعته." /> : (
        <form className="panel-form" onSubmit={submitWing}>
          <div className="form-grid two-columns">
            <Field label="اسم الجناح"><input required maxLength={80} placeholder="مثال: جناح المرحلة الابتدائية" value={wingForm.name} onChange={event => setWingForm({ ...wingForm, name: event.target.value })} /></Field>
            <Field label="المعلم المسؤول (مشرف الجناح)">
              <select required value={wingForm.teacherId} onChange={event => setWingForm({ ...wingForm, teacherId: event.target.value })}>
                <option value="" disabled>اختر المعلم</option>
                {data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="field">
            <span className="field-label">الفصول ضمن هذا الجناح</span>
            <CheckboxList items={data.classes.map(item => ({ id: item.id, label: item.name }))} selected={wingForm.classIds} onChange={classIds => setWingForm({ ...wingForm, classIds })} emptyLabel="أضف فصولاً دراسية أولاً." />
          </div>
          <div className="form-actions">
            <Button type="submit" icon={wingForm.id ? Pencil : Plus} disabled={!data.classes.length}>{wingForm.id ? 'حفظ التعديلات' : 'إضافة الجناح'}</Button>
            {wingForm.id && <Button variant="ghost" onClick={() => setWingForm(blankWing())}>إلغاء التعديل</Button>}
          </div>
        </form>
      )}
    </Panel>

    <Panel title="الأجنحة ومشرفوها" description={`${data.wings.length} جناح مُعرّف`}>
      {!data.wings.length ? <EmptyState compact icon={Wind} title="لا توجد أجنحة بعد" description="أنشئ أول جناح من النموذج أعلاه، وحدّد المعلم الذي يتابع فصوله." /> : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>الجناح</th><th>المعلم المسؤول</th><th>الفصول</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>
          {data.wings.map(wing => (
            <tr key={wing.id}>
              <td><div className="person-cell"><span className="class-icon"><Wind size={18} /></span><strong>{wing.name}</strong></div></td>
              <td>{data.teachers.find(item => item.id === wing.teacherId)?.name || 'معلم محذوف'}</td>
              <td><span className="small-text">{wing.classIds.map(id => data.classes.find(item => item.id === id)?.name).filter(Boolean).join('، ') || 'لا توجد فصول'}</span></td>
              <td><div className="row-actions">
                <IconButton icon={Pencil} label={`تعديل ${wing.name}`} onClick={() => { setWingForm({ ...wing, classIds: [...wing.classIds] }); document.getElementById('wing-form')?.scrollIntoView({ behavior: 'smooth' }); }} />
                <IconButton icon={Trash2} className="delete-button" label={`حذف ${wing.name}`} onClick={() => removeWing(wing)} />
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </Panel>

    <Panel title={staffForm.id ? 'تعديل حساب الموظف' : 'إضافة حساب موظف'} description="مدير مدرسة، مدير مساعد، مشرف، رئيس قسم، أخصائي، أو أي مسمى آخر — بصلاحيات تحددها أنت بدقة لكل صفحة." icon={UserCog} id="staff-form">
      <form className="panel-form" onSubmit={submitStaff}>
        <div className="form-grid two-columns">
          <Field label="اسم الموظف"><input required maxLength={80} placeholder="مثال: منيرة العنزي" value={staffForm.name} onChange={event => setStaffForm({ ...staffForm, name: event.target.value })} /></Field>
          <Field label="المسمى الوظيفي">
            <select value={staffForm.title} onChange={event => applyPreset(event.target.value)}>
              {STAFF_TITLE_PRESETS.map(preset => <option key={preset.title} value={preset.title}>{preset.title}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-grid two-columns">
          <Field label="اسم المستخدم" hint="يُستخدم مع كلمة المرور لتسجيل الدخول"><input required maxLength={40} placeholder="مثال: m.alanezi" value={staffForm.username} onChange={event => setStaffForm({ ...staffForm, username: event.target.value })} /></Field>
          <Field label="كلمة المرور" hint="4 أحرف على الأقل"><input required maxLength={60} type="text" placeholder="كلمة مرور خاصة بالموظف" value={staffForm.password} onChange={event => setStaffForm({ ...staffForm, password: event.target.value })} /></Field>
        </div>
        <div className="permission-field">
          <span className="field-label"><ShieldQuestion size={15} />صلاحيات هذا الحساب لكل صفحة</span>
          <div className="permission-matrix">
            <div className="permission-matrix-head"><span>الصفحة</span><span>بلا صلاحية</span><span>عرض فقط</span><span>عرض وتعديل</span></div>
            {PERMISSION_RESOURCES.map(resource => (
              <div className="permission-matrix-row" key={resource.id}>
                <span>{resource.label}</span>
                {(['none', 'view', 'edit'] as PermissionLevel[]).map(level => (
                  <label key={level} className="permission-radio">
                    <input type="radio" name={`perm-${resource.id}`} checked={staffForm.permissions[resource.id] === level} onChange={() => setPermission(resource.id, level)} />
                    <span className="visually-hidden">{resource.label} - {permissionLabel[level]}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" icon={staffForm.id ? Pencil : Plus}>{staffForm.id ? 'حفظ التعديلات' : 'إضافة الحساب'}</Button>
          {staffForm.id && <Button variant="ghost" onClick={() => setStaffForm(blankStaff())}>إلغاء التعديل</Button>}
        </div>
      </form>
    </Panel>

    <Panel title="حسابات الموظفين" description={`${data.staffAccounts.length} حساب موظف`} icon={KeyRound}>
      {!data.staffAccounts.length ? <EmptyState compact icon={UserCog} title="لا توجد حسابات موظفين بعد" description="أضف أول حساب من النموذج أعلاه، مثل مدير مدرسة أو مشرف أو رئيس قسم." /> : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>الموظف</th><th>المسمى الوظيفي</th><th>اسم المستخدم</th><th>صفحات بصلاحية تعديل</th><th className="actions-cell">الإجراءات</th></tr></thead><tbody>
          {data.staffAccounts.map((account, index) => {
            const editCount = PERMISSION_RESOURCES.filter(resource => account.permissions[resource.id] === 'edit').length;
            return <tr key={account.id}>
              <td><div className="person-cell"><span className={`person-avatar color-${index % 6}`}>{account.name.charAt(0)}</span><strong>{account.name}</strong></div></td>
              <td>{account.title}</td>
              <td className="latin muted">{account.username}</td>
              <td><span className="permission-pill"><ShieldCheck size={12} />{editCount} / {PERMISSION_RESOURCES.length}</span></td>
              <td><div className="row-actions">
                <IconButton icon={Pencil} label={`تعديل ${account.name}`} onClick={() => { setStaffForm(account); document.getElementById('staff-form')?.scrollIntoView({ behavior: 'smooth' }); }} />
                <IconButton icon={Trash2} className="delete-button" label={`حذف ${account.name}`} onClick={() => removeStaff(account)} />
              </div></td>
            </tr>;
          })}
        </tbody></table></div>
      )}
    </Panel>

    {!data.classes.length && (
      <div className="text-hint"><GraduationCap size={16} /><span>أضف فصولاً دراسية أولاً لتتمكن من تكوين الأقسام.</span></div>
    )}
  </div>;
}
