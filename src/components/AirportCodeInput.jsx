import React, { useId, useMemo, useState } from 'react';
import { MapPin, Plane, X } from 'lucide-react';
import { normalizeAirportCode, searchAirports } from '../data/airports';

const AirportCodeInput = ({
  id,
  value,
  onChange,
  placeholder = 'TPE',
  ariaLabel,
  disabled = false
}) => {
  const generatedId = useId();
  const inputId = id || `airport-code-${generatedId}`;
  const listboxId = `${inputId}-options`;
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedValue = normalizeAirportCode(value);
  const suggestions = useMemo(() => searchAirports(value, 8), [value]);
  const showSuggestions = isFocused && suggestions.length > 0 && !disabled;

  const commitValue = (nextValue) => {
    onChange?.(normalizeAirportCode(nextValue));
  };

  const handleSelect = (airport) => {
    commitValue(airport.code);
    setIsFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!showSuggestions) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative min-w-0 max-w-full">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="text"
          maxLength={3}
          value={normalizedValue}
          onChange={(event) => commitValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          role="combobox"
          className="tp-input pr-10 font-black uppercase tracking-wide"
        />
        {normalizedValue ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => commitValue('')}
            aria-label="清除機場"
          >
            <X size={15} />
          </button>
        ) : (
          <Plane
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
      </div>

      {showSuggestions && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[155] max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {suggestions.map((airport, index) => (
            <button
              key={airport.code}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(airport)}
              className={`flex w-full min-w-0 items-start gap-2 px-3 py-2.5 text-left transition ${
                activeIndex === index
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/35 dark:text-brand-200'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm font-black">{airport.code}</span>
                  <span className="truncate text-sm font-bold">{airport.city}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                  {airport.name} · {airport.country}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AirportCodeInput;
