import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  fetchGooglePlaceDetails,
  fetchGooglePlacePredictions,
  hasGoogleMapsApiKey
} from '../services/googleMapsService';

const DEFAULT_PLACE_TYPES = [];

const GooglePlaceInput = ({
  id,
  value,
  onTextChange,
  onPlaceSelect,
  disabled = false,
  placeholder = '',
  className = '',
  name,
  ariaLabel,
  placeTypes = DEFAULT_PLACE_TYPES
}) => {
  const generatedId = useId();
  const inputId = id || `google-place-input-${generatedId}`;
  const listboxId = `${inputId}-suggestions`;
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);
  const blurTimerRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const placeTypesKey = useMemo(() => placeTypes.join('|'), [placeTypes]);
  const canUseGooglePlaces = hasGoogleMapsApiKey();
  const query = String(value || '').trim();
  const shouldShowSuggestions = !disabled && isFocused && canUseGooglePlaces && query.length >= 2;

  useEffect(() => () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!shouldShowSuggestions) {
      setSuggestions([]);
      setActiveIndex(-1);
      setIsLoading(false);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      const nextSuggestions = await fetchGooglePlacePredictions(query, { placeTypes });
      if (requestIdRef.current !== requestId) return;
      setSuggestions(nextSuggestions.slice(0, 6));
      setActiveIndex(nextSuggestions.length ? 0 : -1);
      setIsLoading(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [query, shouldShowSuggestions, placeTypesKey]);

  const handleSelectSuggestion = async (suggestion) => {
    if (!suggestion) return;

    const fallbackText = suggestion.description || suggestion.mainText || '';
    setSuggestions([]);
    setActiveIndex(-1);
    setIsFocused(false);
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
      return;
    }

    if (event.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
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
        ref={inputRef}
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
        aria-expanded={suggestions.length > 0}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        role="combobox"
        className={className}
      />

      {isLoading && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" />
        </span>
      )}

      {suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[160] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
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
