import React from 'react';
import { Bed, Info, Plane, Search } from 'lucide-react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { formatDateRangeText, normalizeTripDateFields } from '../../utils/tripDates';
import GooglePlaceInput from '../GooglePlaceInput';
import { Button, Card, Field, Input, Select } from '../ui';

const FlightLookupFields = ({
  direction,
  label,
  tripDetails,
  setTripDetails,
  handleLookupFlight,
  isLookingUp,
  lookupError
}) => (
  <div className={direction === 'outbound' ? 'border-b border-slate-200 pb-4 dark:border-slate-800' : ''}>
    <Field label={label} htmlFor={`flight-${direction}`}>
      <Input
        id={`flight-${direction}`}
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
      />
    </Field>
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="mt-2"
      onClick={() => handleLookupFlight(direction)}
      disabled={isLookingUp || !(tripDetails?.flights?.[direction]?.code || '').trim()}
    >
      <Search size={14} />
      {isLookingUp ? '查詢中...' : `自動帶入${label}資訊`}
    </Button>
    {lookupError && (
      <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{lookupError}</p>
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
    <div className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <Info size={20} />
          </div>
          <div>
            <h3 className="tp-section-title">旅程資訊</h3>
            <p className="tp-section-subtitle">名稱、日期、狀態與預算。</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Field label="旅程名稱" htmlFor="trip-title">
            <Input
              id="trip-title"
              type="text"
              placeholder="旅程名稱"
              value={tripDetails?.title || ''}
              onChange={(event) =>
                setTripDetails((prev) => ({
                  ...prev,
                  title: event.target.value
                }))
              }
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="開始日期" htmlFor="trip-start-date">
              <Input
                id="trip-start-date"
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
              />
            </Field>
            <Field label="結束日期" htmlFor="trip-end-date">
              <Input
                id="trip-end-date"
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
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="旅行狀態" htmlFor="trip-status">
              <Select
                id="trip-status"
                value={tripDetails?.status || 'planning'}
                onChange={(event) =>
                  setTripDetails((prev) => ({
                    ...prev,
                    status: event.target.value
                  }))
                }
              >
                <option value="planning">規劃中</option>
                <option value="ongoing">旅途中</option>
                <option value="done">已完成</option>
              </Select>
            </Field>
            <Field label="旅程總預算（元）" htmlFor="trip-budget">
              <Input
                id="trip-budget"
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
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <Bed size={20} />
          </div>
          <div>
            <h3 className="tp-section-title">住宿資訊</h3>
            <p className="tp-section-subtitle">旅途中模式會用這裡作為路線與天氣備用地點。</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Field label="飯店名稱" htmlFor="hotel-name">
            <Input
              id="hotel-name"
              type="text"
              placeholder="飯店名稱"
              value={tripDetails?.accommodation?.name || ''}
              onChange={(event) =>
                setTripDetails((prev) => ({
                  ...prev,
                  accommodation: { ...(prev?.accommodation || {}), name: event.target.value }
                }))
              }
            />
          </Field>
          <Field label="住宿地址">
            <GooglePlaceInput
              placeholder="地址"
              value={tripDetails?.accommodation?.address || ''}
              onTextChange={handleAccommodationAddressChange}
              onPlaceSelect={handleAccommodationPlaceSelect}
              className="tp-input"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <Plane size={20} />
          </div>
          <div>
            <h3 className="tp-section-title">航班資訊</h3>
            <p className="tp-section-subtitle">輸入航班代號後可嘗試自動查詢。</p>
          </div>
        </div>

        <div className="space-y-4">
          <FlightLookupFields
            direction="outbound"
            label="去程"
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            handleLookupFlight={handleLookupFlight}
            isLookingUp={isLookingUpFlight.outbound}
            lookupError={flightLookupError.outbound}
          />
          <FlightLookupFields
            direction="inbound"
            label="回程"
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            handleLookupFlight={handleLookupFlight}
            isLookingUp={isLookingUpFlight.inbound}
            lookupError={flightLookupError.inbound}
          />
        </div>
      </Card>
    </div>
  );
};

export default LogisticsTab;
