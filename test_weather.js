
const COORDS = {
  'Taipei': { lat: 25.0330, lon: 121.5654 },
  'Tokyo': { lat: 35.6895, lon: 139.7037 }
};

async function checkWeather(name, lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`${name}:`, JSON.stringify(data.current));
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await checkWeather('Taipei', COORDS['Taipei'].lat, COORDS['Taipei'].lon);
  await checkWeather('Tokyo', COORDS['Tokyo'].lat, COORDS['Tokyo'].lon);
}

run();
