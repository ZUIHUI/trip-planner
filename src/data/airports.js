export const AIRPORTS = [
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', name: 'Taiwan Taoyuan International Airport', aliases: ['Taoyuan', 'Taipei'] },
  { code: 'TSA', city: 'Taipei', country: 'Taiwan', name: 'Taipei Songshan Airport', aliases: ['Songshan', 'Taipei'] },
  { code: 'KHH', city: 'Kaohsiung', country: 'Taiwan', name: 'Kaohsiung International Airport', aliases: ['Kaohsiung'] },
  { code: 'RMQ', city: 'Taichung', country: 'Taiwan', name: 'Taichung International Airport', aliases: ['Taichung'] },
  { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', name: 'Hong Kong International Airport', aliases: ['Chek Lap Kok'] },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita International Airport', aliases: ['Narita'] },
  { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Haneda Airport', aliases: ['Tokyo Haneda'] },
  { code: 'KIX', city: 'Osaka', country: 'Japan', name: 'Kansai International Airport', aliases: ['Kansai', 'Osaka'] },
  { code: 'ITM', city: 'Osaka', country: 'Japan', name: 'Osaka Itami Airport', aliases: ['Itami'] },
  { code: 'NGO', city: 'Nagoya', country: 'Japan', name: 'Chubu Centrair International Airport', aliases: ['Centrair', 'Nagoya'] },
  { code: 'CTS', city: 'Sapporo', country: 'Japan', name: 'New Chitose Airport', aliases: ['Chitose', 'Sapporo'] },
  { code: 'FUK', city: 'Fukuoka', country: 'Japan', name: 'Fukuoka Airport', aliases: ['Fukuoka'] },
  { code: 'OKA', city: 'Okinawa', country: 'Japan', name: 'Naha Airport', aliases: ['Naha'] },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', name: 'Incheon International Airport', aliases: ['Incheon', 'Seoul'] },
  { code: 'GMP', city: 'Seoul', country: 'South Korea', name: 'Gimpo International Airport', aliases: ['Gimpo', 'Seoul'] },
  { code: 'PUS', city: 'Busan', country: 'South Korea', name: 'Gimhae International Airport', aliases: ['Busan', 'Gimhae'] },
  { code: 'CJU', city: 'Jeju', country: 'South Korea', name: 'Jeju International Airport', aliases: ['Jeju'] },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi Airport', aliases: ['Bangkok'] },
  { code: 'DMK', city: 'Bangkok', country: 'Thailand', name: 'Don Mueang International Airport', aliases: ['Don Mueang', 'Bangkok'] },
  { code: 'CNX', city: 'Chiang Mai', country: 'Thailand', name: 'Chiang Mai International Airport', aliases: ['Chiang Mai'] },
  { code: 'HKT', city: 'Phuket', country: 'Thailand', name: 'Phuket International Airport', aliases: ['Phuket'] },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Singapore Changi Airport', aliases: ['Changi'] },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur International Airport', aliases: ['KLIA'] },
  { code: 'PEN', city: 'Penang', country: 'Malaysia', name: 'Penang International Airport', aliases: ['Penang'] },
  { code: 'BKI', city: 'Kota Kinabalu', country: 'Malaysia', name: 'Kota Kinabalu International Airport', aliases: ['Kota Kinabalu'] },
  { code: 'CGK', city: 'Jakarta', country: 'Indonesia', name: 'Soekarno Hatta International Airport', aliases: ['Jakarta'] },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', name: 'Ngurah Rai International Airport', aliases: ['Denpasar', 'Bali'] },
  { code: 'MNL', city: 'Manila', country: 'Philippines', name: 'Ninoy Aquino International Airport', aliases: ['Manila'] },
  { code: 'CEB', city: 'Cebu', country: 'Philippines', name: 'Mactan Cebu International Airport', aliases: ['Cebu'] },
  { code: 'HAN', city: 'Hanoi', country: 'Vietnam', name: 'Noi Bai International Airport', aliases: ['Hanoi'] },
  { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', name: 'Tan Son Nhat International Airport', aliases: ['Saigon', 'Ho Chi Minh'] },
  { code: 'DAD', city: 'Da Nang', country: 'Vietnam', name: 'Da Nang International Airport', aliases: ['Da Nang'] },
  { code: 'PNH', city: 'Phnom Penh', country: 'Cambodia', name: 'Phnom Penh International Airport', aliases: ['Phnom Penh'] },
  { code: 'REP', city: 'Siem Reap', country: 'Cambodia', name: 'Siem Reap International Airport', aliases: ['Siem Reap'] },
  { code: 'DYG', city: 'Zhangjiajie', country: 'China', name: 'Zhangjiajie Hehua International Airport', aliases: ['Zhangjiajie'] },
  { code: 'PVG', city: 'Shanghai', country: 'China', name: 'Shanghai Pudong International Airport', aliases: ['Pudong', 'Shanghai'] },
  { code: 'SHA', city: 'Shanghai', country: 'China', name: 'Shanghai Hongqiao International Airport', aliases: ['Hongqiao', 'Shanghai'] },
  { code: 'PEK', city: 'Beijing', country: 'China', name: 'Beijing Capital International Airport', aliases: ['Beijing Capital'] },
  { code: 'PKX', city: 'Beijing', country: 'China', name: 'Beijing Daxing International Airport', aliases: ['Daxing', 'Beijing'] },
  { code: 'CAN', city: 'Guangzhou', country: 'China', name: 'Guangzhou Baiyun International Airport', aliases: ['Guangzhou'] },
  { code: 'SZX', city: 'Shenzhen', country: 'China', name: 'Shenzhen Baoan International Airport', aliases: ['Shenzhen'] },
  { code: 'MFM', city: 'Macau', country: 'Macau', name: 'Macau International Airport', aliases: ['Macau'] },
  { code: 'LAX', city: 'Los Angeles', country: 'United States', name: 'Los Angeles International Airport', aliases: ['LA', 'Los Angeles'] },
  { code: 'SFO', city: 'San Francisco', country: 'United States', name: 'San Francisco International Airport', aliases: ['San Francisco'] },
  { code: 'SEA', city: 'Seattle', country: 'United States', name: 'Seattle Tacoma International Airport', aliases: ['Seattle', 'SeaTac'] },
  { code: 'JFK', city: 'New York', country: 'United States', name: 'John F Kennedy International Airport', aliases: ['New York', 'JFK'] },
  { code: 'EWR', city: 'New York', country: 'United States', name: 'Newark Liberty International Airport', aliases: ['Newark', 'New York'] },
  { code: 'ORD', city: 'Chicago', country: 'United States', name: 'Chicago OHare International Airport', aliases: ['Chicago'] },
  { code: 'YVR', city: 'Vancouver', country: 'Canada', name: 'Vancouver International Airport', aliases: ['Vancouver'] },
  { code: 'YYZ', city: 'Toronto', country: 'Canada', name: 'Toronto Pearson International Airport', aliases: ['Toronto'] },
  { code: 'LHR', city: 'London', country: 'United Kingdom', name: 'London Heathrow Airport', aliases: ['Heathrow', 'London'] },
  { code: 'LGW', city: 'London', country: 'United Kingdom', name: 'London Gatwick Airport', aliases: ['Gatwick', 'London'] },
  { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle Airport', aliases: ['Paris'] },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', name: 'Amsterdam Schiphol Airport', aliases: ['Schiphol', 'Amsterdam'] },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', name: 'Frankfurt Airport', aliases: ['Frankfurt'] },
  { code: 'MUC', city: 'Munich', country: 'Germany', name: 'Munich Airport', aliases: ['Munich'] },
  { code: 'DXB', city: 'Dubai', country: 'United Arab Emirates', name: 'Dubai International Airport', aliases: ['Dubai'] },
  { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad International Airport', aliases: ['Doha'] },
  { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Sydney Kingsford Smith Airport', aliases: ['Sydney'] },
  { code: 'MEL', city: 'Melbourne', country: 'Australia', name: 'Melbourne Airport', aliases: ['Melbourne'] }
];

export const normalizeAirportCode = (value = '') =>
  String(value || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);

export const isValidAirportCode = (value = '') => /^[A-Z]{3}$/.test(normalizeAirportCode(value));

export const searchAirports = (query = '', limit = 8) => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const normalizedCode = normalizeAirportCode(query);

  if (!normalizedQuery) {
    return AIRPORTS.slice(0, limit);
  }

  return AIRPORTS
    .map((airport) => {
      const haystack = [
        airport.code,
        airport.city,
        airport.country,
        airport.name,
        ...(airport.aliases || [])
      ].join(' ').toLowerCase();
      const exactCodeScore = normalizedCode && airport.code === normalizedCode ? 0 : 10;
      const startsWithScore = airport.code.toLowerCase().startsWith(normalizedQuery) ? 1 : 10;
      const cityScore = airport.city.toLowerCase().startsWith(normalizedQuery) ? 2 : 10;
      const includesScore = haystack.includes(normalizedQuery) ? 3 : 10;
      return { airport, score: Math.min(exactCodeScore, startsWithScore, cityScore, includesScore) };
    })
    .filter((item) => item.score < 10)
    .sort((a, b) => a.score - b.score || a.airport.code.localeCompare(b.airport.code))
    .slice(0, limit)
    .map((item) => item.airport);
};
