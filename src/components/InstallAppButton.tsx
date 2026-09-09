import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { useInstallPrompt } from '../lib/installPrompt';
import { Modal } from './ui';

/** A topbar button that triggers the native "install app" prompt, or shows iOS instructions when that API isn't available. */
export default function InstallAppButton() {
  const { canInstall, promptInstall, installed, isIos } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed) return null;

  if (canInstall) {
    return (
      <button type="button" className="topbar-btn-soft" onClick={() => void promptInstall()} title="تثبيت جَدوَل كتطبيق على هذا الجهاز">
        <Download size={14} />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  if (isIos) {
    return (
      <>
        <button type="button" className="topbar-btn-soft" onClick={() => setShowIosHelp(true)} title="إضافة جَدوَل للشاشة الرئيسية">
          <Share size={14} />
          <span>تثبيت على الآيفون</span>
        </button>
        <Modal open={showIosHelp} onClose={() => setShowIosHelp(false)} title="تثبيت جَدوَل على آيفون / آيباد" description="أضِف التطبيق لشاشتك الرئيسية ليعمل مثل أي تطبيق آخر.">
          <div className="modal-body">
            <ol className="help-steps">
              <li>
                <span>01</span>
                <div><p>اضغط زر المشاركة <strong>Share</strong> أسفل متصفح Safari.</p></div>
              </li>
              <li>
                <span>02</span>
                <div><p>اختر <strong>إضافة إلى الشاشة الرئيسية</strong> (Add to Home Screen) من القائمة.</p></div>
              </li>
              <li>
                <span>03</span>
                <div><p>اضغط <strong>إضافة</strong>، وستظهر أيقونة جَدوَل على شاشتك الرئيسية كتطبيق مستقل.</p></div>
              </li>
            </ol>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
