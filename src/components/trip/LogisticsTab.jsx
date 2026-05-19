import React from 'react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { formatDateRangeText, normalizeTripDateFields } from '../../utils/tripDates';
import GooglePlaceInput from '../GooglePlaceInput';

const FlightLookupFields = ({
  direction,
  label,
  colorClass,
  tripDetails,
  setTripDetails,
  handleLookupFlight,
  isLookingUp,
  lookupError
}) => (
  <div className={direction === 'outbound' ? 'mb-4 pb-4 border-b border-gray-200' : ''}>
    <h4 className={`font-bold ${colorClass} mb-2`}>{label}</h4>
    <input
      type="text"
      placeholder="航班代號"
      value={tripDetails?.flights?.[direction]?.code || ''}
      onChange={(event) =>
        setTripDetails((prev) => ({
          ...prev,
          flights: {
            ...(prev?.flights || {}),
            [direction]: {
              ...((prev?.flights && prev.flights[direction]) || {}),
              code: event.target.value
            }
          }
        }))
      }
      className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
    />
    <button
      type="button"
      onClick={() => handleLookupFlight(direction)}
      disabled={isLookingUp || !(tripDetails?.flights?.[direction]?.code || '').trim()}
      className={`text-xs px-3 py-1.5 rounded-lg border hover:bg-opacity-80 disabled:opacity-60 disabled:cursor-not-allowed ${
        direction === 'outbound'
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'mt-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
      }`}
    >
      {isLookingUp ? '查詢中...' : `自動帶入${label}資訊`}
    </button>
    {lookupError && (
      <p className="mt-2 text-xs text-red-500">{lookupError}</p>
    )}
  </div>
);

const LogisticsTab = () => {
  const {
    tripDetails,
    setTripDetails,
    handleLookupFlight,
    isLookingUpFlight,
    flightLookupError
  } = useTripWorkspace();

  const handleAccommodationAddressChange = (value) => {
    setTripDetails((prev) => ({
      ...prev,
      accommodation: {
        ...(prev?.accommodation || {}),
        address: value,
        placeId: '',
        lat: null,
        lng: null
      }
    }));
  };

  const handleAccommodationPlaceSelect = (place) => {
    const nextAddress = place.address || place.name || '';
    setTripDetails((prev) => ({
      ...prev,
      accommodation: {
        ...(prev?.accommodation || {}),
        name: prev?.accommodation?.name || place.name || nextAddress,
        address: nextAddress,
        placeId: place.placeId,
        lat: place.lat,
        lng: place.lng
      }
    }));
  };

  return (
    <div className="px-4 sm:px-6 mt-6 pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🧭 旅程資訊</h3>
        <input
          type="text"
          placeholder="旅程名稱"
          value={tripDetails?.title || ''}
          onChange={(event) =>
            setTripDetails((prev) => ({
              ...prev,
              title: event.target.value
            }))
          }
          className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
        />
      <label className="block tp-caption-text text-gray-500 mb-1">旅程期間</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
        <div>
          <label className="block tp-caption-text text-gray-400 mb-1">開始日期</label>
          <input
            type="date"
            value={tripDetails?.dateRange?.start || ''}
            onChange={(event) =>
              setTripDetails((prev) => {
                const start = event.target.value;
                const end = prev?.dateRange?.end || '';
                return normalizeTripDateFields({
                  ...prev,
                  dateRange: { ...(prev?.dateRange || {}), start },
                  dates: formatDateRangeText(start, end)
                });
              })
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
          />
        </div>
        <div>
          <label className="block tp-caption-text text-gray-400 mb-1">結束日期</label>
          <input
            type="date"
            value={tripDetails?.dateRange?.end || ''}
            onChange={(event) =>
              setTripDetails((prev) => {
                const end = event.target.value;
                const start = prev?.dateRange?.start || '';
                return normalizeTripDateFields({
                  ...prev,
                  dateRange: { ...(prev?.dateRange || {}), end },
                  dates: formatDateRangeText(start, end)
                });
              })
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
          />
        </div>
      </div>
      <label className="block tp-caption-text text-gray-500 mb-1">旅行狀態</label>
      <select
        value={tripDetails?.status || 'planning'}
        onChange={(event) =>
          setTripDetails((prev) => ({
            ...prev,
            status: event.target.value
          }))
        }
        className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
      >
        <option value="planning">planning</option>
        <option value="ongoing">ongoing</option>
        <option value="done">done</option>
      </select>
      <label className="block tp-caption-text text-gray-500 mt-3 mb-1">旅程總預算（元）</label>
      <input
        type="number"
        min="0"
        placeholder="例如：30000"
        value={tripDetails?.budget?.total || ''}
        onChange={(event) =>
          setTripDetails((prev) => ({
            ...prev,
            budget: {
              ...(prev?.budget || {}),
              total: event.target.value
            }
          }))
        }
        className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
      />
    </div>

    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">🏨 住宿資訊</h3>
      <input
        type="text"
        placeholder="飯店名稱"
        value={tripDetails?.accommodation?.name || ''}
        onChange={(event) =>
          setTripDetails((prev) => ({
            ...prev,
            accommodation: { ...(prev?.accommodation || {}), name: event.target.value }
          }))
        }
        className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
      />
      <GooglePlaceInput
        placeholder="地址"
        value={tripDetails?.accommodation?.address || ''}
        onTextChange={handleAccommodationAddressChange}
        onPlaceSelect={handleAccommodationPlaceSelect}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
      />
    </div>

    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">✈️ 航班資訊</h3>
      <FlightLookupFields
        direction="outbound"
        label="去程"
        colorClass="text-blue-600"
        tripDetails={tripDetails}
        setTripDetails={setTripDetails}
        handleLookupFlight={handleLookupFlight}
        isLookingUp={isLookingUpFlight.outbound}
        lookupError={flightLookupError.outbound}
      />
      <FlightLookupFields
        direction="inbound"
        label="回程"
        colorClass="text-indigo-600"
        tripDetails={tripDetails}
        setTripDetails={setTripDetails}
        handleLookupFlight={handleLookupFlight}
        isLookingUp={isLookingUpFlight.inbound}
        lookupError={flightLookupError.inbound}
      />
    </div>
    </div>
  );
};

export default LogisticsTab;
