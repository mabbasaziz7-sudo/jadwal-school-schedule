import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  GraduationCap,
  MousePointerClick,
  Printer,
  RefreshCw,
  Sparkles,
  Table2,
  Users,
} from 'lucide-react';
import { classCapacity, type TabId } from '../lib/data';
import { Button, Panel, type WorkspaceProps } from './ui';

interface DashboardProps extends WorkspaceProps {
  onGenerate: () => void;
  generating: boolean;
  progress: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const } }),
};

export default function DashboardPage({ data, goTo, onGenerate, generating, progress }: DashboardProps) {
  const days = data.days.filter(day => day.enabled);
  const schedule = data.schedule;

  const stats = useMemo(() => {
    const activeTeachers = data.teachers.filter(t => t.days.some(d => days.some(day => day.id === d))).length;
    const totalRequirementLessons = data.requirements.reduce((sum, r) => sum + r.count, 0);
    const placed = schedule?.lessons.length ?? 0;
    const requested = schedule?.requested ?? totalRequirementLessons;
    const coveragePct = requested > 0 ? Math.round((placed / requested) * 100) : 0;

    // اكتمال كل صف
    const classCoverage = data.classes.map(cls => {
      const capacity = classCapacity(data, cls.id);
      const assigned = schedule?.lessons.filter(l => l.classId === cls.id).length ?? 0;
      return { id: cls.id, name: cls.name, code: cls.code, capacity, assigned, pct: capacity > 0 ? Math.min(100, Math.round((assigned / capacity) * 100)) : 0, complete: assigned >= capacity };
    });

    // حمل كل معلم
    const teacherLoad = data.teachers.map(teacher => {
      const total = data.requirements.filter(r => r.teacherId === teacher.id).reduce((s, r) => s + r.count, 0);
      const assigned = schedule?.lessons.filter(l => l.teacherId === teacher.id).length ?? 0;
      const workingDays = days.filter(d => teacher.days.includes(d.id)).length;
      const capacity = workingDays * teacher.maxDaily;
      const workingDaysText = days.filter(d => teacher.days.includes(d.id)).map(d => d.short).join('، ');
      return { id: teacher.id, name: teacher.name, code: teacher.code, total, assigned, remaining: Math.max(0, total - assigned), capacity, loadPct: capacity > 0 ? Math.min(100, Math.round((assigned / capacity) * 100)) : 0, workingDaysText };
    }).sort((a, b) => b.assigned - a.assigned);

    // الحصص غير الموزعة حسب النصاب
    const unassigned = data.requirements.map(req => {
      const assigned = schedule?.lessons.filter(l => l.requirementId === req.id).length ?? 0;
      return { ...req, assigned, remaining: Math.max(0, req.count - assigned) };
    }).filter(r => r.remaining > 0);

    const warningCount = schedule?.warnings.length ?? 0;
    return { activeTeachers, totalRequirementLessons, placed, requested, coveragePct, classCoverage, teacherLoad, unassigned, warningCount };
  }, [data, days, schedule]);

  const quickActions: { label: string; icon: typeof Sparkles; tab: TabId | undefined; action: (() => void) | undefined; desc: string }[] = [
    { label: 'إنشاء / إعادة توليد الجدول', icon: Sparkles, tab: undefined, action: onGenerate, desc: 'توزيع آلي كامل مع مراعاة كل القيود' },
    { label: 'التوزيع اليدوي', icon: MousePointerClick, tab: 'distribute', action: undefined, desc: 'إسناد ونقل واستبدال الحصص بنفسك' },
    { label: 'عرض الجدول المدرسي', icon: Table2, tab: 'schedule', action: undefined, desc: 'معاينة وطباعة وتصدير الجداول' },
    { label: 'إدارة البيانات', icon: Database, tab: 'data', action: undefined, desc: 'تصدير واستيراد النسخ الاحتياطية' },
  ];

  const setupSteps = [
    { label: 'أيام الدوام', done: days.length > 0, tab: 'days' as const },
    { label: 'المعلمون', done: data.teachers.length > 0, tab: 'teachers' as const },
    { label: 'الصفوف', done: data.classes.length > 0, tab: 'classes' as const },
    { label: 'نصاب الحصص', done: data.requirements.length > 0, tab: 'requirements' as const },
    { label: 'الجدول', done: !!schedule, tab: 'schedule' as const },
  ];

  return (
    <div className="page-stack dashboard-page">
      {/* بطاقة الترحيب */}
      <motion.section className="dashboard-hero" variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <div className="hero-content">
          <span className="hero-eyebrow"><CalendarDays size={14} />{data.schoolName}</span>
          <h1>لوحة تحكم المدرسة</h1>
          <p>نظرة شاملة على جاهزية الجدول المدرسي وتوزيع الأحمال بين المعلمين والصفوف.</p>
          <div className="hero-meta">
            <span><strong>{days.length}</strong> يوم دراسي</span>
            <span className="hero-sep">•</span>
            <span><strong>{data.teachers.length}</strong> معلم</span>
            <span className="hero-sep">•</span>
            <span><strong>{data.classes.length}</strong> صف</span>
            <span className="hero-sep">•</span>
            <span>العام <strong className="latin">{data.year}</strong></span>
          </div>
        </div>
        <div className="hero-badge">
          {generating ? (
            <>
              <RefreshCw size={26} className="spin" />
              <div><strong>جارٍ التوليد...</strong><span className="numeric">{progress}%</span></div>
            </>
          ) : schedule ? (
            stats.coveragePct >= 100 ? (
              <>
                <CheckCircle2 size={26} />
                <div><strong>الجدول مكتمل</strong><span>{stats.placed} حصة موزعة</span></div>
              </>
            ) : (
              <>
                <AlertTriangle size={26} />
                <div><strong>يحتاج مراجعة</strong><span>{stats.coveragePct}% مغطى</span></div>
              </>
            )
          ) : (
            <>
              <Sparkles size={26} />
              <div><strong>لم يُنشأ بعد</strong><span>ابدأ التوليد الآلي</span></div>
            </>
          )}
        </div>
      </motion.section>

      {/* بطاقات الإحصائيات */}
      <div className="dash-stats-grid">
        {[
          { label: 'المعلمون', value: data.teachers.length, sub: `${stats.activeTeachers} بأيام دوام فعّالة`, icon: Users, color: 'blue', done: data.teachers.length > 0 },
          { label: 'الصفوف الدراسية', value: data.classes.length, sub: `${data.classes.filter(c => classCapacity(data, c.id) > 0).length} بسعة حصص`, icon: GraduationCap, color: 'green', done: data.classes.length > 0 },
          { label: 'حصص موزعة', value: `${stats.placed}`, sub: `من أصل ${stats.requested} حصة مطلوبة`, icon: Table2, color: 'teal', done: stats.placed >= stats.requested && stats.requested > 0 },
          { label: 'نسبة التغطية', value: `${stats.coveragePct}%`, sub: stats.coveragePct >= 100 ? 'اكتمل توزيع الجدول' : `${Math.max(0, stats.requested - stats.placed)} حصة متبقية`, icon: ClipboardList, color: 'amber', done: stats.coveragePct >= 100 },
        ].map((card, i) => (
          <motion.div key={card.label} className={`dash-stat-card stat-${card.color} ${card.done ? 'is-done' : ''}`} variants={fadeUp} initial="hidden" animate="show" custom={i + 1}>
            <div className="stat-icon-wrap"><card.icon size={22} strokeWidth={1.8} /></div>
            <div className="stat-body">
              <span className="stat-label">{card.label}</span>
              <strong className="stat-value">{card.value}</strong>
              <span className="stat-sub">{card.sub}</span>
            </div>
            {card.done && <span className="stat-check"><CheckCircle2 size={18} /></span>}
          </motion.div>
        ))}
      </div>

      {/* خطوات الإعداد السريعة */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
        <Panel title="تقدم الإعداد" description="أكمل هذه الخطوات لتجهيز جدول مدرسي متكامل." icon={CheckCircle2}>
          <div className="setup-stepper">
            {setupSteps.map((step, i) => (
              <button key={step.label} type="button" className={`setup-pill ${step.done ? 'pill-done' : 'pill-todo'}`} onClick={() => goTo(step.tab)}>
                <span className="pill-icon">{step.done ? <CheckCircle2 size={16} /> : <span className="pill-num">{i + 1}</span>}</span>
                <span className="pill-label">{step.label}</span>
                <ArrowUpLeft size={14} className="pill-arrow" />
              </button>
            ))}
          </div>
        </Panel>
      </motion.div>

      {/* الصفين: تغطية الصفوف + أحمال المعلمين */}
      <div className="dash-two-col">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}>
          <Panel title="تغطية الصفوف" description="نسبة الحصص الموزعة من سعة كل صف الأسبوعية." icon={GraduationCap}>
            {stats.classCoverage.length === 0 ? (
              <p className="dash-empty">لم تُضف صفوفاً بعد. ابدأ من قسم «الصفوف الدراسية».</p>
            ) : (
              <div className="coverage-rows">
                {stats.classCoverage.map(cls => (
                  <button key={cls.id} type="button" className="coverage-row-dash" onClick={() => goTo('schedule')}>
                    <div className="coverage-row-head">
                      <strong>{cls.name}</strong>
                      <span className={`coverage-pct ${cls.complete ? 'pct-complete' : ''}`}>{cls.assigned} / {cls.capacity}</span>
                    </div>
                    <div className="progress-track">
                      <motion.div
                        className={cls.complete ? '' : 'partial'}
                        initial={{ width: 0 }}
                        animate={{ width: `${cls.pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                    <span className={`coverage-status ${cls.complete ? 'status-ok' : 'status-pending'}`}>
                      {cls.complete ? 'مكتمل' : `${cls.capacity - cls.assigned} حصة متبقية`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7}>
          <Panel title="أحمال المعلمين" description="الحصص الموزعة لكل معلم مقارنة بطاقته الأسبوعية." icon={Users}>
            {stats.teacherLoad.length === 0 ? (
              <p className="dash-empty">لم يُضف معلمون بعد. ابدأ من قسم «المعلمون».</p>
            ) : (
              <div className="teacher-load-list">
                {stats.teacherLoad.slice(0, 8).map(t => (
                  <button key={t.id} type="button" className="teacher-load-row" onClick={() => goTo('teachers')}>
                    <span className="load-avatar">{t.name.charAt(0)}</span>
                    <div className="load-body">
                      <div className="load-head"><strong>{t.name}</strong><span className="load-nums numeric">{t.assigned} / {t.total}</span></div>
                      <div className="progress-track">
                        <motion.div
                          className={t.loadPct > 90 ? 'over-load' : ''}
                          initial={{ width: 0 }}
                          animate={{ width: `${t.loadPct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="load-sub">طاقة أسبوعية {t.capacity} حصة • {t.workingDaysText ?? ''}</span>
                    </div>
                  </button>
                ))}
                {stats.teacherLoad.length > 8 && (
                  <button type="button" className="see-more" onClick={() => goTo('teachers')}>
                    عرض جميع المعلمين ({stats.teacherLoad.length})<ArrowLeft size={14} />
                  </button>
                )}
              </div>
            )}
          </Panel>
        </motion.div>
      </div>

      {/* التنبيهات والملاحظات */}
      {schedule && (stats.warningCount > 0 || stats.unassigned.length > 0) && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={8}>
          <Panel title="ملاحظات تحتاج انتباهك" description={`${stats.warningCount} تنبيه في الجدول الحالي.`} icon={AlertTriangle} action={
            <Button variant="secondary" icon={MousePointerClick} onClick={() => goTo('distribute')}>إصلاح يدوي<ArrowLeft size={14} /></Button>
          }>
            <div className="warning-list">
              {schedule.warnings.slice(0, 5).map((w, i) => (
                <div key={i} className="warning-item"><AlertTriangle size={15} /><span>{w}</span></div>
              ))}
              {schedule.warnings.length > 5 && <p className="warning-more">+{schedule.warnings.length - 5} تنبيه إضافي... راجع تبويب الجدول للتفاصيل.</p>}
            </div>
          </Panel>
        </motion.div>
      )}

      {/* إجراءات سريعة */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
        <Panel title="إجراءات سريعة" description="أهم العمليات التي تستخدمها يومياً." icon={Sparkles}>
          <div className="quick-actions-grid">
            {quickActions.map(action => (
              <button
                key={action.label}
                type="button"
                className="quick-action-card"
                onClick={() => action.action ? action.action() : action.tab && goTo(action.tab)}
              >
                <span className="qa-icon"><action.icon size={20} strokeWidth={1.7} /></span>
                <div className="qa-body">
                  <strong>{action.label}</strong>
                  <p>{action.desc}</p>
                </div>
                <ArrowLeft size={16} className="qa-arrow" />
              </button>
            ))}
          </div>
        </Panel>
      </motion.div>

      {/* تصدير سريع */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10}>
        <div className="dash-export-bar">
          <div>
            <h3>تصدير وطباعة</h3>
            <p>احصل على جداول الصفوف والمعلمين بصيغة قابلة للطباعة أو CSV.</p>
          </div>
          <div className="export-actions">
            <Button variant="secondary" icon={Printer} onClick={() => goTo('schedule')}>طباعة الجدول</Button>
            <Button variant="secondary" icon={Download} onClick={() => goTo('schedule')}>تصدير CSV</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
