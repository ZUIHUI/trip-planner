
async function checkGeocoding(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`${name}:`, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await checkGeocoding('桃園機場');
  await checkGeocoding('Taoyuan Airport');
}

run();
