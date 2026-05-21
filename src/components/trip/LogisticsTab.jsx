import React, { useMemo, useState } from 'react';
import {
  Bed,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import AirportCodeInput from '../AirportCodeInput';
import GooglePlaceInput from '../GooglePlaceInput';
import { Badge, Button, Card, Field, Input, Select } from '../ui';
import ReservationImportCard from './ReservationImportCard';

const statusMeta = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const directionMeta = {
  outbound: {
    label: '去程',
    helper: '用旅程開始日查詢航班',
    colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
  },
  inbound: {
    label: '回程',
    helper: '用旅程結束日查詢航班',
    colorClass: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
  }
};

const getInfoTasks = (tripDetails) => [
  { label: '旅程名稱', done: Boolean(tripDetails?.title), section: 'trip' },
  {
    label: '日期範圍',
    done: Boolean(tripDetails?.dateRange?.start && tripDetails?.dateRange?.end),
    section: 'trip'
  },
  {
    label: '住宿地址',
    done: Boolean(tripDetails?.accommodation?.address),
    section: 'accommodation'
  },
  {
    label: '去程航班',
    done: Boolean(tripDetails?.flights?.outbound?.code),
    section: 'flights'
  },
  {
    label: '回程航班',
    done: Boolean(tripDetails?.flights?.inbound?.code),
    section: 'flights'
  }
];

const getMobileSectionStatus = (tripDetails) => {
  const tasks = getInfoTasks(tripDetails);
  const missingBySection = tasks.reduce((result, task) => {
    if (!task.done) {
      result[task.section] = [...(result[task.section] || []), task.label];
    }
    return result;
  }, {});

  return {
    trip: missingBySection.trip?.length ? '待補資料' : '已填寫',
    accommodation: missingBySection.accommodation?.length ? '未填住宿' : '已填寫',
    flights: missingBySection.flights?.length
      ? missingBySection.flights.join('、')
      : '已填寫'
  };
};

const SectionHeading = ({ icon: Icon, title, description, aside, compactDescription = false }) => (
  <div className="mb-4 flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="tp-icon-chip">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h3 className="tp-section-title">{title}</h3>
        {description && (
          <p className={`tp-section-subtitle ${compactDescription ? 'hidden sm:block' : ''}`}>
            {description}
          </p>
        )}
      </div>
    </div>
    {aside}
  </div>
);

const InfoTile = ({ label, value, icon: Icon }) => (
  <div className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex min-w-0 items-center gap-2 break-words text-xs font-bold text-slate-500 dark:text-slate-400">
      {Icon && <Icon size={14} />}
      {label}
    </div>
    <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white" title={value || '未設定'}>
      {value || '未設定'}
    </p>
  </div>
);

const CompletionPanel = ({ tripDetails }) => {
  const tasks = getInfoTasks(tripDetails);
  const completed = tasks.filter((task) => task.done).length;
  const missingTasks = tasks.filter((task) => !task.done);
  const percent = Math.round((completed / tasks.length) * 100);
  const status = statusMeta[tripDetails?.status] || statusMeta.planning;

  return (
    <Card className="overflow-hidden p-3 sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              完成 {completed}/{tasks.length}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white sm:text-xl">
            出發前資訊
          </h2>
          <p className="mt-1 hidden text-sm leading-6 text-slate-500 dark:text-slate-400 sm:block">
            先補齊旅程、住宿與航班，旅途中查看資料會更快。
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400 sm:hidden">
            {missingTasks.length ? `待補：${missingTasks.map((task) => task.label).join('、')}` : '資訊已完整'}
          </p>
        </div>

        <div className="min-w-0 lg:w-64">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
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

const MobileSectionSwitcher = ({ activeSection, onChange, sectionStatus }) => {
  const sections = [
    { id: 'trip', label: '旅程', icon: Info },
    { id: 'accommodation', label: '住宿', icon: Bed },
    { id: 'flights', label: '航班', icon: Plane }
  ];

  return (
    <div className="sm:hidden">
      <div
        className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
        aria-label="資訊設定段落"
      >
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          const isComplete = sectionStatus[id] === '已填寫';
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className={`min-h-12 min-w-0 rounded-lg px-2 py-2 text-center transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 text-sm font-black">
                <Icon size={15} />
                {label}
              </span>
              <span className={`mt-0.5 block truncate text-[11px] font-bold ${isActive ? 'text-white/80' : isComplete ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {sectionStatus[id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TripInfoCard = ({ tripDetails, setTripDetails, idPrefix = '', compact = false }) => {
  const startDate = tripDetails?.dateRange?.start || '';
  const endDate = tripDetails?.dateRange?.end || '';
  const invalidDateRange = Boolean(startDate && endDate && new Date(endDate) < new Date(startDate));

  return (
    <Card className="p-3 sm:p-4">
      <SectionHeading
        icon={Info}
        title="旅程資訊"
        description="設定旅程名稱、日期、狀態與預算。"
        compactDescription={compact}
        aside={tripDetails?.dates && (
          <Badge variant="info" className="self-start">
            {tripDetails.dates}
          </Badge>
        )}
      />

      <div className="grid min-w-0 gap-3">
        <Field label="旅程名稱" htmlFor={`${idPrefix}trip-title`}>
          <Input
            id={`${idPrefix}trip-title`}
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

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="開始日期" htmlFor={`${idPrefix}trip-start-date`}>
            <Input
              id={`${idPrefix}trip-start-date`}
              type="date"
              className="tp-date-input"
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
          <Field label="結束日期" htmlFor={`${idPrefix}trip-end-date`}>
            <Input
              id={`${idPrefix}trip-end-date`}
              type="date"
              className="tp-date-input"
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
            結束日期不能早於開始日期。
          </p>
        )}

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="旅程狀態" htmlFor={`${idPrefix}trip-status`}>
            <Select
              id={`${idPrefix}trip-status`}
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
          <Field label="旅程預算" htmlFor={`${idPrefix}trip-budget`}>
            <Input
              id={`${idPrefix}trip-budget`}
              type="number"
              min="0"
              placeholder="例如 50000"
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
  onClearPlace,
  idPrefix = '',
  compact = false
}) => (
  <Card className="p-3 sm:p-4">
    <SectionHeading
      icon={Bed}
      title="住宿資訊"
      description="先填住宿名稱與地址，入住時間可稍後補。"
      compactDescription={compact}
    />

    <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2">
      <InfoTile label="飯店" value={tripDetails?.accommodation?.name} icon={Bed} />
      <InfoTile label="地址" value={tripDetails?.accommodation?.address} icon={MapPin} />
    </div>

    <div className="grid min-w-0 gap-3">
      <Field label="飯店名稱" htmlFor={`${idPrefix}hotel-name`}>
        <Input
          id={`${idPrefix}hotel-name`}
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

      <Field label="住宿地址" htmlFor={`${idPrefix}hotel-address`} hint="可搜尋 Google 地點，也可直接手動輸入。">
        <GooglePlaceInput
          id={`${idPrefix}hotel-address`}
          placeholder="地址"
          value={tripDetails?.accommodation?.address || ''}
          onTextChange={onAddressChange}
          onPlaceSelect={onPlaceSelect}
          selectedPlace={tripDetails?.accommodation?.placeId ? tripDetails.accommodation : null}
          onClearPlace={onClearPlace}
          ariaLabel="住宿地址"
          helperText="輸入 2 個字以上搜尋 Google 地點，或直接手動輸入。"
          emptyMessage="找不到建議，仍可手動輸入地址。"
          className="tp-input"
        />
      </Field>

      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
        <p className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">入住時間</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="Check-in" htmlFor={`${idPrefix}hotel-check-in`}>
            <Input
              id={`${idPrefix}hotel-check-in`}
              type="text"
              placeholder="例如 2/23 16:00"
              value={tripDetails?.accommodation?.checkIn || ''}
              onChange={(event) =>
                setTripDetails((prev) => ({
                  ...prev,
                  accommodation: { ...(prev?.accommodation || {}), checkIn: event.target.value }
                }))
              }
            />
          </Field>
          <Field label="Check-out" htmlFor={`${idPrefix}hotel-check-out`}>
            <Input
              id={`${idPrefix}hotel-check-out`}
              type="text"
              placeholder="例如 2/28 10:00"
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
    </div>
  </Card>
);

const FlightField = ({
  label,
  field,
  direction,
  value,
  setTripDetails,
  placeholder,
  type = 'text',
  idPrefix = ''
}) => (
  <Field label={label} htmlFor={`${idPrefix}flight-${direction}-${field}`}>
    <Input
      id={`${idPrefix}flight-${direction}-${field}`}
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

const FlightAirportField = ({
  label,
  field,
  direction,
  value,
  setTripDetails,
  placeholder,
  idPrefix = ''
}) => (
  <Field label={label} htmlFor={`${idPrefix}flight-${direction}-${field}`}>
    <AirportCodeInput
      id={`${idPrefix}flight-${direction}-${field}`}
      value={value || ''}
      placeholder={placeholder}
      ariaLabel={label}
      onChange={(nextCode) =>
        setTripDetails((prev) => ({
          ...prev,
          flights: {
            ...(prev?.flights || {}),
            [direction]: {
              ...((prev?.flights && prev.flights[direction]) || {}),
              [field]: nextCode
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
  lookupError,
  compact = false,
  idPrefix = ''
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = directionMeta[direction];
  const flight = tripDetails?.flights?.[direction] || {};
  const lookupDate = direction === 'outbound'
    ? tripDetails?.dateRange?.start
    : tripDetails?.dateRange?.end;
  const lookupAvailability = getFlightLookupAvailability(lookupDate || '');
  const hasFlightCode = Boolean((flight.code || '').trim());
  const canLookup = hasFlightCode && lookupAvailability.canLookup;
  const showDetails = !compact || detailsOpen;
  const lookupHint = !lookupAvailability.canLookup
    ? lookupAvailability.message
    : hasFlightCode
      ? `用旅程日期 ${lookupAvailability.normalizedDate} 查航班`
      : '輸入航班號後可用旅程日期查航班';

  return (
    <div className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
      <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.colorClass}`}>
            <Plane size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-slate-900 dark:text-white">{meta.label}</h4>
              {flight.code ? <Badge variant="info">{flight.code}</Badge> : <Badge variant="muted">未設定</Badge>}
            </div>
            <p className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{meta.helper}</p>
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

      <p className={`mb-3 max-w-full break-words rounded-lg border px-3 py-2 text-xs font-semibold ${
        lookupAvailability.canLookup
          ? 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-300'
          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
      }`}>
        {lookupHint}
      </p>

      <p className="mb-3 max-w-full break-words rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        同航班號有多段航線時，先填出發與抵達機場。
      </p>

      {lookupError && (
        <p className="mb-3 max-w-full break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {lookupError}
        </p>
      )}

      <div className="grid min-w-0 gap-3">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <FlightField
            label="航班代號"
            field="code"
            direction={direction}
            value={flight.code}
            setTripDetails={setTripDetails}
            placeholder="例如 JX802"
            idPrefix={idPrefix}
          />
          {!compact && (
            <FlightField
              label="航空公司"
              field="airline"
              direction={direction}
              value={flight.airline}
              setTripDetails={setTripDetails}
              placeholder="例如 星宇航空"
              idPrefix={idPrefix}
            />
          )}
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <FlightAirportField
            label="出發機場"
            field="dep"
            direction={direction}
            value={flight.dep}
            setTripDetails={setTripDetails}
            placeholder="TPE"
            idPrefix={idPrefix}
          />
          <FlightAirportField
            label="抵達機場"
            field="arr"
            direction={direction}
            value={flight.arr}
            setTripDetails={setTripDetails}
            placeholder="NRT"
            idPrefix={idPrefix}
          />
        </div>

        {compact && (
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-expanded={detailsOpen}
          >
            詳細欄位
            {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}

        {showDetails && (
          <div className={`grid min-w-0 gap-3 ${compact ? 'rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900' : ''}`}>
            {compact && (
              <FlightField
                label="航空公司"
                field="airline"
                direction={direction}
                value={flight.airline}
                setTripDetails={setTripDetails}
                placeholder="例如 星宇航空"
                idPrefix={idPrefix}
              />
            )}

            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <FlightField
                label="日期"
                field="date"
                direction={direction}
                value={flight.date}
                setTripDetails={setTripDetails}
                placeholder="例如 2/23"
                idPrefix={idPrefix}
              />
              <FlightField
                label="起飛時間"
                field="departureTime"
                direction={direction}
                value={flight.departureTime}
                setTripDetails={setTripDetails}
                placeholder="14:40"
                idPrefix={idPrefix}
              />
              <FlightField
                label="抵達時間"
                field="arrivalTime"
                direction={direction}
                value={flight.arrivalTime}
                setTripDetails={setTripDetails}
                placeholder="19:15"
                idPrefix={idPrefix}
              />
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <FlightField
                label="出發航廈"
                field="depTerminal"
                direction={direction}
                value={flight.depTerminal}
                setTripDetails={setTripDetails}
                placeholder="例如 T1"
                idPrefix={idPrefix}
              />
              <FlightField
                label="抵達航廈"
                field="arrTerminal"
                direction={direction}
                value={flight.arrTerminal}
                setTripDetails={setTripDetails}
                placeholder="例如 T2"
                idPrefix={idPrefix}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlightSection = ({
  tripDetails,
  setTripDetails,
  handleLookupFlight,
  isLookingUpFlight,
  flightLookupError,
  mobile = false
}) => {
  const [activeDirection, setActiveDirection] = useState('outbound');
  const directions = ['outbound', 'inbound'];
  const activeMeta = directionMeta[activeDirection];

  if (mobile) {
    return (
      <Card className="p-3">
        <SectionHeading
          icon={Plane}
          title="航班資訊"
          description="先填航班號與機場，再查詢航班。"
          compactDescription
        />

        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          {directions.map((direction) => {
            const meta = directionMeta[direction];
            const flightCode = tripDetails?.flights?.[direction]?.code;
            const isActive = activeDirection === direction;
            return (
              <button
                key={direction}
                type="button"
                onClick={() => setActiveDirection(direction)}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-black transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                aria-pressed={isActive}
              >
                <span className="block">{meta.label}</span>
                <span className={`block truncate text-[11px] ${isActive ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>
                  {flightCode || '缺航班'}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          正在編輯：{activeMeta.label}
        </p>

        <FlightCard
          direction={activeDirection}
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          handleLookupFlight={handleLookupFlight}
          isLookingUp={Boolean(isLookingUpFlight?.[activeDirection])}
          lookupError={flightLookupError?.[activeDirection]}
          compact
          idPrefix="mobile-"
        />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <SectionHeading
        icon={Plane}
        title="航班資訊"
        description="輸入航班代號與機場後，可用旅程日期查詢航班資料。"
      />

      <div className="space-y-4">
        <FlightCard
          direction="outbound"
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          handleLookupFlight={handleLookupFlight}
          isLookingUp={Boolean(isLookingUpFlight?.outbound)}
          lookupError={flightLookupError?.outbound}
          idPrefix="desktop-"
        />
        <FlightCard
          direction="inbound"
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          handleLookupFlight={handleLookupFlight}
          isLookingUp={Boolean(isLookingUpFlight?.inbound)}
          lookupError={flightLookupError?.inbound}
          idPrefix="desktop-"
        />
      </div>
    </Card>
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
  const [activeMobileSection, setActiveMobileSection] = useState('trip');

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

  const mobileSectionStatus = useMemo(() => getMobileSectionStatus(tripDetails), [tripDetails]);

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

  const renderMobileSection = () => {
    if (activeMobileSection === 'accommodation') {
      return (
        <AccommodationCard
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          onAddressChange={handleAccommodationAddressChange}
          onPlaceSelect={handleAccommodationPlaceSelect}
          onClearPlace={handleAccommodationPlaceClear}
          idPrefix="mobile-"
          compact
        />
      );
    }

    if (activeMobileSection === 'flights') {
      return (
        <FlightSection
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          handleLookupFlight={handleLookupFlight}
          isLookingUpFlight={isLookingUpFlight}
          flightLookupError={flightLookupError}
          mobile
        />
      );
    }

    return (
      <TripInfoCard
        tripDetails={tripDetails}
        setTripDetails={setTripDetails}
        idPrefix="mobile-"
        compact
      />
    );
  };

  return (
    <div className="mt-2 min-w-0 max-w-full space-y-4 overflow-x-hidden px-4 pb-10 sm:px-6 lg:px-8">
      <CompletionPanel tripDetails={tripDetails} />

      <ReservationImportCard tripDetails={tripDetails} setTripDetails={setTripDetails} />

      <MobileSectionSwitcher
        activeSection={activeMobileSection}
        onChange={setActiveMobileSection}
        sectionStatus={mobileSectionStatus}
      />

      <div className="hidden min-w-0 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="旅程日期" value={tripSnapshot.dates} icon={CalendarDays} />
        <InfoTile label="旅程預算" value={tripSnapshot.budget} icon={Wallet} />
        <InfoTile label="住宿" value={tripSnapshot.hotel} icon={Bed} />
        <InfoTile label="機場" value={tripSnapshot.airport} icon={Clock3} />
      </div>

      <div className="sm:hidden">
        {renderMobileSection()}
      </div>

      <div className="hidden min-w-0 gap-4 sm:grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-4">
          <TripInfoCard
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            idPrefix="desktop-"
          />
          <AccommodationCard
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            onAddressChange={handleAccommodationAddressChange}
            onPlaceSelect={handleAccommodationPlaceSelect}
            onClearPlace={handleAccommodationPlaceClear}
            idPrefix="desktop-"
          />
        </div>

        <FlightSection
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          handleLookupFlight={handleLookupFlight}
          isLookingUpFlight={isLookingUpFlight}
          flightLookupError={flightLookupError}
        />
      </div>
    </div>
  );
};

export default LogisticsTab;
