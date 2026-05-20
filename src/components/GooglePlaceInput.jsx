import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Search, X } from 'lucide-react';
import {
  fetchGooglePlaceDetails,
  getGooglePlacePredictionsState,
  GOOGLE_PLACE_PREDICTION_STATUS,
  hasGoogleMapsApiKey
} from '../services/googleMapsService';

const DEFAULT_PLACE_TYPES = [];
const MIN_QUERY_LENGTH = 2;

const defaultHelperText = '輸入 2 個字開始搜尋 Google 地點，也可以直接手動輸入。';
const defaultEmptyMessage = '找不到 Google 建議，可直接手動輸入。';
const defaultApiUnavailableMessage = 'Google API 未設定，仍可手動輸入。';

const getPlaceSummary = (place) => {
  if (!place || typeof place !== 'object') return null;
  const name = String(place.name || '').trim();
  const address = String(place.address || place.formattedAddress || place.formatted_address || '').trim();
  const placeId = String(place.placeId || place.place_id || '').trim();
  if (!name && !address && !placeId) return null;
  return { name, address, placeId };
};

const GooglePlaceInput = ({
  id,
  value,
  onTextChange,
  onPlaceSelect,
  selectedPlace,
  onClearPlace,
  disabled = false,
  placeholder = '',
  className = '',
  name,
  ariaLabel,
  placeTypes = DEFAULT_PLACE_TYPES,
  helperText = defaultHelperText,
  emptyMessage = defaultEmptyMessage,
  apiUnavailableMessage = defaultApiUnavailableMessage
}) => {
  const generatedId = useId();
  const inputId = id || `google-place-input-${generatedId}`;
  const listboxId = `${inputId}-suggestions`;
  const statusId = `${inputId}-status`;
  const requestIdRef = useRef(0);
  const blurTimerRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictionStatus, setPredictionStatus] = useState(GOOGLE_PLACE_PREDICTION_STATUS.idle);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedPlaceTypes = Array.isArray(placeTypes) ? placeTypes : DEFAULT_PLACE_TYPES;
  const placeTypesKey = useMemo(() => normalizedPlaceTypes.join('|'), [normalizedPlaceTypes]);
  const selectedSummary = getPlaceSummary(selectedPlace);
  const canUseGooglePlaces = hasGoogleMapsApiKey();
  const query = String(value || '').trim();
  const shouldSearch = !disabled && isFocused && query.length >= MIN_QUERY_LENGTH;

  useEffect(() => () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!shouldSearch) {
      setSuggestions([]);
      setActiveIndex(-1);
      setIsLoading(false);
      setPredictionStatus(GOOGLE_PLACE_PREDICTION_STATUS.idle);
      return undefined;
    }

    if (!canUseGooglePlaces) {
      setSuggestions([]);
      setActiveIndex(-1);
      setIsLoading(false);
      setPredictionStatus(GOOGLE_PLACE_PREDICTION_STATUS.missingApiKey);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setPredictionStatus(GOOGLE_PLACE_PREDICTION_STATUS.idle);

    const timer = setTimeout(async () => {
      const result = await getGooglePlacePredictionsState(query, { placeTypes: normalizedPlaceTypes });
      if (requestIdRef.current !== requestId) return;
      const nextSuggestions = result.predictions.slice(0, 6);
      setSuggestions(nextSuggestions);
      setActiveIndex(nextSuggestions.length ? 0 : -1);
      setPredictionStatus(result.status);
      setIsLoading(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [canUseGooglePlaces, query, shouldSearch, placeTypesKey]);

  const statusMessage = useMemo(() => {
    if (disabled) return '';
    if (!canUseGooglePlaces) return apiUnavailableMessage;
    if (isLoading) return '正在搜尋 Google 地點...';
    if (!query) return helperText;
    if (query.length < MIN_QUERY_LENGTH) return '再輸入 1 個字開始搜尋 Google 地點。';
    if (predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.empty) return emptyMessage;
    if (predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed) return 'Google API 載入失敗，仍可手動輸入。';
    if (predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.requestFailed) return 'Google 地點搜尋暫時失敗，仍可手動輸入。';
    if (suggestions.length > 0) return '用上下鍵選擇地點，Enter 套用。';
    return helperText;
  }, [
    apiUnavailableMessage,
    canUseGooglePlaces,
    disabled,
    emptyMessage,
    helperText,
    isLoading,
    predictionStatus,
    query,
    suggestions.length
  ]);

  const statusTone = useMemo(() => {
    if (!canUseGooglePlaces || predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed || predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.requestFailed) {
      return 'text-amber-700 dark:text-amber-300';
    }
    if (predictionStatus === GOOGLE_PLACE_PREDICTION_STATUS.empty) {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-slate-500 dark:text-slate-400';
  }, [canUseGooglePlaces, predictionStatus]);

  const handleSelectSuggestion = async (suggestion) => {
    if (!suggestion) return;

    const fallbackText = suggestion.description || suggestion.mainText || '';
    setSuggestions([]);
    setActiveIndex(-1);
    setIsFocused(false);
    setPredictionStatus(GOOGLE_PLACE_PREDICTION_STATUS.success);
    onTextChange?.(fallbackText);

    const place = await fetchGooglePlaceDetails(suggestion.placeId, fallbackText);
    onPlaceSelect?.({
      ...place,
      name: place.name || suggestion.mainText || fallbackText,
      address: place.address || fallbackText,
      placeId: place.placeId || suggestion.placeId
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setIsFocused(false);
      setActiveIndex(-1);
    }, 140);
  };

  return (
    <div className="relative w-full">
      <input
        id={inputId}
        type="text"
        name={name}
        value={value || ''}
        onChange={(event) => onTextChange?.(event.target.value, event)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-describedby={statusId}
        aria-expanded={isFocused && suggestions.length > 0}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        role="combobox"
        className={className}
      />

      {isLoading && (
        <span className="pointer-events-none absolute right-3 top-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" />
        </span>
      )}

      <p id={statusId} aria-live="polite" className={`mt-1 text-xs font-semibold ${statusTone}`}>
        {statusMessage}
      </p>

      {selectedSummary && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-200">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide">已選 Google 地點</p>
            <p className="truncate font-bold" title={selectedSummary.name || selectedSummary.address}>
              {selectedSummary.name || selectedSummary.address}
            </p>
            {selectedSummary.address && selectedSummary.address !== selectedSummary.name && (
              <p className="mt-0.5 truncate text-xs text-emerald-700/80 dark:text-emerald-200/75" title={selectedSummary.address}>
                {selectedSummary.address}
              </p>
            )}
          </div>
          {onClearPlace && !disabled && (
            <button
              type="button"
              onClick={onClearPlace}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
              aria-label="清除已選 Google 地點"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[160] max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Search size={13} />
              Google 推薦地點
            </span>
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId || `${suggestion.description}-${index}`}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition ${
                activeIndex === index
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/35 dark:text-brand-200'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{suggestion.mainText || suggestion.description}</span>
                {suggestion.secondaryText && (
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                    {suggestion.secondaryText}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GooglePlaceInput;
