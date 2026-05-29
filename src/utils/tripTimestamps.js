export const getLatestIsoTimestamp = (...values) => {
  let latestValue = '';
  let latestTime = -Infinity;

  values.flat().forEach((value) => {
    if (!value) return;
    const text = String(value);
    const time = new Date(text).getTime();
    if (!Number.isFinite(time) || time <= latestTime) return;
    latestValue = text;
    latestTime = time;
  });

  return latestValue;
};
