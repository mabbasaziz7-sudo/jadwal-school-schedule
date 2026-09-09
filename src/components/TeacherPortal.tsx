import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Download,
  Info,
  LockKeyhole,
  LogOut,
  Printer,
  School,
  Shield,
  Sparkles,
  Users,
  CheckCircle2,
  CalendarOff,
  Coffee,
  BookOpen,
  ChevronDown,
  Wind
} from 'lucide-react';
import { csvCell, downloadFile, type AppData, type Lesson } from '../lib/data';
import type { AppNotification, NotificationKind } from '../lib/notifications';
import { useClassReminders } from '../lib/reminders';
import { Button, Modal } from './ui';
import NotificationCenter from './NotificationCenter';
import InstallAppButton from './InstallAppButton';
import { OfficialPrintHeader, OfficialPrintFooter } from './OfficialPrintHeader';

interface TeacherPortalProps {
  data: AppData;
  teacherId: string;
  onSwitchTeacher: (teacherId: string) => void;
  onLogout: () => void;
  onGoToAdmin: () => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  pushNotification: (input: { title: string; message: string; kind: NotificationKind; desktop?: boolean }) => void;
  notifications: AppNotification[];
  notifPermission: NotificationPermission | 'unsupported';
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onRequestNotifPermission: () => void;
}

