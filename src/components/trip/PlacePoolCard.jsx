import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarPlus, CheckCircle2, MapPin, Plus, Star, ThumbsDown, ThumbsUp, Trash2, UsersRound } from 'lucide-react';
import GooglePlaceInput from '../GooglePlaceInput';
import { buildGoogleMapsSearchUrl } from '../../services/googleMapsService';
import { togglePlaceVote } from '../../services/tripService';
import { mergeRealtimeVotesIntoPlaces } from '../../utils/tripRealtime';
import { normalizeEventTime } from '../../utils/tripEvents';
import { Badge, Button, Card, Field, Select } from '../ui';

const makePlaceId = () => `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readPlaceName = (place) => String(place?.name || place?.address || '').trim();
const readPlaceAddress = (place) => String(place?.address || place?.name || '').trim();

const getVoteScore = (votes = []) => (Array.isArray(votes) ? votes : [])
  .reduce((total, vote) => total + normalizeVoteValue(vote?.value), 0);

const voteOptions = [
  { value: 1, label: '想去', icon: ThumbsUp },
  { value: 0, label: '可去', icon: CheckCircle2 },
  { value: -1, label: '先不要', icon: ThumbsDown }
];

const normalizeVoteValue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  if (number > 0) return 1;
  if (number < 0) return -1;
  return 0;
};

const getVoteStats = (votes = []) => (Array.isArray(votes) ? votes : []).reduce((stats, vote) => {
  const value = normalizeVoteValue(vote?.value);
  const name = String(vote?.name || '旅伴').trim() || '旅伴';

  if (value > 0) {
    stats.want += 1;
    stats.wantNames.push(name);
  } else if (value < 0) {
    stats.skip += 1;
    stats.skipNames.push(name);
  } else {
    stats.maybe += 1;
    stats.maybeNames.push(name);
  }

  stats.total += 1;
  stats.score += value;
  return stats;
}, {
  want: 0,
  maybe: 0,
  skip: 0,
  total: 0,
  score: 0,
  wantNames: [],
  maybeNames: [],
  skipNames: []
});

const getVoteSummaryText = (stats) => {
  if (!stats.total) return '尚未有人投票';
  return `${stats.want} 想去 · ${stats.maybe} 可去 · ${stats.skip} 先不要`;
};

const createPlaceItem = (draftText, selectedPlace) => {
  const fallbackText = String(draftText || '').trim();
  const name = readPlaceName(selectedPlace) || fallbackText;
  const address = readPlaceAddress(selectedPlace) || fallbackText;

  return {
    id: makePlaceId(),
    name,
    address,
    placeId: selectedPlace?.placeId || '',
    lat: typeof selectedPlace?.lat === 'number' ? selectedPlace.lat : null,
    lng: typeof selectedPlace?.lng === 'number' ? selectedPlace.lng : null,
    note: '',
    status: 'idea',
    plannedDay: null,
    addedAt: new Date().toISOString(),
    plannedAt: '',
    votes: []
  };
};

const createEventFromPlace = (place) => {
  const title = readPlaceName(place) || '未命名地點';
  const address = readPlaceAddress(place) || title;

  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: '',
    type: 'sightseeing',
    title,
    location: address,
    locationPlace: {
      name: title,
      address,
      placeId: place.placeId || '',
      lat: typeof place.lat === 'number' ? place.lat : null,
      lng: typeof place.lng === 'number' ? place.lng : null
    },
    desc: place.note ? `想去地點備註：${place.note}` : '',
    urgent: false,
    url: '',
    currency: 'JPY',
    cost: '',
    transport: { mode: 'train', duration: '', route: '' },
    memos: []
  };
};

const PlacePoolItem = ({
  place,
  selectedDay,
  onSchedule,
  onDelete,
  onVote,
  votesEnabled = true,
  voterId,
  canVote = true,
  canDelete = true,
  canSchedule = true,
  isVoting = false,
  topVoteScore = 0
}) => {
  const title = readPlaceName(place) || '未命名地點';
  const address = readPlaceAddress(place);
  const mapsUrl = buildGoogleMapsSearchUrl(place);
  const isPlannedForCurrentDay = Number(place.plannedDay) === Number(selectedDay);
  const votes = Array.isArray(place.votes) ? place.votes : [];
  const voteStats = getVoteStats(votes);
  const voteScore = voteStats.score;
  const myVote = votes.find((vote) => vote.voterId === voterId);
  const myVoteValue = myVote ? normalizeVoteValue(myVote.value) : null;
  const voterNames = voteStats.wantNames.slice(0, 3);
  const isTopPlace = voteScore > 0 && voteScore === topVoteScore;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.55 }}
      className="tp-motion-panel rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-black text-slate-950 dark:text-white">{title}</h4>
            {place.plannedDay && (
              <Badge variant="success">
                <CheckCircle2 size={12} />
                Day {place.plannedDay}
              </Badge>
            )}
            {voteStats.total > 0 && (
              <Badge variant="info">
                <ThumbsUp size={12} />
                {getVoteSummaryText(voteStats)}
              </Badge>
            )}
            {isTopPlace && (
              <Badge variant="success">
                <Star size={12} />
                最多人想去
              </Badge>
            )}
          </div>
          {address && address !== title && (
            <p className="mt-1 flex items-start gap-1.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span>{address}</span>
            </p>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(place.id)}
            className="tp-press-feedback inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            aria-label={`刪除 ${title}`}
            title="刪除"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {votesEnabled && (
        <div className="mt-3 grid min-w-0 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <UsersRound size={13} />
              {voterNames.length ? `想去：${voterNames.join('、')}` : getVoteSummaryText(voteStats)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {voteOptions.map((option) => {
              const Icon = option.icon;
              const active = myVoteValue === option.value;
              const activeClass = option.value > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                : option.value < 0
                  ? 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                  : 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100';

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onVote(place.id, option.value)}
                  disabled={!canVote || isVoting}
                  className={`tp-press-feedback inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? activeClass
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={active}
                >
                  <Icon size={13} />
                  <span>{isVoting && active ? '更新中' : option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {canSchedule && (
          <Button
            variant={isPlannedForCurrentDay ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => onSchedule(place)}
            disabled={isPlannedForCurrentDay}
            className="tp-press-feedback w-full justify-center"
          >
            <CalendarPlus size={14} />
            {isPlannedForCurrentDay ? `已排入 Day ${selectedDay}` : `排入 Day ${selectedDay}`}
          </Button>
        )}
        {mapsUrl && (
          <Button
            as="a"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="sm"
            className="w-full justify-center"
          >
            <MapPin size={14} />
            地圖
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const PlacePoolCard = ({
  tripId,
  placePool = [],
  setPlacePool,
  itinerary = [],
  setItinerary,
  selectedDay = 1,
  onAddEvent,
  onCreateEventFromPlace,
  collaboration = {},
  currentUser,
  clientId = '',
  userProfile,
  placeVotesByPlaceId = {},
  realtimeError = '',
  canVote = false,
  canManageIdeas = false,
  canScheduleIdeas = false
}) => {
  const [draftText, setDraftText] = React.useState('');
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const [pendingVoteIds, setPendingVoteIds] = React.useState({});
  const [voteError, setVoteError] = React.useState('');
  const safePlacePool = useMemo(
    () => mergeRealtimeVotesIntoPlaces(placePool, placeVotesByPlaceId),
    [placePool, placeVotesByPlaceId]
  );
  const topVoteScore = useMemo(() => safePlacePool.reduce((maxScore, place) => (
    Math.max(maxScore, getVoteScore(place.votes))
  ), 0), [safePlacePool]);
  const dayOptions = useMemo(() => (Array.isArray(itinerary) ? itinerary : [])
    .map((day) => Number(day?.day))
    .filter((dayNumber) => Number.isFinite(dayNumber) && dayNumber > 0), [itinerary]);
  const normalizedSelectedDay = Number(selectedDay || dayOptions[0] || 1);
  const [targetDay, setTargetDay] = React.useState(
    dayOptions.includes(normalizedSelectedDay) ? normalizedSelectedDay : (dayOptions[0] || 1)
  );

  React.useEffect(() => {
    const nextDay = dayOptions.includes(normalizedSelectedDay)
      ? normalizedSelectedDay
      : (dayOptions[0] || 1);
    setTargetDay(nextDay);
  }, [dayOptions, normalizedSelectedDay]);

  const visiblePlaces = useMemo(() => safePlacePool
    .slice()
    .sort((a, b) => {
      const scoreDiff = getVoteScore(b.votes) - getVoteScore(a.votes);
      if (scoreDiff !== 0) return scoreDiff;
      return String(b.addedAt || '').localeCompare(String(a.addedAt || ''));
    })
    .slice(0, 8), [safePlacePool]);
  const canAdd = canManageIdeas && Boolean(String(draftText || '').trim() || selectedPlace);
  const votesEnabled = collaboration?.votesEnabled !== false;
  const voterId = currentUser?.uid || '';
  const handleAddPlace = () => {
    if (!canAdd) return;
    const nextPlace = createPlaceItem(draftText, selectedPlace);
    if (!readPlaceName(nextPlace) && !readPlaceAddress(nextPlace)) return;

    setPlacePool((prev) => [nextPlace, ...(Array.isArray(prev) ? prev : [])]);
    setDraftText('');
    setSelectedPlace(null);
  };

  const handleSchedulePlace = (place) => {
    if (!canScheduleIdeas) return;
    const nextEvent = createEventFromPlace(place);

    if (onCreateEventFromPlace) {
      onCreateEventFromPlace(nextEvent, targetDay);
    } else {
      setItinerary((prev) => (Array.isArray(prev) ? prev : []).map((day) => {
        if (Number(day.day) !== Number(targetDay)) return day;
        return {
          ...day,
          events: [...(day.events || []), nextEvent].sort((a, b) => normalizeEventTime(a.time).localeCompare(normalizeEventTime(b.time)))
        };
      }));
    }

    setPlacePool((prev) => (Array.isArray(prev) ? prev : []).map((item) => (
      item.id === place.id
        ? {
            ...item,
            status: 'planned',
            plannedDay: targetDay,
            plannedAt: new Date().toISOString()
          }
        : item
    )));
  };

  const handleDeletePlace = (placeId) => {
    if (!canManageIdeas) return;
    setPlacePool((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.id !== placeId));
  };

  const handleVotePlace = async (placeId, value) => {
    if (!canVote || !votesEnabled || !voterId || pendingVoteIds[placeId]) return;
    setVoteError('');

    setPendingVoteIds((prev) => ({ ...prev, [placeId]: true }));
    try {
      await togglePlaceVote({
        tripId,
        placeId,
        clientId,
        value,
        user: currentUser,
        profile: userProfile
      });
    } catch (error) {
      setVoteError(error?.message || '更新想去狀態失敗，請稍後再試。');
    } finally {
      setPendingVoteIds((prev) => {
        const next = { ...prev };
        delete next[placeId];
        return next;
      });
    }
  };

  return (
    <Card id="trip-place-ideas" className="order-4 p-4 scroll-mt-24">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="tp-icon-chip bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-800">
            <Star size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">大家想去的地方</h3>
          </div>
        </div>
        <Badge variant="muted">{safePlacePool.length} 個</Badge>
      </div>

      {canScheduleIdeas && dayOptions.length > 0 && (
        <div className="mb-3 flex min-w-0 flex-col gap-2 rounded-lg border border-sky-100 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm font-black text-sky-800 dark:text-sky-200">
            <CalendarPlus size={16} className="shrink-0" />
            <span className="min-w-0 truncate">目前排入：Day {targetDay}</span>
          </div>
          <div className="min-w-0 sm:w-36">
            <label className="sr-only" htmlFor="place-pool-target-day">選擇排入日期</label>
            <Select
              id="place-pool-target-day"
              value={targetDay}
              onChange={(event) => setTargetDay(Number(event.target.value))}
            >
              {dayOptions.map((dayNumber) => (
                <option key={dayNumber} value={dayNumber}>Day {dayNumber}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {canManageIdeas ? (
        <div className="grid gap-3">
          <Field label="加入地點" htmlFor="place-pool-input">
            <GooglePlaceInput
              id="place-pool-input"
              value={draftText}
              onTextChange={(value) => {
                setDraftText(value);
                setSelectedPlace(null);
              }}
              onPlaceSelect={setSelectedPlace}
              selectedPlace={selectedPlace}
              onClearPlace={() => setSelectedPlace(null)}
              placeholder="輸入景點、餐廳或地址"
              ariaLabel="加入想去地點"
              className="tp-input"
            />
          </Field>

          <Button onClick={handleAddPlace} disabled={!canAdd} className="w-full justify-center sm:w-auto sm:justify-start">
            <Plus size={16} />
            加入想去地點
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
          你可以按「我想去」，但不能修改行程。
        </div>
      )}

      {voteError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          {voteError}
        </p>
      )}

      {realtimeError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          {realtimeError}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        {visiblePlaces.length ? (
          visiblePlaces.map((place) => (
            <PlacePoolItem
              key={place.id}
              place={place}
              selectedDay={targetDay}
              onSchedule={handleSchedulePlace}
              onDelete={handleDeletePlace}
              onVote={handleVotePlace}
              votesEnabled={votesEnabled}
              voterId={voterId}
              canVote={canVote}
              canDelete={canManageIdeas}
              canSchedule={canScheduleIdeas}
              isVoting={Boolean(pendingVoteIds[place.id])}
              topVoteScore={topVoteScore}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {canManageIdeas
              ? '先加入幾個景點或餐廳，旅伴就能一起選。'
              : '目前還沒有地點，請主辦人或編輯者先加入幾個景點或餐廳。'}
            {canScheduleIdeas && (
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={onAddEvent}>
                  <Plus size={14} />
                  新增行程
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlacePoolCard;
