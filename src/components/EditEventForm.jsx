import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Link as LinkIcon, MapPin, Navigation, Save, Wallet } from 'lucide-react';
import GooglePlaceInput from './GooglePlaceInput';
import { Button, Field, Input, Select, Textarea } from './ui';
import { moneyInputProps, plainTextInputProps, urlInputProps } from '../utils/mobileInputProps';

const DEFAULT_EVENT = {
  time: '',
  title: '',
  type: 'sightseeing',
  location: '',
  desc: '',
  urgent: false,
  url: '',
  currency: 'JPY',
  locationPlace: null,
  transport: { mode: 'train', duration: '', route: '' },
  cost: ''
};

const EVENT_TYPES = [
  { value: 'sightseeing', label: '景點' },
  { value: 'food', label: '美食' },
  { value: 'shopping', label: '購物' },
  { value: 'transport', label: '交通' },
  { value: 'hotel', label: '住宿' },
  { value: 'flight', label: '航班' }
];

const TRANSPORT_MODES = [
  { value: 'train', label: '電車 / 地鐵' },
  { value: 'walk', label: '步行' },
  { value: 'taxi', label: '計程車 / Uber' },
  { value: 'bus', label: '巴士' },
  { value: 'flight', label: '飛機' }
];

const MAP_SEARCH_RECOMMENDATIONS = [
  { label: '附近景點', keyword: '景點' },
  { label: '附近餐廳', keyword: '餐廳' },
  { label: '附近咖啡', keyword: '咖啡' },
  { label: '附近購物', keyword: '購物' }
];

const getInitialFormState = (event) => ({
  ...DEFAULT_EVENT,
  ...(event || {}),
  time: event?.time || '',
  title: event?.title || '',
  type: event?.type || DEFAULT_EVENT.type,
  location: typeof event?.location === 'string'
    ? event.location
    : event?.location?.address || event?.location?.name || event?.locationPlace?.address || event?.locationPlace?.name || '',
  desc: event?.desc || '',
  url: event?.url || '',
  currency: event?.cost?.currency || event?.currency || DEFAULT_EVENT.currency,
  cost: event?.cost?.amount ?? event?.cost ?? '',
  locationPlace: event?.locationPlace || null,
  transport: {
    ...DEFAULT_EVENT.transport,
    ...(event?.transport || {})
  },
  urgent: Boolean(event?.urgent)
});

