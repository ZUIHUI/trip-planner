const directionLabels = {
  outbound: '去程',
  inbound: '回程'
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const readDayNumber = (day) => {
  const dayNumber = Number(day?.day);
  return Number.isFinite(dayNumber) ? dayNumber : null;
};

const isSameDayValue = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber === rightNumber;
  }

  return String(left || '') === String(right || '');
};

const buildAirportDayFlight = (direction, flight = {}) => {
  const safeFlight = flight && typeof flight === 'object' ? flight : {};
  const code = cleanString(safeFlight.code);

  return {
    id: `${direction}-airport-day-flight`,
    direction,
    label: directionLabels[direction] || '航班',
    flight: safeFlight,
    code,
    airline: cleanString(safeFlight.airline),
    date: cleanString(safeFlight.date),
    departureTime: cleanString(safeFlight.departureTime),
    arrivalTime: cleanString(safeFlight.arrivalTime),
    dep: cleanString(safeFlight.dep),
    arr: cleanString(safeFlight.arr),
    depTerminal: cleanString(safeFlight.depTerminal),
    arrTerminal: cleanString(safeFlight.arrTerminal),
    hasFlightCode: Boolean(code)
  };
};

export const getAirportDayFlights = ({
  itinerary = [],
  selectedDay = 1,
  tripDetails = {}
} = {}) => {
  const days = asArray(itinerary).filter((day) => day && typeof day === 'object');
  if (!days.length) return [];

  const selectedDayItem = days.find((day) => isSameDayValue(day.day, selectedDay));
  if (!selectedDayItem) return [];

  const orderedDays = [...days].sort((left, right) => {
    const leftDayNumber = readDayNumber(left);
    const rightDayNumber = readDayNumber(right);

    if (leftDayNumber !== null && rightDayNumber !== null) {
      return leftDayNumber - rightDayNumber;
    }

    if (leftDayNumber !== null) return -1;
    if (rightDayNumber !== null) return 1;
    return 0;
  });
  const firstDay = orderedDays[0];
  const lastDay = orderedDays[orderedDays.length - 1];
  const flights = tripDetails?.flights || {};
  const airportFlights = [];

  if (isSameDayValue(selectedDayItem.day, firstDay.day)) {
    airportFlights.push(buildAirportDayFlight('outbound', flights.outbound));
  }

  if (isSameDayValue(selectedDayItem.day, lastDay.day)) {
    airportFlights.push(buildAirportDayFlight('inbound', flights.inbound));
  }

  return airportFlights;
};
