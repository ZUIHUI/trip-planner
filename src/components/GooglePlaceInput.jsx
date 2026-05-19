import React, { useEffect, useMemo, useRef } from 'react';
import { loadGoogleMapsPlacesLibrary, normalizeGooglePlaceResult } from '../services/googleMapsService';

const DEFAULT_PLACE_TYPES = [];

const GooglePlaceInput = ({
  value,
  onTextChange,
  onPlaceSelect,
  disabled = false,
  placeholder = '',
  className = '',
  name,
  placeTypes = DEFAULT_PLACE_TYPES
}) => {
  const inputRef = useRef(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const placeTypesKey = useMemo(() => placeTypes.join('|'), [placeTypes]);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    if (disabled) return undefined;

    let autocomplete = null;
    let listener = null;
    let isMounted = true;

    loadGoogleMapsPlacesLibrary()
      .then((places) => {
        if (!isMounted || !places?.Autocomplete || !inputRef.current) return;

        const options = {
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
        };

        if (placeTypes.length > 0) {
          options.types = placeTypes;
        }

        autocomplete = new places.Autocomplete(inputRef.current, options);
        listener = autocomplete.addListener('place_changed', () => {
          const selectedPlace = normalizeGooglePlaceResult(
            autocomplete.getPlace(),
            inputRef.current?.value || ''
          );
          onPlaceSelectRef.current?.(selectedPlace);
        });
      })
      .catch((error) => {
        console.warn('Google Places autocomplete failed to initialize:', error);
      });

    return () => {
      isMounted = false;
      if (listener?.remove) {
        listener.remove();
      } else if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [disabled, placeTypesKey]);

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value || ''}
      onChange={(event) => onTextChange?.(event.target.value, event)}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
      className={className}
    />
  );
};

export default GooglePlaceInput;
