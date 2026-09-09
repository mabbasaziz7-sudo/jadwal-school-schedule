import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpLeft, Building2, CalendarClock, CalendarDays, CalendarOff, Check, CheckCircle2, ChevronDown, ChevronLeft, CircleAlert, CircleHelp, ClipboardList, CloudCheck, Database, Gauge, GraduationCap, Home, LifeBuoy, LoaderCircle, LogOut, Menu, MousePointerClick, Repeat2, ShieldCheck, Sparkles, Table2, Users, X, type LucideIcon } from 'lucide-react';
import DaysPage from './components/DaysPage';
import { ClassesPage, TeachersPage } from './components/PeoplePages';
import RequirementsPage from './components/RequirementsPage';
import { BookingsPage, ExceptionsPage, LimitsPage } from './components/RulesPages';
import DashboardPage from './components/DashboardPage';
import SchedulePage from './components/SchedulePage';
import DistributePage from './components/DistributePage';
import DataPage from './components/DataPage';
import LoginPage from './components/LoginPage';
import TeacherPortal from './components/TeacherPortal';
import NotificationCenter from './components/NotificationCenter';
import InstallAppButton from './components/InstallAppButton';
import { Button, Field, IconButton, Modal, type WorkspaceProps } from './components/ui';
import { loadData, makeDemoData, SESSION_KEY, STORAGE_KEY, type AppData, type TabId, type UserSession } from './lib/data';
import { generateSchedule } from './lib/scheduler';
import {
  createNotification,
  getNotificationPermission,
  loadNotifications,
  requestNotificationPermission,
  saveNotifications,
  showBrowserNotification,
  type AppNotification,
  type NotificationKind,
} from './lib/notifications';

const tabs: { id: TabId; label: string; icon: LucideIcon; group: number }[] = [
  { id: 'dashboard', label: 'لوحة المعلومات', icon: Gauge, group: 0 },
  { id: 'days', label: 'أيام الدوام', icon: CalendarDays, group: 0 },
  { id: 'teachers', label: 'المعلمون', icon: Users, group: 0 },
  { id: 'classes', label: 'الصفوف الدراسية', icon: GraduationCap, group: 0 },
  { id: 'requirements', label: 'نصاب المعلمين', icon: ClipboardList, group: 1 },
  { id: 'exceptions', label: 'الاستثناءات', icon: CalendarOff, group: 1 },
  { id: 'limits', label: 'حدود التكرار', icon: Repeat2, group: 1 },
  { id: 'bookings', label: 'حجز الحصص', icon: CalendarClock, group: 1 },
  { id: 'distribute', label: 'التوزيع اليدوي', icon: MousePointerClick, group: 2 },
  { id: 'schedule', label: 'الجدول المدرسي', icon: Table2, group: 2 },
  { id: 'data', label: 'إدارة البيانات', icon: Database, group: 2 },
];

const pageCopy: Record<TabId, { title: string; description: string }> = {
  dashboard: { title: 'لوحة المعلومات', description: 'نظرة شاملة على جاهزية الجدول المدرسي وتوزيع الأحمال بين المعلمين والصفوف.' },
  days: { title: 'إعداد الجدول المدرسي', description: 'خطوات بسيطة، وجدول متوازن يناسب مدرستك. لنبدأ بتنظيم أسبوعك.' },
  teachers: { title: 'المعلمون', description: 'لكل معلم وقته. نظّم فريقك التعليمي بما يناسب أيام دوامه.' },
  classes: { title: 'الصفوف الدراسية', description: 'مساحة منظّمة لكل صف، وأسبوع دراسي أوضح للجميع.' },
  requirements: { title: 'توزيع نصاب الحصص', description: 'وازن بين احتياجات الصفوف وأنصبة المعلمين، حصةً بحصة.' },
  exceptions: { title: 'الاستثناءات', description: 'لأن لكل مدرسة تفاصيلها. خصّص الأوقات التي لا يناسبها الدوام.' },
  limits: { title: 'حدود التكرار', description: 'تفاصيل صغيرة تصنع توزيعاً أكثر توازناً لحصص المعلمين.' },
  bookings: { title: 'حجز الحصص', description: 'بعض المواعيد لا تتغير. ثبّتها واترك لنا تنظيم بقية الأسبوع.' },
  distribute: { title: 'التوزيع اليدوي', description: 'وزّع الحصص بنفسك: اختر معلماً أو يوماً أو صفاً وأسند الحصص مع شرح أثر كل تغيير.' },
  schedule: { title: 'الجدول المدرسي', description: 'أسبوعك الدراسي في صورة واحدة. أنشئه، راجعه، وشاركه.' },
  data: { title: 'إدارة البيانات', description: 'عملك محفوظ، وتحت سيطرتك. احتفظ بنسخة أينما احتجت إليها.' },
};