const FormSection = ({ title, description, icon: Icon, children }) => (
  <section className="min-w-0 max-w-full overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
    <div className="mb-3 flex min-w-0 items-start gap-2">
      {Icon && (
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300">
          <Icon size={17} />
        </span>
      )}
      <div className="min-w-0">
        <h4 className="text-sm font-black text-slate-900 dark:text-white">{title}</h4>
        {description && <p className="mt-0.5 hidden break-words text-xs leading-5 text-slate-500 dark:text-slate-400 sm:block">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

const EditEventForm = ({ event, onSave, onCancel, readOnly = false, onRequestEdit }) => {
  const [formData, setFormData] = useState(() => getInitialFormState(event));

  useEffect(() => {
    setFormData(getInitialFormState(event));
  }, [event]);

  const trimmedLocation = (formData.location || '').trim();
  const mapEmbedUrl = useMemo(() => (
    trimmedLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedLocation)}&output=embed`
      : ''
  ), [trimmedLocation]);

  const handleChange = (eventChange) => {
    const { name, value, type, checked } = eventChange.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...(prev[parent] || {}), [child]: value }
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLocationTextChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      location: value,
      locationPlace: null
    }));
  };

  const handleLocationPlaceSelect = (place) => {
    const nextLocation = place.address || place.name || '';
    setFormData((prev) => ({
      ...prev,
      title: prev.title || place.name || nextLocation,
      location: nextLocation,
      locationPlace: place
    }));
  };

  const handleLocationPlaceClear = () => {
    setFormData((prev) => ({
      ...prev,
      locationPlace: null
    }));
  };

  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    if (readOnly) return;

    onSave({
      ...formData,
      currency: formData.currency || 'JPY',
      cost: formData.cost ?? '',
      transport: {
        ...DEFAULT_EVENT.transport,
        ...(formData.transport || {})
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4 overflow-x-hidden text-slate-700 dark:text-slate-200">
      <FormSection title="基本資訊" description="時間、類型與名稱。">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
          <Field label="時間" htmlFor="event-time">
            <Input
              id="event-time"
              type="time"
              name="time"
              value={formData.time || ''}
              onChange={handleChange}
              disabled={readOnly}
              enterKeyHint="next"
            />
          </Field>

          <Field label="類型" htmlFor="event-type">
            <Select
              id="event-type"
              name="type"
              value={formData.type || 'sightseeing'}
              onChange={handleChange}
              disabled={readOnly}
            >
              {EVENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="標題" htmlFor="event-title">
            <Input
              id="event-title"
              {...plainTextInputProps}
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="輸入行程名稱"
              enterKeyHint="next"
            />
          </Field>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <input
            type="checkbox"
            name="urgent"
            checked={Boolean(formData.urgent)}
            onChange={handleChange}
            disabled={readOnly}
            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <AlertCircle size={16} />
          標記為重要，例如需預約或必去景點
        </label>
      </FormSection>

      <FormSection title="地點與備註" description="地點、連結與備註。" icon={MapPin}>
        <Field label="地點" htmlFor="event-location" hint="搜尋或輸入地點。">
          <div className="relative min-w-0 max-w-full">
            <MapPin size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
            <GooglePlaceInput
              id="event-location"
              name="location"
              value={formData.location}
              onTextChange={handleLocationTextChange}
              onPlaceSelect={handleLocationPlaceSelect}
              selectedPlace={formData.locationPlace}
              onClearPlace={handleLocationPlaceClear}
              disabled={readOnly}
              placeholder="輸入 Google Maps 地點名稱"
              ariaLabel="行程地點"
              helperText="可搜尋或手動輸入。"
              emptyMessage="找不到地點，可手動輸入。"
              className="tp-input pl-10"
            />
          </div>
        </Field>

        {trimmedLocation && (
          <div className="mt-3 min-w-0 max-w-full space-y-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <iframe
                title="location-map-preview"
                src={mapEmbedUrl}
                className="h-44 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {MAP_SEARCH_RECOMMENDATIONS.map((item) => (
                <a
                  key={item.keyword}
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${trimmedLocation} ${item.keyword}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-50 dark:border-brand-900/70 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/30"
                >
                  {item.label}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <Field label="描述 / 備註" htmlFor="event-desc">
            <Textarea
              id="event-desc"
              name="desc"
              value={formData.desc || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="輸入詳細資訊、集合地點、訂位資訊..."
              rows="3"
              enterKeyHint="done"
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="相關連結" htmlFor="event-url" hint="例如官方網站、購票連結、預約確認頁。">
            <div className="relative min-w-0 max-w-full">
              <LinkIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
              <Input
                id="event-url"
                {...urlInputProps}
                name="url"
                value={formData.url || ''}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="https://example.com"
                className="pl-10"
              />
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="交通資訊" description="下一段路線。" icon={Navigation}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="預估時間" htmlFor="event-transport-duration">
            <Input
              id="event-transport-duration"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              name="transport.duration"
              value={formData.transport?.duration || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="例如：30 分"
            />
          </Field>

          <Field label="交通方式" htmlFor="event-transport-mode">
            <Select
              id="event-transport-mode"
              name="transport.mode"
              value={formData.transport?.mode || 'train'}
              onChange={handleChange}
              disabled={readOnly}
            >
              {TRANSPORT_MODES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="路線備註" htmlFor="event-transport-route">
            <Input
              id="event-transport-route"
              {...plainTextInputProps}
              name="transport.route"
              value={formData.transport?.route || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="例如：山手線往池袋，轉乘一次"
              enterKeyHint="next"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="預估花費" description="行程預算。" icon={Wallet}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
          <Field label="幣別" htmlFor="event-currency">
            <Select
              id="event-currency"
              name="currency"
              value={formData.currency || 'JPY'}
              onChange={handleChange}
              disabled={readOnly}
            >
              <option value="JPY">JPY（日幣）</option>
              <option value="TWD">TWD（台幣）</option>
            </Select>
          </Field>

          <Field label="預估金額" htmlFor="event-cost">
            <Input
              id="event-cost"
              {...moneyInputProps}
              name="cost"
              value={formData.cost || ''}
              onChange={handleChange}
              disabled={readOnly}
              min="0"
              placeholder="輸入預算"
            />
          </Field>
        </div>
      </FormSection>

      {readOnly ? (
        <div className="sticky bottom-0 z-10 -mx-4 grid min-w-0 gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur sm:static sm:mx-0 sm:grid-cols-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-1 dark:border-slate-800 dark:bg-slate-900/95 sm:dark:bg-transparent">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
            關閉
          </Button>
          {onRequestEdit && (
            <Button type="button" onClick={onRequestEdit} className="w-full">
              編輯行程
            </Button>
          )}
        </div>
      ) : (
        <div className="sticky bottom-0 z-10 -mx-4 grid min-w-0 gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur sm:static sm:mx-0 sm:grid-cols-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-1 dark:border-slate-800 dark:bg-slate-900/95 sm:dark:bg-transparent">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
            取消
          </Button>
          <Button type="submit" className="w-full">
            <Save size={18} />
            儲存行程
          </Button>
        </div>
      )}
    </form>
  );
};

export default EditEventForm;
