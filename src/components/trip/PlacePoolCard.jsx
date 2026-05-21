import React, { useMemo } from 'react';
import { CalendarPlus, CheckCircle2, MapPin, Plus, Star, ThumbsUp, Trash2, UsersRound } from 'lucide-react';
import GooglePlaceInput from '../GooglePlaceInput';
import { buildGoogleMapsSearchUrl } from '../../services/googleMapsService';
import { Badge, Button, Card, Field } from '../ui';

const makePlaceId = () => `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readPlaceName = (place) => String(place?.name || place?.address || '').trim();
const readPlaceAddress = (place) => String(place?.address || place?.name || '').trim();

const getVoteScore = (votes = []) => (Array.isArray(votes) ? votes : [])
  .reduce((total, vote) => total + Number(vote?.value || 0), 0);

const getVoteNames = (votes = []) => (Array.isArray(votes) ? votes : [])
  .filter((vote) => Number(vote?.value || 0) > 0)
  .map((vote) => String(vote?.name || '旅伴').trim() || '旅伴');

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
    desc: place.note ? `地點池備註：${place.note}` : '',
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
  canEdit = true
}) => {
  const title = readPlaceName(place) || '未命名地點';
  const address = readPlaceAddress(place);
  const mapsUrl = buildGoogleMapsSearchUrl(place);
  const isPlannedForCurrentDay = Number(place.plannedDay) === Number(selectedDay);
  const votes = Array.isArray(place.votes) ? place.votes : [];
  const voteScore = getVoteScore(votes);
  const votedByMe = votes.some((vote) => vote.voterId === voterId && Number(vote.value) > 0);
  const voterNames = getVoteNames(votes).slice(0, 3);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
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
            {voteScore > 0 && (
              <Badge variant="info">
                <ThumbsUp size={12} />
                {voteScore} 票
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
        {canEdit && (
          <button
            type="button"
            onClick={() => onDelete(place.id)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            aria-label={`刪除 ${title}`}
            title="刪除"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {votesEnabled && (
        <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <UsersRound size={13} />
              {voterNames.length ? voterNames.join('、') : '還沒有人投票'}
            </p>
          </div>
          <Button
            variant={votedByMe ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onVote(place.id, 1)}
            disabled={!canEdit}
            className="justify-center"
          >
            <ThumbsUp size={14} />
            {votedByMe ? '已投票' : '想去'}
          </Button>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          variant={isPlannedForCurrentDay ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => onSchedule(place)}
          disabled={!canEdit || isPlannedForCurrentDay}
          className="w-full justify-center"
        >
          <CalendarPlus size={14} />
          {isPlannedForCurrentDay ? `已排入 Day ${selectedDay}` : `排入 Day ${selectedDay}`}
        </Button>
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
    </div>
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
  collaboration = {},
  currentUser,
  userProfile,
  canEdit = true,
  isReadOnly = false
}) => {
  const [draftText, setDraftText] = React.useState('');
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const safePlacePool = Array.isArray(placePool) ? placePool : [];
  const visiblePlaces = useMemo(() => safePlacePool
    .slice()
    .sort((a, b) => {
      const scoreDiff = getVoteScore(b.votes) - getVoteScore(a.votes);
      if (scoreDiff !== 0) return scoreDiff;
      return String(b.addedAt || '').localeCompare(String(a.addedAt || ''));
    })
    .slice(0, 8), [safePlacePool]);
  const targetDay = selectedDay || itinerary[0]?.day || 1;
  const canAdd = canEdit && Boolean(String(draftText || '').trim() || selectedPlace);
  const votesEnabled = collaboration?.votesEnabled !== false;
  const voterId = currentUser?.uid || '';
  const voterName = (
    userProfile?.displayName
    || userProfile?.email
    || currentUser?.displayName
    || currentUser?.email
    || '旅伴'
  );

  const handleAddPlace = () => {
    if (!canAdd) return;
    const nextPlace = createPlaceItem(draftText, selectedPlace);
    if (!readPlaceName(nextPlace) && !readPlaceAddress(nextPlace)) return;

    setPlacePool((prev) => [nextPlace, ...(Array.isArray(prev) ? prev : [])]);
    setDraftText('');
    setSelectedPlace(null);
  };

  const handleSchedulePlace = (place) => {
    if (!canEdit) return;
    const nextEvent = createEventFromPlace(place);

    setItinerary((prev) => (Array.isArray(prev) ? prev : []).map((day) => {
      if (Number(day.day) !== Number(targetDay)) return day;
      return {
        ...day,
        events: [...(day.events || []), nextEvent].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
      };
    }));

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
    if (!canEdit) return;
    setPlacePool((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.id !== placeId));
  };

  const handleVotePlace = (placeId, value) => {
    if (!canEdit || !votesEnabled || !voterId) return;

    setPlacePool((prev) => (Array.isArray(prev) ? prev : []).map((item) => {
      if (item.id !== placeId) return item;

      const votes = Array.isArray(item.votes) ? item.votes : [];
      const existingVote = votes.find((vote) => vote.voterId === voterId);
      const nextVotes = existingVote?.value === value
        ? votes.filter((vote) => vote.voterId !== voterId)
        : [
            ...votes.filter((vote) => vote.voterId !== voterId),
            {
              voterId,
              name: voterName,
              value,
              votedAt: new Date().toISOString()
            }
          ];

      return {
        ...item,
        votes: nextVotes
      };
    }));
  };

  return (
    <Card className="order-4 p-4">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="tp-icon-chip bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <Star size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">想去地點池</h3>
            <p className="tp-section-subtitle mt-1">
              先收藏想去的地方，再依照每天路線排入行程。
            </p>
          </div>
        </div>
        <Badge variant="muted">{safePlacePool.length} 個</Badge>
      </div>

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
            placeholder={isReadOnly ? 'Viewer 只能查看地點池' : '輸入景點、餐廳或地址'}
            ariaLabel="加入想去地點"
            className="tp-input"
            disabled={isReadOnly}
          />
        </Field>

        <Button onClick={handleAddPlace} disabled={!canAdd} className="w-full justify-center sm:w-auto sm:justify-start">
          <Plus size={16} />
          加入地點池
        </Button>
      </div>

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
              canEdit={canEdit}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            還沒有收藏地點。可以先搜尋景點或直接新增行程。
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={onAddEvent} disabled={!canEdit}>
                <Plus size={14} />
                新增行程
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlacePoolCard;
