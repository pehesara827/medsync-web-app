const DEFAULT_STATS = [
  {
    title: 'TOTAL SCHEDULED',
    value: '0',
    icon: (
      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    iconBg: 'bg-indigo-50',
  },
  {
    title: 'COMPLETED VISITS',
    value: '0',
    icon: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    iconBg: 'bg-emerald-50',
  },
  {
    title: 'WAITLIST STATUS',
    value: '0',
    unit: 'Pending',
    icon: (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-amber-50',
  },
];

export default function QuickStats({
  totalScheduled = 0,
  completedVisits = 0,
  waitlist = 0,
}) {
  const stats = DEFAULT_STATS.map((stat) => {
    if (stat.title === 'TOTAL SCHEDULED') return { ...stat, value: String(totalScheduled) };
    if (stat.title === 'COMPLETED VISITS') return { ...stat, value: String(completedVisits) };
    if (stat.title === 'WAITLIST STATUS') return { ...stat, value: String(waitlist) };
    return stat;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-4 w-full">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {stat.title}
            </span>
            {stat.icon && (
              <div className={`p-2 rounded-xl ${stat.iconBg}`}>
                {stat.icon}
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {stat.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}