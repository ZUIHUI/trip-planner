import React from 'react';
import {
  AlertTriangle,
  Bed,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Image,
  ListChecks,
  Loader2,
  Plane,
  Printer,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Wallet
} from 'lucide-react';
import Modal from '../Modal';
import { Button, Card, ErrorState, LoadingState } from '../ui';
import { formatHandbookMoney } from '../../utils/tripHandbook';
import { normalizeCoverImageUrl } from '../../utils/coverImage';

const SectionHeading = ({ icon: Icon, title, kicker }) => (
  <div className="mb-4 flex min-w-0 items-center gap-3">
    <span className="trip-handbook-icon">
      <Icon size={18} />
    </span>
    <div className="min-w-0">
      {kicker && <p className="text-xs font-black uppercase tracking-[0.08em] text-sky-700 print:text-slate-500 dark:text-sky-300">{kicker}</p>}
      <h3 className="break-words text-lg font-black text-slate-950 print:text-slate-950 dark:text-white">{title}</h3>
    </div>
  </div>
);

const TextList = ({ items = [], emptyText = '尚未整理資料。' }) => (
  items.length ? (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-sm font-semibold text-slate-700 print:text-slate-700 dark:text-slate-200">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 print:bg-slate-500" aria-hidden="true" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm font-semibold text-slate-500 print:text-slate-500 dark:text-slate-400">{emptyText}</p>
  )
);

