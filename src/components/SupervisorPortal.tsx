import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Eye,
  GraduationCap,
  Info,
  LockKeyhole,
  Printer,
  Shield,
  Users,
} from 'lucide-react';
import type { AppData, Lesson } from '../lib/data';
import type { AppNotification } from '../lib/notifications';
import { Button, Modal } from './ui';
import NotificationCenter from './NotificationCenter';
import InstallAppButton from './InstallAppButton';
import { OfficialPrintHeader, OfficialPrintFooter } from './OfficialPrintHeader';

interface SupervisorPortalProps {
  data: AppData;
  supervisorId: string;
  onSwitchSupervisor: (supervisorId: string) => void;
  onLogout: () => void;
  onGoToAdmin: () => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  notifications: AppNotification[];
  notifPermission: NotificationPermission | 'unsupported';
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onRequestNotifPermission: () => void;
}

/** Read-only view for a section supervisor: their assigned classes, the teachers covering them, and each class's weekly schedule. */
export default function SupervisorPortal({
  data,
  supervisorId,
  onSwitchSupervisor,
  onLogout,
  onGoToAdmin,
  notifications,
  notifPermission,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onRequestNotifPermission,
}: SupervisorPortalProps) {
  const supervisor = data.supervisors.find(item => item.id === supervisorId) || data.supervisors[0];
  const section = data.sections.find(item => item.id === supervisor?.sectionId);
  const sectionClasses = useMemo(() => data.classes.filter(item => section?.classIds.includes(item.id)), [data.classes, section]);
  const [selectedClassId, setSelectedClassId] = useState(sectionClasses[0]?.id ?? '');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const selectedClass = sectionClasses.find(item => item.id === selectedClassId) ?? sectionClasses[0];

  const days = data.days.filter(day => day.enabled);
  const maxPeriods = Math.max(1, ...days.map(day => day.periods));

  const classLessons = useMemo(
    () => (data.schedule && selectedClass ? data.schedule.lessons.filter(lesson => lesson.classId === selectedClass.id) : []),
    [data.schedule, selectedClass]
  );

  const sectionTeacherIds = useMemo(
    () => new Set(data.requirements.filter(item => section?.classIds.includes(item.classId)).map(item => item.teacherId)),
    [data.requirements, section]
  );
  const sectionLessonCount = useMemo(
    () => (data.schedule ? data.schedule.lessons.filter(lesson => section?.classIds.includes(lesson.classId)).length : 0),
    [data.schedule, section]
  );

  const teacherName = (id: string) => data.teachers.find(item => item.id === id)?.name || 'معلم غير محدد';
  const getDayName = (id: string) => data.days.find(item => item.id === id)?.name || id;

  if (!supervisor || !section) {
    return (
      <div className="teacher-empty-screen" dir="rtl">
        <Shield size={48} className="text-muted" />
        <h2>لم يتم العثور على بيانات هذا المشرف أو قسمه</h2>
        <p>قد يكون القسم قد حُذف أو حُدّث من قبل إدارة المدرسة.</p>
        <div className="empty-actions">
          <Button onClick={onGoToAdmin}>الانتقال إلى لوحة الإدارة</Button>
          <Button variant="secondary" onClick={onLogout}>تسجيل الخروج</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-portal-layout" dir="rtl">
      <header className="teacher-topbar">
        <div className="teacher-topbar-inner">
          <div className="teacher-brand">
            <span className="teacher-brand-icon"><CalendarDays size={24} /></span>
            <div>
              <div className="teacher-brand-title">
                <strong>جَدوَل</strong>
                <span className="badge-role">بوابة مشرف القسم</span>
              </div>
              <span className="teacher-school-caption">
                {data.schoolName} • العام الدراسي <bdi className="latin">{data.year}</bdi>
              </span>
            </div>
          </div>

          <div className="teacher-topbar-actions">
            <div className="teacher-switcher-wrap">
              <Eye size={16} className="text-muted" />
              <label htmlFor="supervisor-switch-select" className="visually-hidden">تبديل المشرف المعروض</label>
              <select
                id="supervisor-switch-select"
                value={supervisor.id}
                onChange={(e) => onSwitchSupervisor(e.target.value)}
                className="teacher-switcher-select"
                aria-label="تبديل المشرف المعروض"
              >
                {data.supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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

            <Button variant="secondary" icon={Printer} onClick={() => window.print()} className="topbar-action-btn">
              طباعة الجدول
            </Button>

            <Button variant="ghost" icon={Shield} onClick={onGoToAdmin} className="topbar-admin-btn" title="الانتقال للوحة تحكم المدير">
              إدارة المدرسة
            </Button>

            <Button variant="ghost" icon={Users} onClick={onLogout} className="topbar-logout-btn" title="تسجيل الخروج">
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="teacher-workspace">
        <section className="teacher-hero-card">
          <div className="teacher-hero-info">
            <span className="teacher-big-avatar">{supervisor.name.charAt(0)}</span>
            <div className="teacher-hero-text">
              <h1>أهلاً بك، {supervisor.name}</h1>
              <p>
                قسمك المُسند: <strong>{section.name}</strong> • صلاحية عرض فقط دون تعديل بيانات القسم.
              </p>
            </div>
          </div>

          {!data.schedule && (
            <div className="teacher-hero-notice">
              <Info size={18} />
              <span>الجدول قيد الإعداد والتوليد من قبل إدارة المدرسة.</span>
            </div>
          )}
        </section>

        <div className="teacher-stats-grid">
          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-green">
              <GraduationCap size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">فصول القسم</span>
              <strong className="numeric">{sectionClasses.length} <span>فصل دراسي</span></strong>
              <small className="t-stat-sub">{sectionClasses.map(item => item.name).join(' • ') || 'لا توجد فصول'}</small>
            </div>
          </div>

          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-blue">
              <Users size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">المعلمون في القسم</span>
              <strong>{sectionTeacherIds.size} <span>معلم</span></strong>
              <small className="t-stat-sub">يُدرّسون فصول هذا القسم</small>
            </div>
          </div>

          <div className="t-stat-card">
            <div className="t-stat-icon stat-icon-amber">
              <BookOpen size={20} />
            </div>
            <div className="t-stat-data">
              <span className="t-stat-label">الحصص الموزعة</span>
              <strong className="numeric">{sectionLessonCount} <span>حصة أسبوعياً</span></strong>
              <small className="t-stat-sub">عبر جميع فصول القسم</small>
            </div>
          </div>
        </div>

        <section className="teacher-schedule-panel">
          <OfficialPrintHeader data={data} subtitle={`جدول الفصل: ${selectedClass?.name ?? ''} (قسم ${section.name})`} />
          <div className="panel-header-row">
            <div>
              <h2>جدول الفصل الأسبوعي</h2>
              <p>اختر فصلاً من قسمك لعرض جدوله الأسبوعي كاملاً.</p>
            </div>
            {sectionClasses.length > 1 && (
              <select
                aria-label="اختر الفصل لعرض جدوله"
                className="compact-select"
                value={selectedClass?.id ?? ''}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {sectionClasses.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            )}
          </div>

          {!data.schedule || !selectedClass ? (
            <div className="schedule-not-generated">
              <CalendarDays size={42} className="text-muted" />
              <h3>لا يوجد جدول لعرضه بعد</h3>
              <p>{!selectedClass ? 'لا توجد فصول مضافة لهذا القسم حالياً.' : 'تستطيع إدارة المدرسة توليد الجدول من لوحتها.'}</p>
            </div>
          ) : (
            <div className="table-scroll"><table className="timetable">
              <thead>
                <tr>
                  <th>الحصة</th>
                  {days.map(day => <th key={day.id}>{day.name}<span>{day.periods} حصص</span></th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxPeriods }, (_, index) => index + 1).map(period => (
                  <tr key={period}>
                    <th><span className="period-number">{String(period).padStart(2, '0')}</span><span className="period-label">الحصة {period}</span></th>
                    {days.map(day => {
                      const lesson = classLessons.find(item => item.dayId === day.id && item.period === period);
                      const unavailable = period > day.periods || data.classExceptions.some(item => item.classId === selectedClass.id && item.dayId === day.id && period >= item.fromPeriod);
                      return (
                        <td key={day.id} className={unavailable ? 'unavailable-cell' : ''}>
                          {lesson ? (
                            <button
                              type="button"
                              className={`lesson-cell color-${Math.max(0, data.teachers.findIndex(teacher => teacher.id === lesson.teacherId)) % 6}`}
                              onClick={() => setSelectedLesson(lesson)}
                              aria-label={`${lesson.subject || 'حصة'}، ${teacherName(lesson.teacherId)}، ${day.name}، الحصة ${period}`}
                            >
                              <strong>{lesson.subject || 'حصة دراسية'}</strong>
                              <span>{teacherName(lesson.teacherId)}</span>
                              {lesson.fixed && <LockKeyhole size={11} className="lesson-lock" />}
                            </button>
                          ) : (
                            <span className="empty-cell">{period > day.periods ? '-' : unavailable ? 'انصراف' : 'غير موزّعة'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          <div className="teacher-table-footer">
            <span><Info size={14} />بصلاحية العرض فقط، لا يمكن تعديل الحصص من هذه البوابة.</span>
            <span className="print-hint"><Printer size={13} />مهيأ للطباعة مباشرة بصيغة A4 بالعرض</span>
          </div>
          <OfficialPrintFooter role="مشرف الفصل" />
        </section>

        <section className="teacher-details-grid">
          <div className="teacher-detail-card">
            <h3><GraduationCap size={17} className="text-green" />فصول القسم</h3>
            <div className="t-req-list">
              {sectionClasses.length === 0 ? (
                <p className="muted-text">لا توجد فصول مضافة لهذا القسم بعد.</p>
              ) : (
                sectionClasses.map(item => {
                  const lessons = data.schedule?.lessons.filter(lesson => lesson.classId === item.id).length ?? 0;
                  return (
                    <div key={item.id} className="t-req-item">
                      <div><strong>{item.name}</strong><span>رمز الفصل: {item.code || 'بدون رمز'}</span></div>
                      <span className="req-count-badge numeric">{lessons} حصة</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="teacher-detail-card">
            <h3><Users size={17} className="text-muted" />معلمو القسم</h3>
            <div className="t-exc-list">
              {sectionTeacherIds.size === 0 ? (
                <p className="muted-text">لا يوجد معلمون مسندون لفصول هذا القسم بعد.</p>
              ) : (
                [...sectionTeacherIds].map(id => (
                  <div key={id} className="t-booking-item">
                    <span>معلم:</span>
                    <strong>{teacherName(id)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <Modal
        open={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        title="تفاصيل الحصة الدراسية"
        description={selectedLesson ? `يوم ${getDayName(selectedLesson.dayId)} - الحصة ${selectedLesson.period}` : ''}
      >
        {selectedLesson && (
          <div className="modal-body">
            <div className="lesson-popup-info">
              <div className="popup-badge-icon"><BookOpen size={28} /></div>
              <div>
                <h3>{selectedLesson.subject || 'حصة دراسية'}</h3>
                <span>الفصل الدراسي: <strong>{selectedClass?.name}</strong></span>
              </div>
            </div>
            <div className="popup-facts-list">
              <div><span>المعلم:</span><strong>{teacherName(selectedLesson.teacherId)}</strong></div>
              <div><span>اليوم الدراسي:</span><strong>{getDayName(selectedLesson.dayId)}</strong></div>
              <div><span>رقم الحصة:</span><strong>الحصة {selectedLesson.period}</strong></div>
              <div><span>نوع الحصة:</span><strong>{selectedLesson.fixed ? 'حصة محجوزة ومثبتة مسبقاً' : 'حصة منتظمة موزعة آلياً'}</strong></div>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setSelectedLesson(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
