import { motion } from 'framer-motion';
import { BarChart3, CalendarDays, Clock, Info, RotateCcw } from 'lucide-react';
import { defaultDays, defaultPeriodTimes, isValidTimeString, weeklyPeriods } from '../lib/data';
import { Button, Counter, NextFooter, Panel, Toggle, type WorkspaceProps } from './ui';

export default function DaysPage({ data, commit, goTo, notify, confirm }: WorkspaceProps) {
  const activeDays = data.days.filter(day => day.enabled);
  const total = weeklyPeriods(data);
  const maxPeriods = Math.max(1, ...activeDays.map(day => day.periods));
  const updateDay = (id: string, changes: { enabled?: boolean; periods?: number }) => commit(previous => ({ days: previous.days.map(day => day.id === id ? { ...day, ...changes } : day) }));
  const updatePeriodTime = (index: number, value: string) => commit(previous => {
    const next = [...previous.periodTimes];
    next[index] = value;
    return { periodTimes: next };
  });
  const reset = () => confirm('استعادة أيام الدوام الافتراضية؟', 'سيصبح الدوام من الأحد إلى الخميس، بواقع 7 حصص يومياً. ستبقى بيانات المعلمين والصفوف محفوظة، ويلزم إعادة توليد الجدول.', () => {
    commit({ days: defaultDays.map(day => ({ ...day })) });
    notify('تمت استعادة إعدادات الأسبوع الافتراضية.');
  });
  const resetPeriodTimes = () => commit({ periodTimes: defaultPeriodTimes() });

  return <div className="page-stack">
    <Panel title="أيام الدوام" description="حدّد أيام الأسبوع الدراسي وعدد الحصص في كل يوم." icon={CalendarDays} className="days-panel" action={<Button variant="ghost" icon={RotateCcw} onClick={reset}>استعادة الافتراضي</Button>}>
      <div className="days-layout">
        <div className="days-table-wrap">
          <table className="days-table"><thead><tr><th>اليوم الدراسي</th><th>حالة الدوام</th><th>عدد الحصص</th></tr></thead>
            <tbody>{data.days.map(day => <tr key={day.id} className={day.enabled ? '' : 'day-inactive'}>
              <td><span className="day-name">{day.name}</span>{!day.enabled && <span className="holiday-label">عطلة أسبوعية</span>}</td>
              <td><div className="day-status"><Toggle checked={day.enabled} onChange={() => updateDay(day.id, { enabled: !day.enabled })} label={`تفعيل الدوام يوم ${day.name}`} /><span>{day.enabled ? 'يوم دراسي' : 'عطلة'}</span></div></td>
              <td><Counter value={day.periods} onChange={periods => updateDay(day.id, { periods })} disabled={!day.enabled} label={`عدد حصص يوم ${day.name}`} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <aside className="week-summary" aria-label="ملخص الأسبوع الدراسي">
          <h3><BarChart3 size={17} strokeWidth={1.7} />أسبوعك في لمحة</h3>
          <div className="week-total"><motion.strong key={total} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{total}</motion.strong><span>حصة دراسية أسبوعياً</span></div>
          <div className="week-chart" aria-label={`${total} حصة موزعة على ${activeDays.length} أيام`}>{data.days.map(day => <div className="chart-day" key={day.id}>
            <div className="chart-bar-track"><motion.div className={`chart-bar ${!day.enabled ? 'chart-bar-off' : ''}`} initial={false} animate={{ height: day.enabled ? `${Math.max(18, day.periods / 12 * 100)}%` : '7%' }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} /></div>
            <span>{day.short}</span>
          </div>)}</div>
          <div className="week-facts"><div><span>أيام الدوام</span><strong>{activeDays.length} <span>أيام</span></strong></div><div><span>أيام العطلة</span><strong>{7 - activeDays.length} <span>أيام</span></strong></div></div>
          <div className="summary-tip"><Info size={16} /><p>تُطبّق هذه الإعدادات على جميع الصفوف. يمكنك تخصيص الحالات الخاصة من <button onClick={() => goTo('exceptions')}>الاستثناءات</button>.</p></div>
        </aside>
      </div>
      <NextFooter label="التالي: المعلمون" onNext={() => goTo('teachers')} disabled={!activeDays.length} note={activeDays.length ? 'تُحفظ تغييراتك تلقائياً على هذا الجهاز' : 'فعّل يوماً دراسياً واحداً على الأقل للمتابعة'} />
    </Panel>

    <Panel
      title="أوقات بدء الحصص"
      description="حدّد ساعة بدء كل حصة لتصل تذكيرات الحصة القادمة للمعلمين في وقتها الصحيح."
      icon={Clock}
      className="period-times-panel"
      action={<Button variant="ghost" icon={RotateCcw} onClick={resetPeriodTimes}>استعادة الافتراضي</Button>}
    >
      <div className="period-times-grid">
        {Array.from({ length: maxPeriods }, (_, index) => index).map(index => (
          <label className="period-time-field" key={index}>
            <span>الحصة {index + 1}</span>
            <input
              type="time"
              value={isValidTimeString(data.periodTimes[index]) ? data.periodTimes[index] : ''}
              onChange={event => updatePeriodTime(index, event.target.value)}
              aria-label={`وقت بدء الحصة ${index + 1}`}
            />
          </label>
        ))}
      </div>
    </Panel>
  </div>;
}