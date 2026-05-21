import React, { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import GooglePlaceInput from '../GooglePlaceInput';
import { buildGoogleMapsSearchUrl } from '../../services/googleMapsService';
import { Badge, Button, Card, Field } from '../ui';

const makePlaceId = () => `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readPlaceName = (place) => String(place?.name || place?.address || '').trim();
const readPlaceAddress = (place) => String(place?.address || place?.name || '').trim();

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
    plannedAt: ''
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
    desc: place.note ? `想去原因：${place.note}` : '',
    urgent: false,
    url: '',
    currency: 'JPY',
    cost: '',
    transport: { mode: 'train', duration: '', route: '' },
    memos: []
  };
};

const PlacePoolItem = ({ place, selectedDay, onSchedule, onDelete }) => {
  const title = readPlaceName(place) || '未命名地點';
  const address = readPlaceAddress(place);
  const mapsUrl = buildGoogleMapsSearchUrl(place);
  const isPlannedForCurrentDay = Number(place.plannedDay) === Number(selectedDay);

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
          </div>
          {address && address !== title && (
            <p className="mt-1 flex items-start gap-1.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span>{address}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(place.id)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          aria-label={`移除 ${title}`}
          title="移除"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          variant={isPlannedForCurrentDay ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => onSchedule(place)}
          disabled={isPlannedForCurrentDay}
          className="w-full justify-center"
        >
          <CalendarPlus size={14} />
          {isPlannedForCurrentDay ? `已在 Day ${selectedDay}` : `排入 Day ${selectedDay}`}
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
  placePool = [],
  setPlacePool,
  itinerary = [],
  setItinerary,
  selectedDay = 1,
  onAddEvent
}) => {
  const [draftText, setDraftText] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const safePlacePool = Array.isArray(placePool) ? placePool : [];
  const visiblePlaces = useMemo(() => safePlacePool.slice(0, 8), [safePlacePool]);
  const targetDay = selectedDay || itinerary[0]?.day || 1;
  const canAdd = Boolean(String(draftText || '').trim() || selectedPlace);

  const handleAddPlace = () => {
    if (!canAdd) return;
    const nextPlace = createPlaceItem(draftText, selectedPlace);
    if (!readPlaceName(nextPlace) && !readPlaceAddress(nextPlace)) return;

    setPlacePool((prev) => [nextPlace, ...(Array.isArray(prev) ? prev : [])]);
    setDraftText('');
    setSelectedPlace(null);
  };

  const handleSchedulePlace = (place) => {
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
    setPlacePool((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.id !== placeId));
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
            <p className="tp-section-subtitle mt-1">先收藏想去的點，再排進每天行程。</p>
          </div>
        </div>
        <Badge variant="muted">{safePlacePool.length} 個</Badge>
      </div>

      <div className="grid gap-3">
        <Field label="新增地點" htmlFor="place-pool-input">
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
            placeholder="輸入景點、餐廳或商店"
            ariaLabel="新增想去地點"
            className="tp-input"
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
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            還沒有收藏地點。也可以先直接新增行程。
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={onAddEvent}>
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
