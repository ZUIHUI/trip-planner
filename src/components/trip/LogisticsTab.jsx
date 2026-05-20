import React, { useMemo } from 'react';
import {
  Bed,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  Plane,
  Search,
  Wallet
} from 'lucide-react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { formatDateRangeText, normalizeTripDateFields } from '../../utils/tripDates';
import { getFlightLookupAvailability } from '../../services/flightService';
import GooglePlaceInput from '../GooglePlaceInput';
import { Badge, Button, Card, Field, Input, Select } from '../ui';

const statusMeta = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const directionMeta = {
  outbound: {
    label: '去程',
    helper: '通常使用旅程開始日期查詢。',
    colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
  },
  inbound: {
    label: '回程',
    helper: '通常使用旅程結束日期查詢。',
    colorClass: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
  }
};

const SectionHeading = ({ icon: Icon, title, description, aside }) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="tp-icon-chip">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="tp-section-title">{title}</h3>
        <p className="tp-section-subtitle">{description}</p>
      </div>
    </div>
    {aside}
  </div>
);

const InfoTile = ({ label, value, icon: Icon }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
      {Icon && <Icon size={14} />}
      {label}
    </div>
    <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white" title={value || '未設定'}>
      {value || '未設定'}
    </p>
  </div>
);

const CompletionPanel = ({ tripDetails }) => {
  const tasks = [
    { label: '旅程名稱', done: Boolean(tripDetails?.title) },
    { label: '日期範圍', done: Boolean(tripDetails?.dateRange?.start && tripDetails?.dateRange?.end) },
    { label: '住宿地址', done: Boolean(tripDetails?.accommodation?.address) },
    { label: '去程航班', done: Boolean(tripDetails?.flights?.outbound?.code) },
    { label: '回程航班', done: Boolean(tripDetails?.flights?.inbound?.code) }
  ];
  const completed = tasks.filter((task) => task.done).length;
  const percent = Math.round((completed / tasks.length) * 100);
  const status = statusMeta[tripDetails?.status] || statusMeta.planning;

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">資料完成度 {percent}%</span>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">出發前資訊中心</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            這裡維護的住宿與航班資料會被首頁摘要、旅途中模式、導航與天氣預設地點共用。
          </p>
        </div>

        <div className="min-w-0 lg:w-64">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tasks.map((task) => (
              <span
                key={task.label}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  task.done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                {task.done && <CheckCircle2 size={12} />}
                {task.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const TripInfoCard = ({ tripDetails, setTripDetails }) => {
  const startDate = tripDetails?.dateRange?.start || '';
  const endDate = tripDetails?.dateRange?.end || '';
  const invalidDateRange = Boolean(startDate && endDate && new Date(endDate) < new Date(startDate));

  return (
    <Card className="p-4">
      <SectionHeading
        icon={Info}
        title="旅程資訊"
        description="設定名稱、日期、狀態與總預算。"
        aside={tripDetails?.dates && (
          <Badge variant="info" className="self-start">
            {tripDetails.dates}
          </Badge>
        )}
      />

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
              value={startDate}
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
              value={endDate}
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

        {invalidDateRange && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
            結束日期早於開始日期，請確認旅程日期。
          </p>
        )}

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
  );
};

const AccommodationCard = ({
  tripDetails,
  setTripDetails,
  onAddressChange,
  onPlaceSelect,
  onClearPlace
}) => (
  <Card className="p-4">
    <SectionHeading
      icon={Bed}
      title="住宿資訊"
      description="旅途中模式會用這裡作為路線與天氣備用地點。"
    />

    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <InfoTile label="飯店" value={tripDetails?.accommodation?.name} icon={Bed} />
      <InfoTile label="地址" value={tripDetails?.accommodation?.address} icon={MapPin} />
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

      <Field label="住宿地址" htmlFor="hotel-address" hint="可輸入地址或從 Google Maps 自動完成選擇。">
        <GooglePlaceInput
          id="hotel-address"
          placeholder="地址"
          value={tripDetails?.accommodation?.address || ''}
          onTextChange={onAddressChange}
          onPlaceSelect={onPlaceSelect}
          selectedPlace={tripDetails?.accommodation?.placeId ? tripDetails.accommodation : null}
          onClearPlace={onClearPlace}
          ariaLabel="住宿地址"
          helperText="輸入飯店或地址搜尋 Google 地點；也可以直接手動填地址。"
          emptyMessage="找不到推薦住宿地點，可直接輸入地址。"
          className="tp-input"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Check-in" htmlFor="hotel-check-in">
          <Input
            id="hotel-check-in"
            type="text"
            placeholder="例如：2/23 16:00"
            value={tripDetails?.accommodation?.checkIn || ''}
            onChange={(event) =>
              setTripDetails((prev) => ({
                ...prev,
                accommodation: { ...(prev?.accommodation || {}), checkIn: event.target.value }
              }))
            }
          />
        </Field>
        <Field label="Check-out" htmlFor="hotel-check-out">
          <Input
            id="hotel-check-out"
            type="text"
            placeholder="例如：2/28 10:00"
            value={tripDetails?.accommodation?.checkOut || ''}
            onChange={(event) =>
              setTripDetails((prev) => ({
                ...prev,
                accommodation: { ...(prev?.accommodation || {}), checkOut: event.target.value }
              }))
            }
          />
        </Field>
      </div>
    </div>
  </Card>
);

const FlightField = ({ label, field, direction, value, setTripDetails, placeholder, type = 'text' }) => (
  <Field label={label} htmlFor={`flight-${direction}-${field}`}>
    <Input
      id={`flight-${direction}-${field}`}
      type={type}
      placeholder={placeholder}
      value={value || ''}
      onChange={(event) =>
        setTripDetails((prev) => ({
          ...prev,
          flights: {
            ...(prev?.flights || {}),
            [direction]: {
              ...((prev?.flights && prev.flights[direction]) || {}),
              [field]: field === 'code' ? event.target.value.toUpperCase() : event.target.value
            }
          }
        }))
      }
    />
  </Field>
);

const FlightCard = ({
  direction,
  tripDetails,
  setTripDetails,
  handleLookupFlight,
  isLookingUp,
  lookupError
}) => {
  const meta = directionMeta[direction];
  const flight = tripDetails?.flights?.[direction] || {};
  const lookupDate = direction === 'outbound'
    ? tripDetails?.dateRange?.start
    : tripDetails?.dateRange?.end;
  const lookupAvailability = getFlightLookupAvailability(lookupDate || '');
  const hasFlightCode = Boolean((flight.code || '').trim());
  const canLookup = hasFlightCode && lookupAvailability.canLookup;
  const lookupHint = !lookupAvailability.canLookup
    ? lookupAvailability.message
    : hasFlightCode
      ? `將依 ${lookupAvailability.normalizedDate} 查詢 FlightAPI.io 航班`
      : '輸入航班代號後即可依旅程日期查詢 FlightAPI.io';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.colorClass}`}>
            <Plane size={20} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-slate-900 dark:text-white">{meta.label}</h4>
              {flight.code ? <Badge variant="info">{flight.code}</Badge> : <Badge variant="muted">未設定</Badge>}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{meta.helper}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleLookupFlight(direction)}
          disabled={isLookingUp || !canLookup}
          className="w-full sm:w-auto"
        >
          <Search size={14} />
          {isLookingUp ? '查詢中...' : '查詢航班'}
        </Button>
      </div>

      <p className={`mb-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
        lookupAvailability.canLookup
          ? 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-300'
          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
      }`}>
        {lookupHint}
      </p>

      {lookupError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {lookupError}
        </p>
      )}

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FlightField label="航班代號" field="code" direction={direction} value={flight.code} setTripDetails={setTripDetails} placeholder="例如：JX802" />
          <FlightField label="航空公司" field="airline" direction={direction} value={flight.airline} setTripDetails={setTripDetails} placeholder="例如：星宇航空" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FlightField label="日期" field="date" direction={direction} value={flight.date} setTripDetails={setTripDetails} placeholder="例如：2/23" />
          <FlightField label="起飛時間" field="departureTime" direction={direction} value={flight.departureTime} setTripDetails={setTripDetails} placeholder="14:40" />
          <FlightField label="抵達時間" field="arrivalTime" direction={direction} value={flight.arrivalTime} setTripDetails={setTripDetails} placeholder="19:15" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FlightField label="出發機場" field="dep" direction={direction} value={flight.dep} setTripDetails={setTripDetails} placeholder="TPE" />
          <FlightField label="抵達機場" field="arr" direction={direction} value={flight.arr} setTripDetails={setTripDetails} placeholder="NRT" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FlightField label="出發航廈" field="depTerminal" direction={direction} value={flight.depTerminal} setTripDetails={setTripDetails} placeholder="例如：T1 / 第 1 航廈" />
          <FlightField label="抵達航廈" field="arrTerminal" direction={direction} value={flight.arrTerminal} setTripDetails={setTripDetails} placeholder="例如：T2 / 第 2 航廈" />
        </div>
      </div>
    </div>
  );
};

const LogisticsTab = () => {
  const {
    tripDetails,
    setTripDetails,
    handleLookupFlight,
    isLookingUpFlight,
    flightLookupError
  } = useTripWorkspace();

  const tripSnapshot = useMemo(() => {
    const budget = Number(tripDetails?.budget?.total || 0);
    return {
      dates: formatDateRangeText(tripDetails?.dateRange?.start, tripDetails?.dateRange?.end) || tripDetails?.dates || '未設定日期',
      budget: budget > 0 ? `${budget.toLocaleString()} 元` : '未設定預算',
      hotel: tripDetails?.accommodation?.name || '尚未設定住宿',
      airport: tripDetails?.flights?.outbound?.dep && tripDetails?.flights?.inbound?.arr
        ? `${tripDetails.flights.outbound.dep} / ${tripDetails.flights.inbound.arr}`
        : '航班機場未完整設定'
    };
  }, [tripDetails]);

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

  const handleAccommodationPlaceClear = () => {
    setTripDetails((prev) => ({
      ...prev,
      accommodation: {
        ...(prev?.accommodation || {}),
        placeId: '',
        lat: null,
        lng: null
      }
    }));
  };

  return (
    <div className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <CompletionPanel tripDetails={tripDetails} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="旅程期間" value={tripSnapshot.dates} icon={CalendarDays} />
        <InfoTile label="總預算" value={tripSnapshot.budget} icon={Wallet} />
        <InfoTile label="住宿" value={tripSnapshot.hotel} icon={Bed} />
        <InfoTile label="機場" value={tripSnapshot.airport} icon={Clock3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <TripInfoCard tripDetails={tripDetails} setTripDetails={setTripDetails} />
          <AccommodationCard
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            onAddressChange={handleAccommodationAddressChange}
            onPlaceSelect={handleAccommodationPlaceSelect}
            onClearPlace={handleAccommodationPlaceClear}
          />
        </div>

        <Card className="p-4">
          <SectionHeading
            icon={Plane}
            title="航班資訊"
            description="可用航班代號查詢，也能手動補齊航空公司、時間與機場。"
          />

          <div className="space-y-4">
            <FlightCard
              direction="outbound"
              tripDetails={tripDetails}
              setTripDetails={setTripDetails}
              handleLookupFlight={handleLookupFlight}
              isLookingUp={isLookingUpFlight.outbound}
              lookupError={flightLookupError.outbound}
            />
            <FlightCard
              direction="inbound"
              tripDetails={tripDetails}
              setTripDetails={setTripDetails}
              handleLookupFlight={handleLookupFlight}
              isLookingUp={isLookingUpFlight.inbound}
              lookupError={flightLookupError.inbound}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LogisticsTab;
