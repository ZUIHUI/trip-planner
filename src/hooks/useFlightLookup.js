import { useCallback, useState } from 'react';
import {
  getFlightLookupAvailability,
  lookupFlightByCode,
  mergeFlightLookupResult
} from '../services/flightService';

export const useFlightLookup = ({ canEdit, tripDetails, setTripDetails }) => {
  const [isLookingUpFlight, setIsLookingUpFlight] = useState({ outbound: false, inbound: false });
  const [flightLookupError, setFlightLookupError] = useState({ outbound: '', inbound: '' });

  const handleLookupFlight = useCallback(async (direction) => {
    if (!canEdit) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: '你目前只能查看，不能更新航班資料'
      }));
      return;
    }

    const currentFlight = tripDetails?.flights?.[direction] || {};
    const code = currentFlight.code || '';
    const departureDate = direction === 'outbound'
      ? (tripDetails?.dateRange?.start || '')
      : (tripDetails?.dateRange?.end || '');
    const availability = getFlightLookupAvailability(departureDate);

    if (!availability.canLookup) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: availability.message
      }));
      return;
    }

    setFlightLookupError((prev) => ({ ...prev, [direction]: '' }));
    setIsLookingUpFlight((prev) => ({ ...prev, [direction]: true }));

    try {
      const flightInfo = await lookupFlightByCode(code, departureDate, {
        departureAirport: currentFlight.dep,
        arrivalAirport: currentFlight.arr
      });
      setTripDetails((prev) => ({
        ...prev,
        flights: {
          ...(prev?.flights || {}),
          [direction]: {
            ...mergeFlightLookupResult((prev?.flights && prev.flights[direction]) || {}, flightInfo)
          }
        }
      }));
    } catch (error) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: error.message || '查詢失敗'
      }));
    } finally {
      setIsLookingUpFlight((prev) => ({ ...prev, [direction]: false }));
    }
  }, [canEdit, setTripDetails, tripDetails]);

  return {
    isLookingUpFlight,
    flightLookupError,
    handleLookupFlight
  };
};