export default function TeacherPortal({
  data,
  teacherId,
  onSwitchTeacher,
  onLogout,
  onGoToAdmin,
  notify,
  pushNotification,
  notifications,
  notifPermission,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onRequestNotifPermission,
}: TeacherPortalProps) {
  const teacher = data.teachers.find(t => t.id === teacherId) || data.teachers[0];
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useClassReminders(data, teacher, ({ subject, className, period, time }) => {
    pushNotification({
      title: 'تذكير: حصتك القادمة قريباً',
      message: `${subject} - ${className} - الحصة ${period} الساعة ${time}`,
      kind: 'reminder',
    });
  });

  const days = data.days.filter(d => d.enabled);
  const maxPeriods = Math.max(1, ...days.map(d => d.periods));

  const teacherLessons = useMemo(() => {
    if (!data.schedule || !teacher) return [];
    return data.schedule.lessons.filter(l => l.teacherId === teacher.id);
  }, [data.schedule, teacher]);

  const teacherCapacity = useMemo(() => {
    if (!teacher) return 0;
    return data.requirements
      .filter(r => r.teacherId === teacher.id)
      .reduce((sum, r) => sum + r.count, 0);
  }, [data.requirements, teacher]);

  // Working days for this teacher
  const teacherWorkingDays = useMemo(() => {
    if (!teacher) return [];
    return data.days.filter(d => d.enabled && teacher.days.includes(d.id));
  }, [data.days, teacher]);

  // Calculate free periods
  const totalSlots = teacherWorkingDays.reduce((sum, d) => sum + d.periods, 0);
  const totalAssigned = teacherLessons.length;
  const freePeriods = Math.max(0, totalSlots - totalAssigned);

  // Helper names
  const getClassName = (classId: string) => data.classes.find(c => c.id === classId)?.name || 'فصل غير محدد';
  const getDayName = (dayId: string) => data.days.find(d => d.id === dayId)?.name || dayId;
  const wingTeacherName = (id: string) => data.teachers.find(item => item.id === id)?.name || 'معلم غير محدد';

  // "مشرف الجناح": an extra duty some teachers hold — following up on a group of classes' schedules.
  const supervisedWings = useMemo(() => data.wings.filter(w => w.teacherId === teacher?.id), [data.wings, teacher]);
  const [wingId, setWingId] = useState(supervisedWings[0]?.id ?? '');
  useEffect(() => { if (!supervisedWings.some(w => w.id === wingId)) setWingId(supervisedWings[0]?.id ?? ''); }, [supervisedWings, wingId]);
  const activeWing = supervisedWings.find(w => w.id === wingId);
  const wingClassOptions = useMemo(() => activeWing ? data.classes.filter(c => activeWing.classIds.includes(c.id)) : [], [activeWing, data.classes]);
  const [wingClassId, setWingClassId] = useState(wingClassOptions[0]?.id ?? '');
  useEffect(() => { if (!wingClassOptions.some(c => c.id === wingClassId)) setWingClassId(wingClassOptions[0]?.id ?? ''); }, [wingClassOptions, wingClassId]);
  const wingClass = wingClassOptions.find(c => c.id === wingClassId);
  const wingLessons = useMemo(() => (data.schedule && wingClass ? data.schedule.lessons.filter(l => l.classId === wingClass.id) : []), [data.schedule, wingClass]);

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  // Export CSV for this teacher
  const handleExportCsv = () => {
    if (!teacher) return;
    const header = ['المدرسة', 'العام الدراسي', 'اسم المعلم', 'اليوم', 'الحصة', 'الفصل', 'المادة', 'حصة محجوزة'];
    const rows = days.flatMap(day => {
      return teacherLessons
        .filter(l => l.dayId === day.id)
        .sort((a, b) => a.period - b.period)
        .map(l => [
          data.schoolName,
          data.year,
          teacher.name,
          day.name,
          l.period,
          getClassName(l.classId),
          l.subject || 'بدون مادة',
          l.fixed ? 'نعم' : 'لا'
        ]);
    });

    const csvContent = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadFile(csvContent, `جدول-${teacher.name.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    notify('تم تصدير جدول المعلم بصيغة CSV بنجاح.');
  };

  if (!teacher) {
    return (
      <div className="teacher-empty-screen" dir="rtl">
        <School size={48} className="text-muted" />
        <h2>لم يتم العثور على بيانات هذا المعلم</h2>
        <p>قد تكون البيانات تم تحديثها من قبل إدارة المدرسة.</p>
        <div className="empty-actions">
          <Button onClick={onGoToAdmin}>الانتقال إلى لوحة الإدارة</Button>
          <Button variant="secondary" onClick={onLogout}>تسجيل الخروج</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-portal-layout" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="teacher-topbar">
        <div className="teacher-topbar-inner">
          <div className="teacher-brand">
            <span className="teacher-brand-icon">
              <CalendarDays size={24} />
            </span>
            <div>
              <div className="teacher-brand-title">
                <strong>جَدوَل</strong>
                <span className="badge-role">بوابة المعلم</span>
              </div>
              <span className="teacher-school-caption">
                {data.schoolName} • العام الدراسي <bdi className="latin">{data.year}</bdi>
              </span>
            </div>
          </div>

          <div className="teacher-topbar-actions">
            {/* Quick Switch Teacher Selector */}
            <div className="teacher-switcher-wrap">
              <Users size={16} className="text-muted" />
              <label htmlFor="teacher-switch-select" className="visually-hidden">تبديل المعلم المعروض</label>
              <select
                id="teacher-switch-select"
                value={teacher.id}
                onChange={(e) => onSwitchTeacher(e.target.value)}
                className="teacher-switcher-select"
                aria-label="تبديل المعلم المعروض"
              >
                {data.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code || 'بدون رمز'})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="switcher-arrow" />
            </div>

            <InstallAppButton />

            <NotificationCenter
              notifications={notifications}
              permission={notifPermission}
              onMarkRead={onMarkNotificationRead}
              onMarkAllRead={onMarkAllNotificationsRead}
              onClear={onClearNotifications}
              onRequestPermission={onRequestNotifPermission}
            />

            <Button
              variant="secondary"
              icon={Printer}
              onClick={handlePrint}
              className="topbar-action-btn"
            >
              طباعة الجدول
            </Button>

            <Button
              variant="secondary"
              icon={Download}
              onClick={handleExportCsv}
              className="topbar-action-btn"
            >
              تصدير CSV
            </Button>

            <Button
              variant="ghost"
              icon={Shield}
              onClick={onGoToAdmin}
              className="topbar-admin-btn"
              title="الانتقال للوحة تحكم المدير"
            >
              إدارة المدرسة
            </Button>

            <Button
              variant="ghost"
              icon={LogOut}
              onClick={onLogout}
              className="topbar-logout-btn"
              title="تسجيل الخروج"
            >
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace for Teacher */}
      <main className="teacher-workspace">
        {/* Welcome Banner */}
        <section className="teacher-hero-card">
          <div className="teacher-hero-info">
            <span className="teacher-big-avatar">{teacher.name.charAt(0)}</span>
            <div className="teacher-hero-text">
              <h1>أهلاً بك، {teacher.name}</h1>
              <p>
                رمز المعلم: <strong className="latin">{teacher.code || 'T-01'}</strong> • مرحباً بك في مساحتك الخاصة لمتابعة جدول الحصص الأسبوعي.
              </p>
            </div>
          </div>

          {!data.schedule && (
            <div className="teacher-hero-notice">
              <Sparkles size={18} />
              <span>الجدول قيد الإعداد والتوليد من قبل إدارة المدرسة.</span>
            </div>
          )}
        </section>

        {/* Quick Stats Grid */}
        <div className="teacher-stats-grid">
          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-green">
              <BookOpen size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">الحصص الموزعة</span>
              <strong className="numeric">{teacherLessons.length} <span>حصة أسبوعياً</span></strong>
              <small className="t-stat-sub">من أصل {teacherCapacity} حصة نصاب مسجل</small>
            </div>
          </div>

          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-blue">
              <CalendarDays size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">أيام الدوام المعتمدة</span>
              <strong>{teacherWorkingDays.length} <span>أيام بالأسبوع</span></strong>
              <small className="t-stat-sub">
                {teacherWorkingDays.map(d => d.short).join(' • ') || 'لم تحدد'}
              </small>
            </div>
          </div>

          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-amber">
              <Coffee size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">فترات الفراغ والتحضير</span>
              <strong className="numeric">{freePeriods} <span>حصة فراغ</span></strong>
              <small className="t-stat-sub">أوقات مكتبية واستراحة مبرمجة</small>
            </div>
          </div>

          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-purple">
              <Clock size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">الحدود اليومية</span>
              <strong className="numeric">{teacher.minDaily} - {teacher.maxDaily} <span>حصص/يوم</span></strong>
              <small className="t-stat-sub">أقصى متتالية: {teacher.maxConsecutive} حصص</small>
            </div>
          </div>
        </div>

        {/* Weekly Load Summary */}
        {data.schedule && teacherWorkingDays.length > 0 && (
          <section className="weekly-load-panel">
            <div className="panel-header-row">
              <div>
                <h2>ملخص الحمل الأسبوعي</h2>
                <p>توزيع حصصك على أيام الدوام — {teacherLessons.length} حصة موزعة من أصل {teacherCapacity}.</p>
              </div>
            </div>
            <div className="weekly-load-chart">
              {teacherWorkingDays.map((d) => {
                const dayLessons = teacherLessons.filter(l => l.dayId === d.id);
                const loadPct = teacher.maxDaily > 0 ? Math.min(100, Math.round((dayLessons.length / teacher.maxDaily) * 100)) : 0;
                const isOver = dayLessons.length > teacher.maxDaily;
                return (
                  <div key={d.id} className="load-day-col">
                    <div className="load-bar-track">
                      <motion.div
                        className={`load-bar ${isOver ? 'over-load' : ''}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, loadPct)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ position: 'absolute', bottom: 0, width: '100%' }}
                      />
                      <span className="load-count">{dayLessons.length}</span>
                    </div>
                    <span className="load-day-name">{d.short}</span>
                    <span className="load-day-pct">{dayLessons.length}/{teacher.maxDaily}</span>
                  </div>
                );
              })}
              {/* Non-working days shown as inactive */}
              {days.filter(d => !teacher.days.includes(d.id)).map(d => (
                <div key={d.id} className="load-day-col load-day-off">
                  <div className="load-bar-track load-bar-off">
                    <span className="load-count load-count-off">-</span>
                  </div>
                  <span className="load-day-name">{d.short}</span>
                  <span className="load-day-pct">عطلة</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Schedule Table */}
        <section className="teacher-schedule-panel">
          <OfficialPrintHeader data={data} subtitle={`جدول المعلم: ${teacher.name}`} />
          <div className="panel-header-row">
            <div>
              <h2>جدول الحصص الأسبوعي</h2>
              <p>اضغط على أي حصة لاستعراض تفاصيل الفصل والمادة ورقم الحصة.</p>
            </div>
            <div className="legend-pills">
              <span className="legend-item"><span className="legend-box box-assigned" />حصة دراسية</span>
              <span className="legend-item"><span className="legend-box box-free" />فراغ مكتبي</span>
              <span className="legend-item"><span className="legend-box box-fixed" />حصة محجوزة</span>
              <span className="legend-item"><span className="legend-box box-off" />غير متاح</span>
            </div>
          </div>

          {!data.schedule ? (
            <div className="schedule-not-generated">
              <CalendarDays size={42} className="text-muted" />
              <h3>لم يتم اعتماد وتوليد الجدول بعد</h3>
              <p>تستطيع إدارة المدرسة تنفيذ الجدول بضغطة زر وتوزيعه آلياً لجميع المعلمين والفصول.</p>
              <Button icon={Shield} onClick={onGoToAdmin}>
                الانتقال للوحة الإدارة لتوليد الجدول
              </Button>
            </div>
          ) : (
            <div className="teacher-table-scroll">
              <table className="teacher-timetable">
                <thead>
                  <tr>
                    <th className="period-col-header">الحصة</th>
                    {days.map((day) => {
                      const isWorkingDay = teacher.days.includes(day.id);
                      return (
                        <th key={day.id} className={!isWorkingDay ? 'day-off-header' : ''}>
                          <div className="day-header-content">
                            <span className="day-name-bold">{day.name}</span>
                            <span className="day-count-sub">
                              {isWorkingDay
                                ? `${teacherLessons.filter(l => l.dayId === day.id).length} حصص`
                                : 'غير متاح'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, index) => index + 1).map((period) => (
                    <tr key={period}>
                      <th className="period-row-header">
                        <span className="period-badge">{period}</span>
                        <span className="period-caption">الحصة {period}</span>
                      </th>

                      {days.map((day) => {
                        const isSchoolActive = period <= day.periods;
                        const isWorkingDay = teacher.days.includes(day.id);
                        const isException = data.teacherExceptions.some(
                          e => e.teacherId === teacher.id && e.dayId === day.id && e.period === period
                        );
                        const lesson = teacherLessons.find(
                          l => l.dayId === day.id && l.period === period
                        );

                        if (!isSchoolActive) {
                          return (
                            <td key={day.id} className="td-inactive">
                              <span className="muted-dash">-</span>
                            </td>
                          );
                        }

                        if (!isWorkingDay) {
                          return (
                            <td key={day.id} className="td-day-off">
                              <span className="off-pill">غير متاح</span>
                            </td>
                          );
                        }

                        if (isException) {
                          return (
                            <td key={day.id} className="td-exception">
                              <span className="exception-pill">
                                <CalendarOff size={12} />
                                استثناء
                              </span>
                            </td>
                          );
                        }

                        if (lesson) {
                          return (
                            <td key={day.id} className="td-lesson">
                              <button
                                type="button"
                                className="teacher-lesson-card"
                                onClick={() => setSelectedLesson(lesson)}
                                aria-label={`حصة ${lesson.subject || 'دراسة'}، فصل ${getClassName(lesson.classId)}، يوم ${day.name}، الحصة ${period}`}
                              >
                                <span className="lesson-class-tag">
                                  {getClassName(lesson.classId)}
                                </span>
                                <strong className="lesson-subject-tag">
                                  {lesson.subject || 'حصة دراسية'}
                                </strong>
                                {lesson.fixed && (
                                  <span className="lesson-fixed-indicator" title="حصة محجوزة ثابتة">
                                    <LockKeyhole size={11} />
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        }

                        // Free period
                        return (
                          <td key={day.id} className="td-free">
                            <div className="free-period-card">
                              <Coffee size={13} />
                              <span>فراغ مكتبي</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="teacher-table-footer">
            <span>
              <Info size={14} />
              الجدول مخصص للمعلم {teacher.name}. يُرجى مراجعة إدارة المدرسة في حال وجود أي ملاحظات.
            </span>
            <span className="print-hint">
              <Printer size={13} />
              مهيأ للطباعة مباشرة بصيغة A4 بالعرض
            </span>
          </div>
          <OfficialPrintFooter role="المعلم" />
        </section>

        {/* Wing supervision — an extra duty on top of this teacher's own schedule */}
        {supervisedWings.length > 0 && (
          <section className="teacher-schedule-panel wing-panel">
            <div className="panel-header-row">
              <div>
                <h2><Wind size={18} className="text-green" /> الأجنحة التي تتابعها</h2>
                <p>بصفتك مشرف جناح، تستطيع متابعة جدول فصول الجناح المُسند إليك.</p>
              </div>
              <div className="wing-panel-selects">
                {supervisedWings.length > 1 && (
                  <select aria-label="اختر الجناح" value={wingId} onChange={e => setWingId(e.target.value)} className="compact-select">
                    {supervisedWings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
                {wingClassOptions.length > 1 && (
                  <select aria-label="اختر الفصل" value={wingClassId} onChange={e => setWingClassId(e.target.value)} className="compact-select">
                    {wingClassOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {!data.schedule || !wingClass ? (
              <div className="schedule-not-generated">
                <CalendarDays size={36} className="text-muted" />
                <h3>لا يوجد جدول لعرضه بعد</h3>
                <p>سيظهر هنا جدول فصول جناحك بمجرد اعتماد الجدول من إدارة المدرسة.</p>
              </div>
            ) : (
              <div className="teacher-table-scroll"><table className="teacher-timetable">
                <thead><tr><th className="period-col-header">الحصة</th>{days.map(day => <th key={day.id}>{day.name}</th>)}</tr></thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, index) => index + 1).map(period => (
                    <tr key={period}>
                      <th className="period-row-header"><span className="period-badge">{period}</span></th>
                      {days.map(day => {
                        const lesson = wingLessons.find(l => l.dayId === day.id && l.period === period);
                        if (period > day.periods) return <td key={day.id} className="td-inactive"><span className="muted-dash">-</span></td>;
                        if (!lesson) return <td key={day.id} className="td-free"><div className="free-period-card"><Coffee size={12} /><span>فراغ</span></div></td>;
                        return <td key={day.id} className="td-lesson"><div className="teacher-lesson-card"><span className="lesson-class-tag">{wingTeacherName(lesson.teacherId)}</span><strong className="lesson-subject-tag">{lesson.subject || 'حصة دراسية'}</strong></div></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </section>
        )}

        {/* Teacher Constraints & Notes */}
        <section className="teacher-details-grid">
          <div className="teacher-detail-card">
            <h3>
              <CheckCircle2 size={17} className="text-green" />
              الأنصبة والمواد المسجلة لك
            </h3>
            <div className="t-req-list">
              {data.requirements.filter(r => r.teacherId === teacher.id).length === 0 ? (
                <p className="muted-text">لم يتم تسجيل أنصبة حصص لهذا المعلم بعد.</p>
              ) : (
                data.requirements
                  .filter(r => r.teacherId === teacher.id)
                  .map(req => (
                    <div key={req.id} className="t-req-item">
                      <div>
                        <strong>{getClassName(req.classId)}</strong>
                        <span>{req.subject || 'بدون تحديد مادة'}</span>
                      </div>
                      <span className="req-count-badge numeric">{req.count} حصص</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="teacher-detail-card">
            <h3>
              <CalendarOff size={17} className="text-muted" />
              الاستثناءات والأوقات المحجوزة
            </h3>
            <div className="t-exc-list">
              {data.teacherExceptions.filter(e => e.teacherId === teacher.id).length === 0 &&
               data.bookings.filter(b => b.teacherId === teacher.id).length === 0 ? (
                <p className="muted-text">لا توجد استثناءات أو حجوزات خاصة مسجلة لهذا المعلم.</p>
              ) : (
                <>
                  {data.teacherExceptions
                    .filter(e => e.teacherId === teacher.id)
                    .map(exc => (
                      <div key={exc.id} className="t-exc-item">
                        <span>وقت مستثنى:</span>
                        <strong>{getDayName(exc.dayId)}، الحصة {exc.period}</strong>
                      </div>
                    ))}
                  {data.bookings
                    .filter(b => b.teacherId === teacher.id)
                    .map(b => (
                      <div key={b.id} className="t-booking-item">
                        <span>حجز ثابت:</span>
                        <strong>
                          {getClassName(b.classId)} • {getDayName(b.dayId)}، الحصة {b.period}
                        </strong>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Lesson Details Modal */}
      <Modal
        open={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        title="تفاصيل الحصة الدراسية"
        description={selectedLesson ? `يوم ${getDayName(selectedLesson.dayId)} - الحصة ${selectedLesson.period}` : ''}
      >
        {selectedLesson && (
          <div className="modal-body">
            <div className="lesson-popup-info">
              <div className="popup-badge-icon">
                <BookOpen size={28} />
              </div>
              <div>
                <h3>{selectedLesson.subject || 'حصة دراسية'}</h3>
                <span>الفصل الدراسي: <strong>{getClassName(selectedLesson.classId)}</strong></span>
              </div>
            </div>

            <div className="popup-facts-list">
              <div>
                <span>المعلم:</span>
                <strong>{teacher.name} ({teacher.code || 'بدون رمز'})</strong>
              </div>
              <div>
                <span>اليوم الدراسي:</span>
                <strong>{getDayName(selectedLesson.dayId)}</strong>
              </div>
              <div>
                <span>رقم الحصة:</span>
                <strong>الحصة {selectedLesson.period}</strong>
              </div>
              <div>
                <span>نوع الحصة:</span>
                <strong>{selectedLesson.fixed ? 'حصة محجوزة ومثبتة مسبقاً' : 'حصة منتظمة موزعة آلياً'}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setSelectedLesson(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
