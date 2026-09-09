import { useMemo, useState } from 'react';
import { Apple, Download, LaptopMinimal, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../lib/installPrompt';
import { detectPlatform } from '../lib/platform';
import { Modal } from './ui';

interface Guide { id: string; icon: typeof Smartphone; title: string; steps: string[]; detected: boolean }

/** A topbar button that installs the app on any device: triggers the native prompt where the browser
 * supports it (Android/desktop Chrome & Edge), and otherwise shows step-by-step instructions per platform. */
export default function InstallAppButton() {
  const { canInstall, promptInstall, installed } = useInstallPrompt();
  const [showGuide, setShowGuide] = useState(false);
  const platform = useMemo(detectPlatform, []);

  if (installed) return null;

  const guides: Guide[] = [
    {
      id: 'android',
      icon: Smartphone,
      title: 'أندرويد (Chrome أو متصفح سامسونج)',
      detected: platform.isAndroid,
      steps: [
        'اضغط زر القائمة ⋮ أعلى المتصفح.',
        'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".',
        'اضغط "تثبيت" لإضافة أيقونة جَدوَل لشاشتك الرئيسية.',
      ],
    },
    {
      id: 'ios',
      icon: Apple,
      title: 'آيفون / آيباد (Safari)',
      detected: platform.isIos,
      steps: [
        'اضغط زر المشاركة Share من شريط Safari السفلي.',
        'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).',
        'اضغط "إضافة" أعلى الشاشة.',
      ],
    },
    {
      id: 'desktop',
      icon: LaptopMinimal,
      title: 'ويندوز أو ماك (Chrome أو Edge)',
      detected: (platform.isWindows || platform.isMac) && !platform.isSafari,
      steps: [
        'ابحث عن أيقونة التثبيت ⊕ داخل شريط العنوان (يمين مربع الرابط).',
        'أو افتح قائمة المتصفح ⋮ واختر "تثبيت جَدوَل".',
        'اضغط "تثبيت" لفتحه في نافذته الخاصة كتطبيق مستقل.',
      ],
    },
    {
      id: 'mac-safari',
      icon: Apple,
      title: 'ماك (Safari)',
      detected: platform.isMac && platform.isSafari,
      steps: [
        'من القائمة العلوية اختر File ثم "Add to Dock".',
        'إن لم يظهر الخيار، حدّث Safari إلى macOS Sonoma أو أحدث.',
        'أو استخدم Chrome/Edge على نفس الجهاز لتثبيت كامل.',
      ],
    },
  ];
  const orderedGuides = [...guides].sort((a, b) => Number(b.detected) - Number(a.detected));

  const handleClick = () => {
    if (canInstall) { void promptInstall(); return; }
    setShowGuide(true);
  };

  return (
    <>
      <button type="button" className="topbar-btn-soft install-app-btn" onClick={handleClick} title="تثبيت جَدوَل كتطبيق على هذا الجهاز">
        <Download size={14} />
        <span>تثبيت التطبيق</span>
      </button>

      <Modal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="تثبيت جَدوَل على جهازك"
        description="اختر جهازك أدناه لتثبيت التطبيق ليعمل من الشاشة الرئيسية أو سطح المكتب، بدون متجر تطبيقات."
        wide
      >
        <div className="modal-body">
          <div className="install-guide-grid">
            {orderedGuides.map(guide => (
              <div className={`install-guide-card ${guide.detected ? 'is-detected' : ''}`} key={guide.id}>
                <div className="install-guide-heading">
                  <span className="install-guide-icon"><guide.icon size={18} strokeWidth={1.7} /></span>
                  <strong>{guide.title}</strong>
                  {guide.detected && <span className="install-guide-badge">جهازك الحالي</span>}
                </div>
                <ol>
                  {guide.steps.map((step, index) => <li key={index}>{step}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
