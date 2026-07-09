// Current conditions + today's forecast from Open-Meteo (free, keyless).
// Location comes from WEATHER_LAT / WEATHER_LON.

const CACHE_TTL_MS = 15 * 60_000;
let cache = null; // { report, fetchedAt }

// WMO weather interpretation codes → display label + icon kind.
// https://open-meteo.com/en/docs#weather_variable_documentation
const WMO_CODES = {
  0: ['Clear', 'sun'],
  1: ['Mostly clear', 'sun'],
  2: ['Partly cloudy', 'cloud'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'],
  48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Heavy drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'],
  57: ['Freezing drizzle', 'rain'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Heavy showers', 'rain'],
  85: ['Snow showers', 'snow'],
  86: ['Snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm with hail', 'storm'],
  99: ['Thunderstorm with hail', 'storm'],
};

// Exported for tests.
export function describeWmoCode(code) {
  const [label, kind] = WMO_CODES[code] ?? ['—', 'cloud'];
  return { label, kind };
}

export async function getWeather() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.report;

  const lat = process.env.WEATHER_LAT;
  const lon = process.env.WEATHER_LON;
  if (!lat || !lon) throw new Error('WEATHER_LAT / WEATHER_LON not configured');

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '1',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${JSON.stringify(data)}`);

  const { label, kind } = describeWmoCode(data.current.weather_code);
  const report = {
    current: {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      wind: Math.round(data.current.wind_speed_10m),
      label,
      kind,
    },
    today: {
      hi: Math.round(data.daily.temperature_2m_max[0]),
      lo: Math.round(data.daily.temperature_2m_min[0]),
      precipChance: data.daily.precipitation_probability_max[0] ?? 0,
    },
  };
  cache = { report, fetchedAt: Date.now() };
  return report;
}