const FlightRows = ({ flights = [] }) => (
  flights.length ? (
    <div className="grid gap-3 sm:grid-cols-2">
      {flights.map((flight, index) => (
        <div key={`${flight.label}-${index}`} className="trip-handbook-mini-card">
          <p className="text-xs font-black text-sky-700 print:text-slate-500 dark:text-sky-300">{flight.label || `航班 ${index + 1}`}</p>
          <p className="mt-1 break-words text-base font-black text-slate-950 print:text-slate-950 dark:text-white">{flight.code || '未填航班'}</p>
          <div className="mt-2 space-y-1 text-sm font-semibold text-slate-600 print:text-slate-600 dark:text-slate-300">
            {flight.date && <p>{flight.date}</p>}
            {flight.route && <p>{flight.route}</p>}
            {flight.time && <p>{flight.time}</p>}
            {flight.note && <p>{flight.note}</p>}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm font-semibold text-slate-500 print:text-slate-500 dark:text-slate-400">尚未整理航班資料。</p>
  )
);

const ScheduleRows = ({ schedule = [] }) => (
  schedule.length ? (
    <div className="space-y-3">
      {schedule.map((event, index) => (
        <div key={`${event.title}-${index}`} className="trip-handbook-schedule-row">
          <div className="trip-handbook-time">{event.time || '時間未定'}</div>
          <div className="min-w-0 flex-1">
            <p className="break-words font-black text-slate-950 print:text-slate-950 dark:text-white">{event.title || '未命名行程'}</p>
            {event.location && <p className="mt-1 break-words text-sm font-semibold text-slate-600 print:text-slate-600 dark:text-slate-300">{event.location}</p>}
            {event.note && <p className="mt-1 break-words text-sm text-slate-500 print:text-slate-500 dark:text-slate-400">{event.note}</p>}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm font-semibold text-slate-500 print:text-slate-500 dark:text-slate-400">這一天尚未安排明確行程。</p>
  )
);

const CoverVisual = ({ imageUrl, title }) => (
  <div className="trip-handbook-cover-visual">
    {imageUrl ? (
      <img src={imageUrl} alt={title || '旅程封面'} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sky-100 text-sky-800 print:bg-slate-100 print:text-slate-700 dark:bg-slate-800 dark:text-sky-200">
        <Image size={34} />
        <span className="text-sm font-black uppercase tracking-[0.16em]">Travel Handbook</span>
      </div>
    )}
  </div>
);

const HandbookCover = ({ handbook, coverImage }) => {
  const imageUrl = normalizeCoverImageUrl(coverImage);

  return (
    <section className="trip-handbook-page trip-handbook-cover-page">
      <CoverVisual imageUrl={imageUrl} title={handbook.cover.title} />
      <div className="trip-handbook-cover-copy">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700 print:text-slate-500 dark:text-sky-300">AI Travel Handbook</p>
        <h2 className="mt-3 break-words text-4xl font-black leading-tight text-slate-950 print:text-slate-950 dark:text-white">
          {handbook.cover.title}
        </h2>
        {handbook.cover.subtitle && (
          <p className="mt-3 break-words text-lg font-bold text-slate-700 print:text-slate-700 dark:text-slate-200">
            {handbook.cover.subtitle}
          </p>
        )}
        {handbook.cover.dateText && (
          <p className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-sm font-black text-sky-800 print:border print:border-slate-200 print:bg-white print:text-slate-700 dark:bg-slate-950/40 dark:text-sky-200">
            {handbook.cover.dateText}
          </p>
        )}
        {handbook.cover.intro && (
          <p className="mt-5 max-w-2xl break-words text-sm font-semibold leading-7 text-slate-600 print:text-slate-600 dark:text-slate-300">
            {handbook.cover.intro}
          </p>
        )}
      </div>
    </section>
  );
};

const OverviewPage = ({ handbook }) => (
  <section className="trip-handbook-page">
    <SectionHeading icon={BookOpen} title="旅程摘要" kicker="Overview" />
    <div className="trip-handbook-feature-card">
      <p className="break-words text-base font-semibold leading-7 text-slate-700 print:text-slate-700 dark:text-slate-200">
        {handbook.overview.summary || '目前旅程資料已整理成每日行程、交通住宿、清單與費用摘要。'}
      </p>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="trip-handbook-card">
        <SectionHeading icon={Sparkles} title="亮點" />
        <TextList items={handbook.overview.highlights} emptyText="目前沒有額外亮點。" />
      </div>
      <div className="trip-handbook-card">
        <SectionHeading icon={AlertTriangle} title="出發前確認" />
        <TextList items={handbook.manualChecks} emptyText="目前沒有額外提醒。" />
      </div>
    </div>
  </section>
);

const DayPage = ({ day }) => (
  <section className="trip-handbook-page">
    <div className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 print:border-slate-300 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-black text-sky-700 print:text-slate-500 dark:text-sky-300">Day {day.day}</p>
        <h3 className="break-words text-2xl font-black text-slate-950 print:text-slate-950 dark:text-white">{day.title}</h3>
      </div>
      {day.date && <p className="text-sm font-black text-slate-500 print:text-slate-600 dark:text-slate-300">{day.date}</p>}
    </div>
    {day.intro && (
      <p className="mb-5 break-words rounded-lg bg-sky-50 p-4 text-sm font-semibold leading-7 text-slate-700 print:border print:border-slate-200 print:bg-white print:text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
        {day.intro}
      </p>
    )}
    <ScheduleRows schedule={day.schedule} />
    {day.notes.length > 0 && (
      <div className="mt-5 trip-handbook-card">
        <SectionHeading icon={ListChecks} title="本日提醒" />
        <TextList items={day.notes} />
      </div>
    )}
  </section>
);

const LogisticsPage = ({ handbook }) => {
  const accommodation = handbook.logistics.accommodation;

  return (
    <section className="trip-handbook-page">
      <SectionHeading icon={Plane} title="交通與住宿" kicker="Logistics" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="trip-handbook-card">
          <SectionHeading icon={Bed} title="住宿" />
          <p className="break-words text-lg font-black text-slate-950 print:text-slate-950 dark:text-white">{accommodation.name || '尚未填住宿'}</p>
          {accommodation.address && <p className="mt-2 break-words text-sm font-semibold text-slate-600 print:text-slate-600 dark:text-slate-300">{accommodation.address}</p>}
          {accommodation.note && <p className="mt-2 break-words text-sm text-slate-500 print:text-slate-500 dark:text-slate-400">{accommodation.note}</p>}
        </div>
        <div className="trip-handbook-card">
          <SectionHeading icon={Plane} title="航班" />
          <FlightRows flights={handbook.logistics.flights} />
        </div>
      </div>
      {handbook.logistics.notes.length > 0 && (
        <div className="mt-4 trip-handbook-card">
          <SectionHeading icon={AlertTriangle} title="交通提醒" />
          <TextList items={handbook.logistics.notes} />
        </div>
      )}
    </section>
  );
};

const ListsPage = ({ handbook }) => (
  <section className="trip-handbook-page">
    <SectionHeading icon={CheckSquare} title="清單與花費" kicker="Checklist" />
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="trip-handbook-card">
        <SectionHeading icon={CheckSquare} title="行前" />
        <TextList items={handbook.lists.preTrip} emptyText="沒有未整理行前項目。" />
      </div>
      <div className="trip-handbook-card">
        <SectionHeading icon={ListChecks} title="行李" />
        <TextList items={handbook.lists.packing} emptyText="沒有未整理行李項目。" />
      </div>
      <div className="trip-handbook-card">
        <SectionHeading icon={ShoppingCart} title="購物" />
        <TextList items={handbook.lists.shopping} emptyText="沒有未整理購物項目。" />
      </div>
    </div>
    <div className="mt-4 trip-handbook-card">
      <SectionHeading icon={Wallet} title="費用摘要" />
      <p className="break-words text-sm font-semibold leading-7 text-slate-700 print:text-slate-700 dark:text-slate-200">
        {handbook.expenses.summary || '目前尚未建立費用摘要。'}
      </p>
      {handbook.expenses.totals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {handbook.expenses.totals.map((total) => (
            <span key={`${total.currency}-${total.amount}`} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-800 print:border-slate-300 print:bg-white print:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-200">
              {formatHandbookMoney(total)}
            </span>
          ))}
        </div>
      )}
    </div>
  </section>
);

export const TripHandbookDocument = ({
  handbook,
  coverImage = '',
  className = ''
}) => {
  if (!handbook) return null;

  return (
    <article className={`trip-handbook-document ${className}`}>
      <HandbookCover handbook={handbook} coverImage={coverImage} />
      <OverviewPage handbook={handbook} />
      {handbook.days.map((day) => (
        <DayPage key={`${day.day}-${day.title}`} day={day} />
      ))}
      <LogisticsPage handbook={handbook} />
      <ListsPage handbook={handbook} />
    </article>
  );
};

const TripHandbookModal = ({
  isOpen,
  onClose,
  canEdit,
  handbook,
  coverImage = '',
  isLoading,
  isLoadingSaved,
  isExporting,
  error,
  onGenerate,
  onExportPdf
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="旅遊手冊" size="xl">
    <div className="space-y-4">
      <Card className="no-print p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="tp-icon-chip h-10 w-10">
                <BookOpen size={19} />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">AI 旅遊手冊</h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">已保存於旅程，可匯出 PDF</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onGenerate} disabled={!canEdit || isLoading}>
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {handbook ? '重新產生' : '產生手冊'}
            </Button>
            <Button onClick={onExportPdf} disabled={!handbook || isLoading || isExporting}>
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
              匯出 PDF
            </Button>
          </div>
        </div>
        {!canEdit && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
            你目前只能查看這趟旅程；請主辦人開放可編輯權限後再產生 AI 旅遊手冊。
          </div>
        )}
      </Card>

      {isLoading && <LoadingState label="正在整理旅遊手冊..." />}
      {!isLoading && isLoadingSaved && !handbook && <LoadingState label="正在讀取已保存的手冊..." />}

      {!isLoading && !isLoadingSaved && error && (
        <ErrorState
          title="旅遊手冊產生失敗"
          description={error}
          actionLabel={canEdit ? '再試一次' : ''}
          onAction={canEdit ? onGenerate : undefined}
        />
      )}

      {!isLoading && !isLoadingSaved && !handbook && !error && (
        <Card className="p-5 text-center">
          <CalendarDays className="mx-auto text-sky-600 dark:text-sky-300" size={34} />
          <p className="mt-3 text-base font-black text-slate-950 dark:text-white">準備把目前旅程排成小冊</p>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-slate-500 dark:text-slate-400">
            會使用現有行程、住宿航班、清單與費用資料，不補外部即時資訊；產生後會留存在這趟旅程中。
          </p>
        </Card>
      )}

      {!isLoading && handbook && (
        <TripHandbookDocument
          handbook={handbook}
          coverImage={coverImage}
          className="trip-handbook-screen-document"
        />
      )}
    </div>
  </Modal>
);

export default TripHandbookModal;