interface Confirmation { title: string; description: string; action: () => void; destructive: boolean }
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

export default function App() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserSession;
        if (parsed && (parsed.role === 'admin' || parsed.role === 'teacher')) {
          return parsed;
        }
      }
    } catch { /* Storage might be blocked */ }
    return null;
  });
  const [tab, setTab] = useState<TabId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    schoolName: data.schoolName,
    year: data.year,
    adminPassword: data.adminPassword || 'admin',
  });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const revision = useRef(0);
  const generationRunning = useRef(false);
  const recovered = useRef(false);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }, [session]);

  useEffect(() => { saveNotifications(notifications); }, [notifications]);

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => setToast({ id: Date.now(), message, type }), []);
  const pushNotification = useCallback((input: { title: string; message: string; kind: NotificationKind; desktop?: boolean }) => {
    const entry = createNotification(input);
    setNotifications(previous => [entry, ...previous].slice(0, 60));
    if (input.desktop !== false) void showBrowserNotification(input.title, { body: input.message, tag: entry.id });
  }, []);
  const markNotificationRead = useCallback((id: string) => setNotifications(previous => previous.map(item => item.id === id ? { ...item, read: true } : item)), []);
  const markAllNotificationsRead = useCallback(() => setNotifications(previous => previous.map(item => ({ ...item, read: true }))), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);
  const requestNotifPermission = useCallback(() => { void requestNotificationPermission().then(setNotifPermission); }, []);
  const commit: WorkspaceProps['commit'] = useCallback(changes => {
    revision.current++;
    setData(previous => {
      const next = typeof changes === 'function' ? changes(previous) : changes;
      return { ...previous, ...next, schedule: Object.prototype.hasOwnProperty.call(next, 'schedule') ? next.schedule ?? null : null };
    });
  }, []);
  const goTo = useCallback((next: TabId) => {
    setTab(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const confirm: WorkspaceProps['confirm'] = useCallback((title, description, action, destructive = false) => setConfirmation({ title, description, action, destructive }), []);

  useEffect(() => {
    if (initial.recovered && !recovered.current) {
      recovered.current = true;
      try { const old = localStorage.getItem(STORAGE_KEY); if (old) localStorage.setItem(`${STORAGE_KEY}-recovery`, old); } catch { /* Storage can be unavailable in private browsing. */ }
      notify('تعذّر قراءة البيانات السابقة. احتفظنا بنسخة استرداد إن كان التخزين متاحاً وبدأنا مساحة جديدة.', 'error');
      pushNotification({ title: 'تعذّر استرجاع البيانات', message: 'بدأنا مساحة عمل جديدة، مع نسخة استرداد إن كان التخزين متاحاً.', kind: 'error' });
    }
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setSaveState('saved'); }
      catch {
        setSaveState('error');
        notify('التخزين المحلي غير متاح أو ممتلئ. صدّر نسخة من إدارة البيانات قبل إغلاق الصفحة.', 'error');
        pushNotification({ title: 'تعذّر حفظ البيانات', message: 'التخزين المحلي غير متاح أو ممتلئ. صدّر نسخة احتياطية قبل إغلاق الصفحة.', kind: 'error' });
      }
    }, 300);
    const flush = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* The visible save indicator already explains unavailable storage. */ } };
    window.addEventListener('pagehide', flush);
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', flush); };
  }, [data, initial.recovered, notify, pushNotification]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.type === 'error' ? 6500 : 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => { document.title = `${pageCopy[tab].title} | جَدوَل`; }, [tab]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 961px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobileOpen || helpOpen || settingsOpen || confirmation) return;
    const previousFocus = document.activeElement as HTMLElement;
    const sidebar = document.getElementById('main-sidebar');
    const frame = requestAnimationFrame(() => sidebar?.querySelector<HTMLElement>('.nav-item-active')?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
      if (event.key === 'Tab') {
        const items = [...(sidebar?.querySelectorAll<HTMLButtonElement>('button') ?? [])].filter(item => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [mobileOpen, helpOpen, settingsOpen, confirmation]);

  const runGeneration = async (source: AppData = data) => {
    if (generationRunning.current) return;
    generationRunning.current = true;
    setGenerating(true);
    setProgress(0);
    const startedRevision = revision.current;
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const schedule = await generateSchedule(source, setProgress);
      await new Promise(resolve => setTimeout(resolve, 250));
      if (revision.current !== startedRevision) { notify('تغيّرت الإعدادات أثناء التوليد. أعد إنشاء الجدول باستخدام البيانات الجديدة.', 'info'); return; }
      commit({ schedule });
      notify(schedule.warnings.length ? 'تم إنشاء الجدول مع ملاحظات. راجع التنبيهات قبل اعتماده.' : 'جدولك جاهز! تم توزيع جميع الحصص دون تعارض.', schedule.warnings.length ? 'info' : 'success');
      pushNotification(schedule.warnings.length
        ? { title: 'الجدول جاهز مع ملاحظات', message: `تم توليد الجدول مع ${schedule.warnings.length} ملاحظة تحتاج مراجعة.`, kind: 'info' }
        : { title: 'الجدول جاهز', message: 'تم توزيع جميع الحصص دون أي تعارض.', kind: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذّر إنشاء الجدول. راجع إعداداتك وحاول مجدداً.';
      notify(message, 'error');
      pushNotification({ title: 'تعذّر إنشاء الجدول', message, kind: 'error' });
    }
    finally { setGenerating(false); generationRunning.current = false; }
  };

  const loadDemo = () => {
    if (generationRunning.current) return notify('انتظر حتى يكتمل توليد الجدول الحالي.', 'info');
    const applyDemo = () => {
      const demo = makeDemoData();
      commit(demo);
      goTo('schedule');
      void runGeneration(demo);
    };
    if (data.teachers.length || data.classes.length || data.requirements.length || data.bookings.length) confirm('تحميل المدرسة التجريبية؟', 'سيستبدل المثال بياناتك الحالية بمدرسة تجريبية من 7 معلمين و3 صفوف. يمكنك تصدير نسخة احتياطية أولاً من إدارة البيانات.', applyDemo);
    else applyDemo();
  };

  const openSettings = () => {
    setSettings({
      schoolName: data.schoolName,
      year: data.year,
      adminPassword: data.adminPassword || 'admin',
    });
    setSettingsOpen(true);
  };

  const saveSettings = (event: FormEvent) => {
    event.preventDefault();
    if (!settings.schoolName.trim() || !settings.year.trim()) return;
    commit({
      schoolName: settings.schoolName.trim(),
      year: settings.year.trim(),
      adminPassword: settings.adminPassword.trim() || 'admin',
      schedule: data.schedule,
    });
    setSettingsOpen(false);
    notify('تم حفظ إعدادات المدرسة وكلمة المرور.');
  };

  const workspaceProps: WorkspaceProps = {
    data,
    commit,
    notify,
    goTo,
    confirm,
    loadDemo,
    onViewTeacher: (teacherId: string) => setSession({ role: 'teacher', teacherId }),
  };
  const currentStep = tabs.find(item => item.id === tab)!.group;
  const completed = [data.days.some(day => day.enabled) && data.teachers.length > 0 && data.classes.length > 0, data.requirements.length > 0, !!data.schedule];
  const counts: Partial<Record<TabId, number>> = { teachers: data.teachers.length, classes: data.classes.length };
  const page = () => {
    switch (tab) {
      case 'dashboard': return <DashboardPage {...workspaceProps} onGenerate={() => void runGeneration()} generating={generating} progress={progress} />;
      case 'days': return <DaysPage {...workspaceProps} />;
      case 'teachers': return <TeachersPage {...workspaceProps} />;
      case 'classes': return <ClassesPage {...workspaceProps} />;
      case 'requirements': return <RequirementsPage {...workspaceProps} />;
      case 'exceptions': return <ExceptionsPage {...workspaceProps} />;
      case 'limits': return <LimitsPage {...workspaceProps} />;
      case 'bookings': return <BookingsPage {...workspaceProps} />;
      case 'distribute': return <DistributePage {...workspaceProps} onGenerate={() => void runGeneration()} generating={generating} />;
      case 'schedule': return <SchedulePage {...workspaceProps} onGenerate={() => void runGeneration()} generating={generating} progress={progress} />;
      case 'data': return <DataPage {...workspaceProps} />;
    }
  };

  // If not logged in, show LoginPage
  if (!session) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginPage
          data={data}
          onLogin={(sess) => setSession(sess)}
          loadDemo={loadDemo}
          notify={notify}
        />
        <div className="toast-container" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`toast toast-${toast.type}`}
                key={toast.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                role={toast.type === 'error' ? 'alert' : 'status'}
              >
                {toast.type === 'error' ? <CircleAlert size={20} /> : toast.type === 'info' ? <CircleHelp size={20} /> : <CheckCircle2 size={20} />}
                <p>{toast.message}</p>
                <IconButton icon={X} label="إغلاق الإشعار" onClick={() => setToast(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    );
  }

  // If logged in as Teacher, show dedicated Teacher Portal
  if (session.role === 'teacher') {
    const activeTeacherId = session.teacherId || data.teachers[0]?.id || '';
    return (
      <MotionConfig reducedMotion="user">
        <TeacherPortal
          data={data}
          teacherId={activeTeacherId}
          onSwitchTeacher={(id) => setSession({ role: 'teacher', teacherId: id })}
          onLogout={() => { setSession(null); notify('تم تسجيل الخروج بنجاح.'); }}
          onGoToAdmin={() => setSession({ role: 'admin' })}
          notify={notify}
          pushNotification={pushNotification}
          notifications={notifications}
          notifPermission={notifPermission}
          onMarkNotificationRead={markNotificationRead}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          onClearNotifications={clearNotifications}
          onRequestNotifPermission={requestNotifPermission}
        />
        <div className="toast-container" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`toast toast-${toast.type}`}
                key={toast.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                role={toast.type === 'error' ? 'alert' : 'status'}
              >
                {toast.type === 'error' ? <CircleAlert size={20} /> : toast.type === 'info' ? <CircleHelp size={20} /> : <CheckCircle2 size={20} />}
                <p>{toast.message}</p>
                <IconButton icon={X} label="إغلاق الإشعار" onClick={() => setToast(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    );
  }

  // Admin Workspace
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell" dir="rtl">
        <AnimatePresence>
          {mobileOpen && (
            <motion.button
              aria-label="إغلاق القائمة الجانبية"
              className="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside id="main-sidebar" className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="القائمة الرئيسية">
          <div className="brand-row">
            <button className="brand" onClick={() => goTo('days')} aria-label="جَدوَل، الصفحة الرئيسية">
              <span className="brand-mark">
                <CalendarDays size={27} strokeWidth={1.8} />
              </span>
              <span className="brand-copy">
                <strong>جَدوَل</strong>
                <span>مولّد الجداول المدرسية</span>
              </span>
            </button>
            <IconButton className="mobile-close" icon={X} label="إغلاق القائمة" onClick={() => setMobileOpen(false)} />
          </div>

          <nav className="sidebar-nav" aria-label="أقسام إعداد الجدول">
            {[0, 1, 2].map((group) => (
              <div className={`nav-group nav-group-${group}`} key={group}>
                {group < 2 && (
                  <div className="nav-section-label">
                    {group === 0 ? 'إعداد المدرسة' : 'تخصيص الجدول'}
                  </div>
                )}
                {tabs
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <button
                      key={item.id}
                      className={`nav-item ${tab === item.id ? 'nav-item-active' : ''}`}
                      aria-current={tab === item.id ? 'page' : undefined}
                      onClick={() => goTo(item.id)}
                    >
                      {tab === item.id && (
                        <motion.span
                          className="nav-active-background"
                          layoutId="active-navigation"
                          transition={{ type: 'spring', stiffness: 350, damping: 34 }}
                        />
                      )}
                      <item.icon size={19} strokeWidth={1.7} />
                      <span>{item.label}</span>
                      {(counts[item.id] ?? 0) > 0 && <small className="nav-count">{counts[item.id]}</small>}
                      {tab === item.id && <span className="nav-active-dot" />}
                    </button>
                  ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <button className="sidebar-help" onClick={() => setHelpOpen(true)}>
              <LifeBuoy size={21} strokeWidth={1.6} />
              <span>
                <strong>تحتاج إلى مساعدة؟</strong>
                <small>نحن هنا لنجعل التنظيم أسهل.</small>
              </span>
              <ArrowUpLeft size={15} />
            </button>
            <button className="school-profile" onClick={openSettings}>
              <span className="school-avatar">
                <Building2 size={21} strokeWidth={1.6} />
              </span>
              <span>
                <strong>{data.schoolName}</strong>
                <small>لوحة الإدارة المدرسية</small>
              </span>
              <ChevronLeft size={17} />
            </button>
          </div>
        </aside>

        <div className="main-shell" inert={mobileOpen}>
          <header className="topbar">
            <div className="breadcrumb">
              <IconButton
                icon={Menu}
                label="فتح القائمة"
                className="mobile-menu"
                aria-expanded={mobileOpen}
                aria-controls="main-sidebar"
                onClick={() => setMobileOpen(true)}
              />
              <Home size={16} strokeWidth={1.6} className="breadcrumb-home" />
              <span>مساحة العمل</span>
              <ChevronLeft size={13} />
              <strong>{tab === 'data' ? 'إدارة البيانات' : tab === 'schedule' ? 'الجدول المدرسي' : 'إعداد الجدول'}</strong>
            </div>

            <div className="topbar-tools">
              <div className="admin-status-badge">
                <ShieldCheck size={14} />
                <span>مسؤول النظام</span>
              </div>

              <InstallAppButton />

              {data.teachers.length > 0 && (
                <button
                  type="button"
                  className="topbar-btn-soft"
                  onClick={() => setSession({ role: 'teacher', teacherId: data.teachers[0]?.id })}
                  title="الانتقال إلى بوابة المعلم"
                >
                  <Users size={14} />
                  <span>بوابة المعلم</span>
                </button>
              )}

              <button
                type="button"
                className="topbar-btn-soft text-danger-soft"
                onClick={() => { setSession(null); notify('تم تسجيل الخروج بنجاح.'); }}
                title="تسجيل الخروج من لوحة الإدارة"
              >
                <LogOut size={14} />
                <span>خروج</span>
              </button>

              <span className="topbar-divider" />

              <button className="year-picker" onClick={openSettings}>
                <CalendarDays size={16} strokeWidth={1.6} />
                <span className="year-caption">العام الدراسي</span>
                <bdi className="latin">{data.year}</bdi>
                <ChevronDown size={13} />
              </button>

              <span className="topbar-divider" />

              <NotificationCenter
                notifications={notifications}
                permission={notifPermission}
                onMarkRead={markNotificationRead}
                onMarkAllRead={markAllNotificationsRead}
                onClear={clearNotifications}
                onRequestPermission={requestNotifPermission}
              />

              <IconButton icon={CircleHelp} label="دليل استخدام جَدوَل" className="help-icon" onClick={() => setHelpOpen(true)} />
            </div>
          </header>

          <main className="workspace">
            <div className="page-heading">
              <div>
                <h1>{pageCopy[tab].title}</h1>
                <p>{pageCopy[tab].description}</p>
              </div>
              {tab !== 'schedule' && (
                <Button variant="secondary" icon={Table2} className="preview-button" onClick={() => goTo('schedule')}>
                  معاينة الجدول
                </Button>
              )}
            </div>

            {tab !== 'data' && (
              <div className="setup-progress" aria-label="مراحل إعداد الجدول">
                {[
                  { title: 'إعداد المدرسة', description: 'الأيام، المعلمون والصفوف', tab: 'days' as const },
                  { title: 'تخصيص الحصص', description: 'الأنصبة، الاستثناءات والقيود', tab: 'requirements' as const },
                  { title: 'إنشاء الجدول', description: 'توليد، مراجعة ومشاركة', tab: 'schedule' as const },
                ].map((step, index) => (
                  <div className="setup-step-wrap" key={step.tab}>
                    <button
                      className={`setup-step ${currentStep === index ? 'step-current' : ''} ${
                        completed[index] && currentStep > index ? 'step-done' : ''
                      }`}
                      onClick={() => goTo(step.tab)}
                      aria-current={currentStep === index ? 'step' : undefined}
                    >
                      <span className="step-number">
                        {completed[index] && currentStep > index ? <Check size={15} /> : <span>{index + 1}</span>}
                      </span>
                      <span className="step-copy">
                        <strong>{step.title}</strong>
                        <small>{step.description}</small>
                      </span>
                    </button>
                    {index < 2 && <span className={`step-connector ${currentStep > index ? 'connector-done' : ''}`} />}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                className="page-content"
                initial={{ opacity: 0, y: 9 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.19, ease: 'easeOut' }}
              >
                {page()}
              </motion.div>
            </AnimatePresence>

            <footer className="workspace-footer">
              <span>
                <ShieldCheck size={13} />
                لوحة تحكم المسؤول • حفظ محلي مباشر على هذا المتصفح.
              </span>
              <span className={`save-state save-${saveState}`}>
                {saveState === 'saving' ? (
                  <LoaderCircle size={12} className="spin" />
                ) : saveState === 'error' ? (
                  <CircleAlert size={12} />
                ) : (
                  <CloudCheck size={14} />
                )}
                {saveState === 'saving'
                  ? 'جارٍ الحفظ...'
                  : saveState === 'error'
                  ? 'الحفظ المحلي غير متاح'
                  : 'جميع التغييرات محفوظة'}
              </span>
            </footer>
          </main>
        </div>

        <Modal
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title="أهلاً بك في جَدوَل"
          description="من أول يوم دوام إلى جدول جاهز، في ثلاث مراحل بسيطة."
          wide
        >
          <div className="modal-body">
            <ol className="help-steps">
              <li>
                <span>01</span>
                <div>
                  <h3>عرّفنا بمدرستك</h3>
                  <p>حدّد أيام الدوام وعدد الحصص، ثم أضف المعلمين والصفوف. لكل معلم أيام دوام وحدود يومية يمكنك تخصيصها.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>وزّع الأنصبة وأضف التفاصيل</h3>
                  <p>أدخل عدد حصص كل معلم في كل صف طوال الأسبوع. أضف الاستثناءات أو التكرار الإلزامي أو الحجوزات الثابتة عند الحاجة.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>أنشئ جدولك وراجعه</h3>
                  <p>اضغط «إنشاء الجدول». راجع أي تنبيهات، وبدّل مواعيد الحصص بالضغط عليها. يمكنك عرض جدول الصف أو المعلم وطباعته أو تصديره.</p>
                </div>
              </li>
            </ol>
            <div className="help-faq">
              <details>
                <summary>
                  هل تُحفظ بياناتي عند إغلاق الصفحة؟
                  <ChevronDown size={15} />
                </summary>
                <p>نعم، تُحفظ في المتصفح نفسه تلقائياً عند توفر التخزين المحلي. ننصح بتصدير نسخة احتياطية دورياً، خصوصاً قبل مسح بيانات المتصفح أو تغيير الجهاز.</p>
              </details>
              <details>
                <summary>
                  كيف يستفيد المعلم من التطبيق؟
                  <ChevronDown size={15} />
                </summary>
                <p>يستطيع المعلم الدخول عبر «بوابة المعلم» باختيار اسمه للاطلاع على جدول حصصه وفترات فراغه وطباعتها مباشرة بحجم A4.</p>
              </details>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setHelpOpen(false)}>
                لنبدأ التنظيم
                <ArrowLeft size={15} />
              </Button>
              <Button
                variant="secondary"
                icon={Sparkles}
                onClick={() => {
                  setHelpOpen(false);
                  loadDemo();
                }}
              >
                تجربة مثال جاهز
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title="إعدادات المدرسة والحساب"
          description="تفاصيل المدرسة وكلمة مرور حساب المسؤول."
        >
          <form onSubmit={saveSettings} className="modal-body">
            <div className="form-grid">
              <Field label="اسم المدرسة">
                <input
                  required
                  maxLength={80}
                  value={settings.schoolName}
                  onChange={(event) => setSettings({ ...settings, schoolName: event.target.value })}
                  placeholder="اسم مدرستك"
                />
              </Field>
              <Field label="العام الدراسي">
                <input
                  required
                  maxLength={30}
                  value={settings.year}
                  onChange={(event) => setSettings({ ...settings, year: event.target.value })}
                  placeholder="2025 - 2026"
                />
              </Field>
              <Field label="كلمة مرور المسؤول" hint="تُستخدم لتسجيل الدخول في صفحة الإدارة (الافتراضية: admin)">
                <input
                  required
                  maxLength={40}
                  type="text"
                  value={settings.adminPassword}
                  onChange={(event) => setSettings({ ...settings, adminPassword: event.target.value })}
                  placeholder="admin"
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button type="submit">حفظ الإعدادات</Button>
              <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          open={!!confirmation}
          onClose={() => setConfirmation(null)}
          title={confirmation?.title ?? ''}
        >
          <div className="modal-body">
            <p className="confirmation-copy">{confirmation?.description}</p>
            <div className="modal-actions">
              <Button
                variant={confirmation?.destructive ? 'danger' : 'primary'}
                onClick={() => {
                  const action = confirmation?.action;
                  setConfirmation(null);
                  action?.();
                }}
              >
                {confirmation?.destructive ? 'تأكيد الحذف' : 'تأكيد والمتابعة'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmation(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>

        <div className="toast-container" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`toast toast-${toast.type}`}
                key={toast.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                role={toast.type === 'error' ? 'alert' : 'status'}
              >
                {toast.type === 'error' ? <CircleAlert size={20} /> : toast.type === 'info' ? <CircleHelp size={20} /> : <CheckCircle2 size={20} />}
                <p>{toast.message}</p>
                <IconButton icon={X} label="إغلاق الإشعار" onClick={() => setToast(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
