import GlassCard from '../ui/GlassCard.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import Badge from '../ui/Badge.jsx';

const LEVEL_COLOR = {
  level_3: { bar: 'success', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Level 3' },
  level_2: { bar: 'primary', text: 'text-primary',     badge: 'bg-primary/10 text-primary border-primary/20',       label: 'Level 2' },
  level_1: { bar: 'warning', text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Level 1' },
  not_met:  { bar: 'danger',  text: 'text-red-600',     badge: 'bg-red-100 text-red-700 border-red-200',             label: 'Not Met' },
};

export default function COCard({ co }) {
  const c = LEVEL_COLOR[co.level] ?? LEVEL_COLOR.not_met;

  return (
    <GlassCard className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-on-surface leading-snug text-sm">{co.co_code.split('-').pop()}: {co.description}</h4>
          {co.contributing_dimensions?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {co.contributing_dimensions.map((d) => (
                <span key={d} className="px-2.5 py-1 rounded-full bg-white/40 text-[9px] font-bold text-on-surface-variant uppercase border border-white/20">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right ml-4">
          <p className={`text-2xl font-extrabold font-headline ${c.text}`}>{co.percentage?.toFixed(1)}%</p>
          <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold mt-1 border ${c.badge}`}>
            {c.label}
          </span>
        </div>
      </div>
      <ProgressBar value={co.percentage} color={c.bar} />
    </GlassCard>
  );
}
