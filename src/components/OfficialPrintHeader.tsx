import type { AppData } from '../lib/data';

/**
 * Kuwait MOE-style letterhead: hidden on screen, shown only when printing (see `.official-print-header`
 * in index.css). Add `data.showOfficialHeader = false` to opt out for schools outside this system.
 */
export function OfficialPrintHeader({ data, subtitle }: { data: AppData; subtitle: string }) {
  if (!data.showOfficialHeader) return null;
  return (
    <div className="official-print-header">
      <div className="official-header-row official-header-top">
        <span>دولة الكويت</span>
        <span>وزارة التربية</span>
        <span>{data.educationZone ? `منطقة ${data.educationZone} التعليمية` : 'المنطقة التعليمية'}</span>
      </div>
      <div className="official-header-row official-header-school">
        <strong>{data.schoolName}</strong>
        <span>{data.stage}</span>
        <span>{data.semester} - <bdi>{data.year}</bdi></span>
        {data.schoolCode && <span>الرقم الوزاري: <bdi>{data.schoolCode}</bdi></span>}
      </div>
      <h2 className="official-header-title">{subtitle}</h2>
    </div>
  );
}

export function OfficialPrintFooter({ role = 'معلم الفصل' }: { role?: string }) {
  return (
    <div className="official-print-footer">
      <div className="sign-block"><span>توقيع {role}</span><div className="sign-line" /></div>
      <div className="sign-block"><span>اعتماد إدارة المدرسة</span><div className="sign-line" /></div>
      <div className="stamp-block"><span>الختم الرسمي</span><div className="stamp-box" /></div>
    </div>
  );
}
