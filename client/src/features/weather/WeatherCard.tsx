import { useWeather } from './useWeather';
import { WeatherIcon, Spinner } from '../../components/icons';

export default function WeatherCard() {
  const { data, isLoading, isError } = useWeather();

  if (isLoading) {
    return (
      <div className="kiosk-card flex items-center justify-center gap-3 rounded-xl bg-slate-900 p-6 text-slate-400">
        <Spinner />
        Weather...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="kiosk-card rounded-xl bg-slate-900 p-4 text-sm text-slate-500">
        Weather unavailable
      </div>
    );
  }

  return (
    <div className="kiosk-card rounded-xl bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-bold tabular-nums">{data.current.temp}°</div>
          <div className="mt-0.5 text-slate-400">{data.current.label}</div>
        </div>
        <span className="text-sky-300">
          <WeatherIcon kind={data.current.kind} className="w-12 h-12" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
        <span>
          H {data.today.hi}° / L {data.today.lo}°
        </span>
        <span>·</span>
        <span>💧 {data.today.precipChance}%</span>
        <span>·</span>
        <span>{data.current.wind} mph</span>
      </div>
    </div>
  );
}
