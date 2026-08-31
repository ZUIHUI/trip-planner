import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Wallet
} from 'lucide-react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import { formatDateRangeText, getTripDisplayDates, normalizeTripDateFields } from '../../utils/tripDates';
import { getEditingMembersForTarget } from '../../utils/presence';
import { dateInputProps, moneyInputProps, plainTextInputProps } from '../../utils/mobileInputProps';
import {
  buildFlightDateValue,
  buildFlightTimeValue,
  getFlightDateDayCount,
  getFlightDateSelectParts,
  getFlightTimeSelectParts
} from '../../utils/flightDateTimeFields';
import AirportCodeInput from '../AirportCodeInput';
import GooglePlaceInput from '../GooglePlaceInput';
import { Badge, Button, Card, Field, Input, Select } from '../ui';
import EditingNotice from './EditingNotice';
import MobileMockupFrame from './MobileMockupFrame';

const statusMeta = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const directionMeta = {
  outbound: {
    label: '去程',
    helper: '手動記錄去程航班與機場資訊',
    colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
  },
  inbound: {
    label: '回程',
    helper: '手動記錄回程航班與機場資訊',
    colorClass: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
  }
};

const tripDetailEditingTargets = {
  meta: 'trip-details:meta',
  accommodation: 'trip-details:accommodation',
  budget: 'trip-details:budget',
  outboundFlight: 'trip-details:flights:outbound',
  inboundFlight: 'trip-details:flights:inbound'
};

const getFlightEditingTarget = (direction) => (
  direction === 'inbound'
    ? tripDetailEditingTargets.inboundFlight
    : tripDetailEditingTargets.outboundFlight
);

