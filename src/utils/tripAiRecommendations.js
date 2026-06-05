const MAX_RECOMMENDATIONS = 5;
const VALID_EVENT_TYPES = new Set([
  'flight',
  'transport',
  'accommodation',
  'sightseeing',
  'food',
  'shopping',
  'activity',
  'other'
]);

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

export const cleanAiText = (value, maxLength = 160) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const normalizeTime = (value) => {
  const match = cleanAiText(value, 16).match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const normalizeDay = (value, fallback = 1) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
};

const normalizeCoordinate = (value, maxAbs) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.abs(number) <= maxAbs ? number : null;
};

const normalizeTags = (tags) => asArray(tags)
  .map((tag) => cleanAiText(tag, 24))
  .filter(Boolean)
  .slice(0, 4);

const normalizeGooglePlace = (place = {}) => {
  const source = asObject(place);
  return {
    placeId: cleanAiText(source.placeId || source.place_id, 180),
    name: cleanAiText(source.name, 160),
    address: cleanAiText(source.address || source.formatted_address, 220),
    lat: normalizeCoordinate(source.lat, 90),
    lng: normalizeCoordinate(source.lng, 180),
    types: normalizeTags(source.types)
  };
};

export const normalizeAiRecommendation = (recommendation = {}, index = 0) => {
  const source = asObject(recommendation);
  const placeDraft = asObject(source.placeDraft);
  const eventDraft = asObject(source.eventDraft);
  const googlePlace = normalizeGooglePlace(source.googlePlace);
  const title = cleanAiText(source.title || placeDraft.name || eventDraft.title || googlePlace.name, 120);
  const locationText = cleanAiText(source.locationText || placeDraft.address || eventDraft.location || googlePlace.address || title, 180);
  const eventType = VALID_EVENT_TYPES.has(eventDraft.type) ? eventDraft.type : 'sightseeing';
  const durationMinutes = Math.max(0, Math.min(720, Math.round(Number(
    source.durationMinutes || eventDraft.durationMinutes || 0
  ) || 0)));
  const recommendationSource = (source.source === 'google_places' || googlePlace.placeId)
    ? 'google_places'
    : 'ai';

  if (!title && !locationText) return null;

  return {
    id: cleanAiText(source.id, 80) || `ai-rec-${index + 1}`,
    kind: source.kind === 'event' ? 'event' : 'place',
    title: title || locationText,
    locationText,
    suggestedDay: normalizeDay(source.suggestedDay, 1),
    time: normalizeTime(source.time || eventDraft.time),
    durationMinutes,
    reason: cleanAiText(source.reason, 280),
    caution: cleanAiText(source.caution, 220),
    tags: normalizeTags(source.tags),
    source: recommendationSource,
    googlePlace,
    placeDraft: {
      name: cleanAiText(placeDraft.name || googlePlace.name || title || locationText, 120),
      address: cleanAiText(placeDraft.address || googlePlace.address || locationText || title, 180),
      note: cleanAiText(placeDraft.note || source.reason, 280)
    },
    eventDraft: {
      title: cleanAiText(eventDraft.title || title || locationText, 120),
      location: cleanAiText(eventDraft.location || locationText || title, 180),
      time: normalizeTime(eventDraft.time || source.time),
      type: eventType,
      desc: cleanAiText(eventDraft.desc || source.reason, 320),
      durationMinutes
    }
  };
};

export const normalizeAiRecommendationResponse = (payload = {}) => {
  const source = asObject(payload);
  const recommendations = asArray(source.recommendations)
    .map(normalizeAiRecommendation)
    .filter(Boolean)
    .slice(0, MAX_RECOMMENDATIONS);

  return {
    generatedAt: cleanAiText(source.generatedAt, 48),
    headline: cleanAiText(source.headline, 120) || 'AI 旅伴建議',
    companionLine: cleanAiText(source.companionLine, 180) || '我先整理成候選卡，你再決定要不要加入旅程。',
    recommendations
  };
};

export const makeAiPlaceId = () => `ai-place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const makeAiEventId = () => `ai-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildNoteText = (recommendation) => [
  recommendation.reason ? `AI 建議：${recommendation.reason}` : '',
  recommendation.caution ? `提醒：${recommendation.caution}` : '',
  recommendation.suggestedDay ? `建議 Day ${recommendation.suggestedDay}` : '',
  recommendation.tags?.length ? `標籤：${recommendation.tags.join('、')}` : ''
].filter(Boolean).join('\n');

export const createPlaceFromAiRecommendation = (recommendation = {}) => {
  const normalized = normalizeAiRecommendation(recommendation) || {};
  const googlePlace = normalized.googlePlace || {};
  const name = cleanAiText(googlePlace.name || normalized.placeDraft?.name || normalized.title || normalized.locationText, 120);
  const address = cleanAiText(googlePlace.address || normalized.placeDraft?.address || normalized.locationText || name, 180);

  return {
    id: makeAiPlaceId(),
    name,
    address,
    placeId: cleanAiText(googlePlace.placeId, 180),
    lat: normalizeCoordinate(googlePlace.lat, 90),
    lng: normalizeCoordinate(googlePlace.lng, 180),
    note: buildNoteText(normalized),
    status: 'idea',
    plannedDay: null,
    addedAt: new Date().toISOString(),
    plannedAt: '',
    votes: []
  };
};

export const createEventFromAiRecommendation = (recommendation = {}) => {
  const normalized = normalizeAiRecommendation(recommendation) || {};
  const eventDraft = normalized.eventDraft || {};
  const googlePlace = normalized.googlePlace || {};
  const title = cleanAiText(eventDraft.title || normalized.title || normalized.locationText, 120);
  const location = cleanAiText(eventDraft.location || googlePlace.address || normalized.locationText || title, 180);
  const durationText = normalized.durationMinutes > 0 ? `${normalized.durationMinutes} 分鐘` : '';
  const desc = [
    cleanAiText(eventDraft.desc || normalized.reason, 320),
    normalized.caution ? `提醒：${normalized.caution}` : ''
  ].filter(Boolean).join('\n');

  return {
    id: makeAiEventId(),
    time: normalizeTime(eventDraft.time || normalized.time),
    type: VALID_EVENT_TYPES.has(eventDraft.type) ? eventDraft.type : 'sightseeing',
    title,
    location,
    locationPlace: location
      ? {
          name: cleanAiText(googlePlace.name || title, 120),
          address: location,
          placeId: cleanAiText(googlePlace.placeId, 180),
          lat: normalizeCoordinate(googlePlace.lat, 90),
          lng: normalizeCoordinate(googlePlace.lng, 180)
        }
      : null,
    desc,
    urgent: false,
    url: '',
    currency: 'JPY',
    cost: '',
    transport: {
      mode: 'train',
      duration: durationText,
      route: ''
    },
    memos: []
  };
};
