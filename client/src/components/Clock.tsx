import { useEffect, useState } from 'react';

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-xl font-semibold tabular-nums">
        {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div className="text-sm text-slate-400">
        {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