const getFlightDateFallbackYear = (tripDetails) => {
  const tripStart = tripDetails?.dateRange?.start;
  if (typeof tripStart === 'string') {
    const matchedStartYear = tripStart.match(/\b(19|20)\d{2}\b/);
    if (matchedStartYear) return Number(matchedStartYear[0]);
  }

  const datesText = tripDetails?.dates;
  if (typeof datesText !== 'string') return null;
  const matchedDatesYear = datesText.match(/\b(19|20)\d{2}\b/);
  return matchedDatesYear ? Number(matchedDatesYear[0]) : null;
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

const SectionHeading = ({ icon: Icon, title, aside }) => (
  <div className="mb-4 flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="tp-icon-chip">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h3 className="tp-section-title">{title}</h3>
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
            待補資料與狀態。
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

const TripInfoCard = ({
  tripDetails,
  setTripDetails,
  metaEditingMembers = [],
  budgetEditingMembers = [],
  onEditingFocus,
  onEditingBlur,
  idPrefix = '',
  compact = false
}) => {
  const startDate = tripDetails?.dateRange?.start || '';
  const endDate = tripDetails?.dateRange?.end || '';
  const displayDates = getTripDisplayDates(tripDetails);
  const invalidDateRange = Boolean(startDate && endDate && new Date(endDate) < new Date(startDate));
  const getEditingHandlers = (target) => ({
    onFocus: () => onEditingFocus?.(target),
    onBlur: (event) => onEditingBlur?.(target, event)
  });
  const metaEditingHandlers = getEditingHandlers(tripDetailEditingTargets.meta);
  const budgetEditingHandlers = getEditingHandlers(tripDetailEditingTargets.budget);

  return (
    <Card className="p-3 sm:p-4">
      <SectionHeading
        icon={Info}
        title="旅程資訊"
        aside={displayDates && (
          <Badge variant="info" className="self-start">
            {displayDates}
          </Badge>
        )}
      />
      <EditingNotice target={tripDetailEditingTargets.meta} members={metaEditingMembers} />
      <EditingNotice target={tripDetailEditingTargets.budget} members={budgetEditingMembers} />

      <div className="grid min-w-0 gap-3">
        <Field label="旅程名稱" htmlFor={`${idPrefix}trip-title`}>
          <Input
            id={`${idPrefix}trip-title`}
            {...plainTextInputProps}
            {...metaEditingHandlers}
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
              {...dateInputProps}
              {...metaEditingHandlers}
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
              {...dateInputProps}
              {...metaEditingHandlers}
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
              {...metaEditingHandlers}
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
              {...moneyInputProps}
              {...budgetEditingHandlers}
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
  editingMembers = [],
  onEditingFocus,
  onEditingBlur,
  idPrefix = '',
  compact = false
}) => (
  <Card
    className="p-3 sm:p-4"
    onFocusCapture={() => onEditingFocus?.(tripDetailEditingTargets.accommodation)}
    onBlurCapture={(event) => onEditingBlur?.(tripDetailEditingTargets.accommodation, event)}
  >
    <SectionHeading
      icon={Bed}
      title="住宿資訊"
    />
    <EditingNotice target={tripDetailEditingTargets.accommodation} members={editingMembers} />

    <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2">
      <InfoTile label="飯店" value={tripDetails?.accommodation?.name} icon={Bed} />
      <InfoTile label="地址" value={tripDetails?.accommodation?.address} icon={MapPin} />
    </div>

    <div className="grid min-w-0 gap-3">
      <Field label="飯店名稱" htmlFor={`${idPrefix}hotel-name`}>
        <Input
          id={`${idPrefix}hotel-name`}
          {...plainTextInputProps}
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

      <Field label="住宿地址" htmlFor={`${idPrefix}hotel-address`}>
        <GooglePlaceInput
          id={`${idPrefix}hotel-address`}
          placeholder="地址"
          value={tripDetails?.accommodation?.address || ''}
          onTextChange={onAddressChange}
          onPlaceSelect={onPlaceSelect}
          selectedPlace={tripDetails?.accommodation?.placeId ? tripDetails.accommodation : null}
          onClearPlace={onClearPlace}
          ariaLabel="住宿地址"
          emptyMessage="找不到地點，可手動輸入。"
          className="tp-input"
        />
      </Field>

      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
        <p className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">入住時間</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="入住時間" htmlFor={`${idPrefix}hotel-check-in`}>
            <Input
              id={`${idPrefix}hotel-check-in`}
              {...plainTextInputProps}
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
          <Field label="退房時間" htmlFor={`${idPrefix}hotel-check-out`}>
            <Input
              id={`${idPrefix}hotel-check-out`}
              {...plainTextInputProps}
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

const flightMonthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const flightHourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const flightMinuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const isEmptyDateDraft = (parts) => !parts.year && !parts.month && !parts.day;
const isEmptyTimeDraft = (parts) => !parts.hour && !parts.minute;

const getFlightYearOptions = (...sourceYears) => {
  const currentYear = new Date().getFullYear();
  const baseYear = sourceYears
    .map((value) => Number(value))
    .find((value) => Number.isInteger(value) && value >= 1900 && value <= 9999) || currentYear;
  const years = new Set();
  for (let year = baseYear - 1; year <= baseYear + 3; year += 1) {
    years.add(year);
  }
  sourceYears.forEach((value) => {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= 9999) {
      years.add(year);
    }
  });
  return [...years].sort((left, right) => left - right).map(String);
};

const getFlightDayOptions = (year, month) =>
  Array.from({ length: getFlightDateDayCount(year, month) }, (_, index) => String(index + 1).padStart(2, '0'));

const updateFlightFieldValue = (setTripDetails, direction, field, nextValue) => {
  setTripDetails((prev) => ({
    ...prev,
    flights: {
      ...(prev?.flights || {}),
      [direction]: {
        ...((prev?.flights && prev.flights[direction]) || {}),
        [field]: field === 'code' ? nextValue.toUpperCase() : nextValue
      }
    }
  }));
};

const FlightDateSelectField = ({
  label,
  field,
  direction,
  value,
  setTripDetails,
  dateFallbackYear = null,
  idPrefix = ''
}) => {
  const parsedValueParts = useMemo(
    () => getFlightDateSelectParts(value, dateFallbackYear),
    [value, dateFallbackYear]
  );
  const [draftParts, setDraftParts] = useState(parsedValueParts);

  useEffect(() => {
    setDraftParts(parsedValueParts);
  }, [parsedValueParts]);

  const yearOptions = useMemo(
    () => getFlightYearOptions(draftParts.year, parsedValueParts.year, dateFallbackYear),
    [dateFallbackYear, draftParts.year, parsedValueParts.year]
  );
  const dayOptions = useMemo(
    () => getFlightDayOptions(draftParts.year, draftParts.month),
    [draftParts.year, draftParts.month]
  );
  const baseId = `${idPrefix}flight-${direction}-${field}`;

  const handleChange = (part, nextValue) => {
    const nextParts = {
      ...draftParts,
      [part]: nextValue
    };

    if ((part === 'year' || part === 'month') && nextParts.day) {
      const nextDayOptions = getFlightDayOptions(nextParts.year, nextParts.month);
      if (!nextDayOptions.includes(nextParts.day)) {
        nextParts.day = '';
      }
    }

    setDraftParts(nextParts);
    const nextDateValue = buildFlightDateValue(nextParts);
    if (nextDateValue || isEmptyDateDraft(nextParts)) {
      updateFlightFieldValue(setTripDetails, direction, field, nextDateValue);
    }
  };

  const handleClear = () => {
    const emptyParts = { year: '', month: '', day: '' };
    setDraftParts(emptyParts);
    updateFlightFieldValue(setTripDetails, direction, field, '');
  };

  return (
    <Field label={label} htmlFor={`${baseId}-year`}>
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <Select
          id={`${baseId}-year`}
          aria-label={`${label} year`}
          value={draftParts.year}
          onChange={(event) => handleChange('year', event.target.value)}
          className="min-w-0"
        >
          <option value="">年</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </Select>
        <Select
          id={`${baseId}-month`}
          aria-label={`${label} month`}
          value={draftParts.month}
          onChange={(event) => handleChange('month', event.target.value)}
          className="min-w-0"
        >
          <option value="">月</option>
          {flightMonthOptions.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </Select>
        <Select
          id={`${baseId}-day`}
          aria-label={`${label} day`}
          value={draftParts.day}
          onChange={(event) => handleChange('day', event.target.value)}
          className="min-w-0"
        >
          <option value="">日</option>
          {dayOptions.map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClear}
        disabled={isEmptyDateDraft(draftParts)}
        className="mt-2 w-full justify-center"
      >
        清除
      </Button>
    </Field>
  );
};

const FlightTimeSelectField = ({
  label,
  field,
  direction,
  value,
  setTripDetails,
  idPrefix = ''
}) => {
  const parsedValueParts = useMemo(() => getFlightTimeSelectParts(value), [value]);
  const [draftParts, setDraftParts] = useState(parsedValueParts);
  const baseId = `${idPrefix}flight-${direction}-${field}`;

  useEffect(() => {
    setDraftParts(parsedValueParts);
  }, [parsedValueParts]);

  const handleChange = (part, nextValue) => {
    const nextParts = {
      ...draftParts,
      [part]: nextValue
    };
    setDraftParts(nextParts);
    const nextTimeValue = buildFlightTimeValue(nextParts);
    if (nextTimeValue || isEmptyTimeDraft(nextParts)) {
      updateFlightFieldValue(setTripDetails, direction, field, nextTimeValue);
    }
  };

  const handleClear = () => {
    const emptyParts = { hour: '', minute: '' };
    setDraftParts(emptyParts);
    updateFlightFieldValue(setTripDetails, direction, field, '');
  };

  return (
    <Field label={label} htmlFor={`${baseId}-hour`}>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <Select
          id={`${baseId}-hour`}
          aria-label={`${label} hour`}
          value={draftParts.hour}
          onChange={(event) => handleChange('hour', event.target.value)}
          className="min-w-0"
        >
          <option value="">時</option>
          {flightHourOptions.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </Select>
        <Select
          id={`${baseId}-minute`}
          aria-label={`${label} minute`}
          value={draftParts.minute}
          onChange={(event) => handleChange('minute', event.target.value)}
          className="min-w-0"
        >
          <option value="">分</option>
          {flightMinuteOptions.map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClear}
        disabled={isEmptyTimeDraft(draftParts)}
        className="mt-2 w-full justify-center"
      >
        清除
      </Button>
    </Field>
  );
};

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
      {...plainTextInputProps}
      type={type}
      autoComplete="off"
      autoCapitalize={field === 'code' ? 'characters' : 'none'}
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="next"
      placeholder={placeholder}
      value={value || ''}
      onChange={(event) => updateFlightFieldValue(setTripDetails, direction, field, event.target.value)}
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
  editingMembers = [],
  onEditingFocus,
  onEditingBlur,
  compact = false,
  idPrefix = ''
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = directionMeta[direction];
  const flight = tripDetails?.flights?.[direction] || {};
  const flightDateFallbackYear = getFlightDateFallbackYear(tripDetails);
  const showDetails = !compact || detailsOpen;
  const editingTarget = getFlightEditingTarget(direction);
  const compactRoute = flight.dep || flight.arr
    ? `${flight.dep || '未設定'} -> ${flight.arr || '未設定'}`
    : '';
  const compactTime = flight.departureTime || flight.arrivalTime
    ? `${flight.departureTime || '未設定'} / ${flight.arrivalTime || '未設定'}`
    : '';
  const compactSummary = [flight.airline, compactRoute, flight.date, compactTime]
    .filter(Boolean)
    .join(' | ');

  return (
    <div
      className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45"
      onFocusCapture={() => onEditingFocus?.(editingTarget)}
      onBlurCapture={(event) => onEditingBlur?.(editingTarget, event)}
    >
      <div className="mb-3 flex min-w-0 items-start gap-3">
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
            {compact && compactSummary && (
              <p className="mt-2 max-w-full break-words rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {compactSummary}
              </p>
            )}
          </div>
        </div>
      </div>
      <EditingNotice target={editingTarget} members={editingMembers} />

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
              <FlightDateSelectField
                label="日期"
                field="date"
                direction={direction}
                value={flight.date}
                setTripDetails={setTripDetails}
                dateFallbackYear={flightDateFallbackYear}
                idPrefix={idPrefix}
              />
              <FlightTimeSelectField
                label="起飛時間"
                field="departureTime"
                direction={direction}
                value={flight.departureTime}
                setTripDetails={setTripDetails}
                idPrefix={idPrefix}
              />
              <FlightTimeSelectField
                label="抵達時間"
                field="arrivalTime"
                direction={direction}
                value={flight.arrivalTime}
                setTripDetails={setTripDetails}
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
  editingByTarget = {},
  onEditingFocus,
  onEditingBlur,
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
          editingMembers={getEditingMembersForTarget(editingByTarget, getFlightEditingTarget(activeDirection))}
          onEditingFocus={onEditingFocus}
          onEditingBlur={onEditingBlur}
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
      />

      <div className="space-y-4">
        <FlightCard
          direction="outbound"
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          editingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.outboundFlight)}
          onEditingFocus={onEditingFocus}
          onEditingBlur={onEditingBlur}
          idPrefix="desktop-"
        />
        <FlightCard
          direction="inbound"
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          editingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.inboundFlight)}
          onEditingFocus={onEditingFocus}
          onEditingBlur={onEditingBlur}
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
    editingByTarget,
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  } = useTripWorkspace();
  const [activeMobileSection, setActiveMobileSection] = useState('trip');
  const {
    startEditing: handleEditingFocus,
    stopEditing: stopCollaborationEditing
  } = useCollaborationEditing({
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });

  const handleEditingBlur = useCallback((target, event) => {
    if (!target || !canEdit) return;
    const nextFocusedElement = event?.relatedTarget;
    if (nextFocusedElement && event.currentTarget?.contains?.(nextFocusedElement)) {
      return;
    }
    stopCollaborationEditing();
  }, [canEdit, stopCollaborationEditing]);

  useEffect(() => {
    stopCollaborationEditing();
  }, [activeMobileSection, stopCollaborationEditing]);

  const tripSnapshot = useMemo(() => {
    const budget = Number(tripDetails?.budget?.total || 0);
    return {
      dates: getTripDisplayDates(tripDetails) || '未設定日期',
      budget: budget > 0 ? `${budget.toLocaleString()} 元` : '未設定預算',
      hotel: tripDetails?.accommodation?.name || '尚未設定住宿',
      airport: tripDetails?.flights?.outbound?.dep && tripDetails?.flights?.inbound?.arr
        ? `${tripDetails.flights.outbound.dep} / ${tripDetails.flights.inbound.arr}`
        : '航班機場未完整設定'
    };
  }, [tripDetails]);

  const mobileSectionStatus = useMemo(() => getMobileSectionStatus(tripDetails), [tripDetails]);
  const activeMobileSectionLabel = useMemo(() => ({
    trip: '旅程',
    accommodation: '住宿',
    flights: '航班'
  }[activeMobileSection] || '旅程'), [activeMobileSection]);

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
          editingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.accommodation)}
          onEditingFocus={handleEditingFocus}
          onEditingBlur={handleEditingBlur}
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
          editingByTarget={editingByTarget}
          onEditingFocus={handleEditingFocus}
          onEditingBlur={handleEditingBlur}
          mobile
        />
      );
    }

    return (
      <TripInfoCard
        tripDetails={tripDetails}
        setTripDetails={setTripDetails}
        metaEditingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.meta)}
        budgetEditingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.budget)}
        onEditingFocus={handleEditingFocus}
        onEditingBlur={handleEditingBlur}
        idPrefix="mobile-"
        compact
      />
    );
  };

  return (
    <MobileMockupFrame
      icon={Plane}
      eyebrow="旅程資訊"
      title="住宿與航班"
      subtitle="集中管理日期、住宿、預算與航班。"
      stats={[
        { value: tripSnapshot.dates, label: '日期' },
        { value: tripSnapshot.budget, label: '預算' },
        { value: activeMobileSectionLabel, label: '區塊' }
      ]}
      tone="info"
      className="mt-2 min-w-0 max-w-full space-y-4 overflow-x-hidden px-4 pb-10 sm:px-6 lg:px-8"
    >
      <CompletionPanel tripDetails={tripDetails} />

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
            metaEditingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.meta)}
            budgetEditingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.budget)}
            onEditingFocus={handleEditingFocus}
            onEditingBlur={handleEditingBlur}
            idPrefix="desktop-"
          />
          <AccommodationCard
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            onAddressChange={handleAccommodationAddressChange}
            onPlaceSelect={handleAccommodationPlaceSelect}
            onClearPlace={handleAccommodationPlaceClear}
            editingMembers={getEditingMembersForTarget(editingByTarget, tripDetailEditingTargets.accommodation)}
            onEditingFocus={handleEditingFocus}
            onEditingBlur={handleEditingBlur}
            idPrefix="desktop-"
          />
        </div>

        <FlightSection
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          editingByTarget={editingByTarget}
          onEditingFocus={handleEditingFocus}
          onEditingBlur={handleEditingBlur}
        />
      </div>
    </MobileMockupFrame>
  );
};

export default LogisticsTab;
