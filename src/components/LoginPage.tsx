import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  School,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import type { AppData, UserSession } from '../lib/data';
import { Button } from './ui';

interface LoginPageProps {
  data: AppData;
  onLogin: (session: UserSession) => void;
  loadDemo: () => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function LoginPage({ data, onLogin, loadDemo, notify }: LoginPageProps) {
  const [role, setRole] = useState<'admin' | 'teacher' | 'supervisor'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState(data.teachers[0]?.id ?? '');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(data.supervisors[0]?.id ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const adminPass = data.adminPassword || 'admin';
  const hasTeachers = data.teachers.length > 0;
  const hasSupervisors = data.supervisors.length > 0;
  const currentTeacher = data.teachers.find(t => t.id === selectedTeacherId) ?? data.teachers[0];
  const currentSupervisor = data.supervisors.find(s => s.id === selectedSupervisorId) ?? data.supervisors[0];
  const currentSupervisorSection = currentSupervisor ? data.sections.find(section => section.id === currentSupervisor.sectionId) : undefined;

  const handleAdminSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredUsername = username.trim().toLowerCase();
    if (!enteredUsername || enteredUsername === 'admin') {
      if (password.trim() === adminPass) {
        notify(`مرحباً بك في لوحة الإدارة لمدرسة ${data.schoolName}`, 'success');
        onLogin({ role: 'admin' });
      } else {
        setError('كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي admin');
      }
      return;
    }
    const staff = data.staffAccounts.find(item => item.username.toLowerCase() === enteredUsername);
    if (staff && staff.password === password) {
      notify(`مرحباً بك ${staff.name}`, 'success');
      onLogin({ role: 'staff', staffId: staff.id });
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  const handleTeacherSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) {
      notify('الرجاء اختيار المعلم أولاً أو إضافة معلمين من لوحة الإدارة.', 'error');
      return;
    }
    notify(`مرحباً بك أستاذ/ة ${currentTeacher.name}`, 'success');
    onLogin({ role: 'teacher', teacherId: currentTeacher.id });
  };

  const handleSupervisorSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentSupervisor) {
      notify('الرجاء اختيار المشرف أولاً أو إضافة مشرفين من الإعدادات والصلاحيات.', 'error');
      return;
    }
    notify(`مرحباً بك ${currentSupervisor.name}`, 'success');
    onLogin({ role: 'supervisor', supervisorId: currentSupervisor.id });
  };

  const handleQuickAdmin = () => {
    notify(`تم تسجيل الدخول السريع كمسؤول النظام`, 'info');
    onLogin({ role: 'admin' });
  };

  return (
    <div className="login-wrapper" dir="rtl">
      {/* Background ambient elements */}
      <div className="login-ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>

      <div className="login-container">
        {/* Header Branding */}
        <header className="login-header">
          <div className="login-logo-box">
            <span className="login-logo-icon">
              <CalendarDays size={32} strokeWidth={1.8} />
            </span>
            <div className="login-logo-text">
              <h1>جَدوَل</h1>
              <span className="login-sub">نظام توليد وإدارة الجداول المدرسية</span>
            </div>
          </div>
          <div className="school-pill">
            <School size={16} />
            <span>{data.schoolName}</span>
            <span className="dot-sep">•</span>
            <bdi className="latin">{data.year}</bdi>
          </div>
        </header>

        {/* Role Selector Tabs */}
        <div className="login-card">
          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={role === 'teacher'}
              className={`login-tab ${role === 'teacher' ? 'login-tab-active' : ''}`}
              onClick={() => { setRole('teacher'); setError(''); }}
            >
              <Users size={18} />
              <span>بوابة المعلم</span>
              <small>عرض الجدول الشخصي</small>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'supervisor'}
              className={`login-tab ${role === 'supervisor' ? 'login-tab-active' : ''}`}
              onClick={() => { setRole('supervisor'); setError(''); }}
            >
              <Eye size={18} />
              <span>مشرف القسم</span>
              <small>عرض قسمه فقط</small>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'admin'}
              className={`login-tab ${role === 'admin' ? 'login-tab-active' : ''}`}
              onClick={() => { setRole('admin'); setError(''); }}
            >
              <ShieldCheck size={18} />
              <span>الإدارة والموظفون</span>
              <small>المسؤول أو حساب موظف</small>
            </button>
          </div>

          <div className="login-body">
            {role === 'teacher' ? (
              <motion.div
                key="teacher-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="login-intro">
                  <h2>مرحباً بك في بوابة المعلم</h2>
                  <p>اختر اسمك من القائمة للاطلاع المباشر على جدولك الأسبوعي وحصصك المعتمدة وطباعتها.</p>
                </div>

                {hasTeachers ? (
                  <form onSubmit={handleTeacherSubmit} className="login-form">
                    <label className="login-field">
                      <span className="login-field-label">
                        <Users size={16} />
                        اختر اسم المعلم
                      </span>
                      <select
                        value={currentTeacher?.id ?? ''}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="login-select"
                        required
                      >
                        {data.teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.code ? `(${t.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    {currentTeacher && (
                      <div className="teacher-preview-box">
                        <div className="t-preview-header">
                          <span className="t-avatar">{currentTeacher.name.charAt(0)}</span>
                          <div>
                            <strong>{currentTeacher.name}</strong>
                            <span>رمز المعلم: <bdi className="latin">{currentTeacher.code || 'بدون رمز'}</bdi></span>
                          </div>
                        </div>
                        <div className="t-preview-stats">
                          <div>
                            <span>أيام الدوام:</span>
                            <strong>
                              {data.days
                                .filter(d => d.enabled && currentTeacher.days.includes(d.id))
                                .map(d => d.short)
                                .join('، ') || 'غير محدد'}
                            </strong>
                          </div>
                          <div>
                            <span>الحصص المخصصة:</span>
                            <strong className="numeric">
                              {data.requirements
                                .filter(r => r.teacherId === currentTeacher.id)
                                .reduce((s, r) => s + r.count, 0)} حصة
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" icon={LogIn} className="login-submit-btn">
                      دخول وعرض جدولي الأسبوعي
                    </Button>
                  </form>
                ) : (
                  <div className="login-empty-teachers">
                    <GraduationCap size={36} className="text-muted" />
                    <h3>لا توجد بيانات معلمين مسجلة بعد</h3>
                    <p>قم بالدخول كمسؤول لإضافة المعلمين والفصول أو تجربة المدرسة التجريبية الجاهزة.</p>
                    <div className="login-empty-actions">
                      <Button variant="secondary" icon={Sparkles} onClick={loadDemo}>
                        تحميل مدرسة تجريبية جاهزة
                      </Button>
                      <Button onClick={() => setRole('admin')}>
                        الدخول كمسؤول المدرسة
                        <ArrowLeft size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : role === 'supervisor' ? (
              <motion.div
                key="supervisor-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="login-intro">
                  <h2>مرحباً بك في بوابة مشرف القسم</h2>
                  <p>اختر اسمك من القائمة لعرض جدول وصفوف قسمك فقط، بصلاحية اطّلاع دون تعديل.</p>
                </div>

                {hasSupervisors ? (
                  <form onSubmit={handleSupervisorSubmit} className="login-form">
                    <label className="login-field">
                      <span className="login-field-label">
                        <Eye size={16} />
                        اختر اسم المشرف
                      </span>
                      <select
                        value={currentSupervisor?.id ?? ''}
                        onChange={(e) => setSelectedSupervisorId(e.target.value)}
                        className="login-select"
                        required
                      >
                        {data.supervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {currentSupervisor && (
                      <div className="teacher-preview-box">
                        <div className="t-preview-header">
                          <span className="t-avatar">{currentSupervisor.name.charAt(0)}</span>
                          <div>
                            <strong>{currentSupervisor.name}</strong>
                            <span>القسم المُسند: <strong>{currentSupervisorSection?.name || 'غير محدد'}</strong></span>
                          </div>
                        </div>
                        <div className="t-preview-stats">
                          <div>
                            <span>عدد الفصول:</span>
                            <strong className="numeric">{currentSupervisorSection?.classIds.length ?? 0} فصل</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" icon={LogIn} className="login-submit-btn">
                      دخول وعرض قسمي
                    </Button>
                  </form>
                ) : (
                  <div className="login-empty-teachers">
                    <Eye size={36} className="text-muted" />
                    <h3>لا توجد بيانات مشرفين مسجلة بعد</h3>
                    <p>قم بالدخول كمسؤول لإنشاء الأقسام وإسناد مشرفين لها من الإعدادات والصلاحيات.</p>
                    <div className="login-empty-actions">
                      <Button onClick={() => setRole('admin')}>
                        الدخول كمسؤول المدرسة
                        <ArrowLeft size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="admin-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="login-intro">
                  <h2>لوحة إدارة وتنفيذ الجدول</h2>
                  <p>سجّل دخولك كمسؤول، أو بحساب موظف (مدير مساعد، مشرف، رئيس قسم...) بصلاحياته الخاصة.</p>
                </div>

                <form onSubmit={handleAdminSubmit} className="login-form">
                  <label className="login-field">
                    <span className="login-field-label">
                      <UserCheck size={16} />
                      اسم المستخدم
                    </span>
                    <input
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(''); }}
                      placeholder="اتركه فارغاً لتسجيل الدخول كمسؤول"
                      className="login-input"
                      autoFocus
                    />
                  </label>
                  <label className="login-field">
                    <span className="login-field-label">
                      <Lock size={16} />
                      كلمة المرور
                    </span>
                    <div className="password-input-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="أدخل كلمة المرور..."
                        className="login-input"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  {error && (
                    <div className="login-error-msg" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="admin-password-hint">
                    <KeyRound size={15} />
                    <span>
                      اترك اسم المستخدم فارغاً لتسجيل الدخول كمسؤول (كلمة المرور الافتراضية: <code>admin</code>)، أو أدخل بيانات حساب موظف أنشأه المسؤول.
                    </span>
                  </div>

                  <div className="login-actions-group">
                    <Button type="submit" icon={LogIn} className="login-submit-btn">
                      تسجيل الدخول
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={UserCheck}
                      onClick={handleQuickAdmin}
                      className="quick-admin-btn"
                    >
                      دخول سريع مباشر كمسؤول
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </div>

        {/* Informative Highlights */}
        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon"><CheckCircle2 size={18} /></span>
            <div>
              <strong>توزيع ذكي ومتوازن</strong>
              <p>توليد آلي يراعي أنصبة المعلمين، وتجنب التعارض، وتفريغ الحصص بمرونة.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon"><CheckCircle2 size={18} /></span>
            <div>
              <strong>جداول مخصصة للمعلمين</strong>
              <p>لكل معلم جدول شخصي يمكن طباعته بحجم A4 أو تصديره لجواله بسهولة.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon"><CheckCircle2 size={18} /></span>
            <div>
              <strong>حفظ محلي آمن 100%</strong>
              <p>بياناتك محفوظة على جهازك دون إرسالها إلى خوادم خارجية حفاظاً على الخصوصية.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <span>نظام جَدوَل المدرسي • حفظ تلقائي في المتصفح</span>
        </footer>
      </div>
    </div>
  );
}
