import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Lightbulb,
  MapPin,
  Sparkles,
  X
} from 'lucide-react';
import { Badge, Button } from '../ui';
import pixelNaviBunAtlas from '../../assets/ai/pixel-navibun-atlas.png';

const modeOptions = [
  { id: 'placeIdeas', label: '想去推薦', icon: Lightbulb },
  { id: 'dayPlan', label: '今日行程', icon: CalendarPlus }
];

const petMoodClasses = {
  error: 'ring-rose-300 bg-rose-50/85 dark:ring-rose-700 dark:bg-rose-950/45',
  happy: 'ring-emerald-300 bg-emerald-50/85 dark:ring-emerald-700 dark:bg-emerald-950/40',
  idle: 'ring-sky-300 bg-sky-50/85 dark:ring-brand-700 dark:bg-brand-950/40',
  thinking: 'ring-amber-300 bg-amber-50/85 dark:ring-amber-700 dark:bg-amber-950/40'
};

const petMoodDotClasses = {
  error: 'bg-rose-500',
  happy: 'bg-emerald-500',
  idle: 'bg-brand-500',
  thinking: 'bg-amber-500'
};

const PET_CELL_WIDTH = 192;
const PET_CELL_HEIGHT = 208;
const PET_ATLAS_COLUMNS = 8;
const PET_ATLAS_ROWS = 9;

const petAnimationStates = {
  idle: { row: 0, frames: 6, duration: '1100ms' },
  runningRight: { row: 1, frames: 8, duration: '860ms' },
  runningLeft: { row: 2, frames: 8, duration: '860ms' },
  waving: { row: 3, frames: 4, duration: '760ms' },
  jumping: { row: 4, frames: 5, duration: '780ms' },
  failed: { row: 5, frames: 8, duration: '980ms' },
  waiting: { row: 6, frames: 6, duration: '1080ms' },
  running: { row: 7, frames: 6, duration: '760ms' },
  review: { row: 8, frames: 6, duration: '920ms' }
};

const petMoodAnimation = {
  error: 'failed',
  happy: 'waving',
  idle: 'idle',
  thinking: 'running'
};

const AiTravelPet = ({ mood = 'idle', size = 'md' }) => {
  const isButton = size === 'button';
  const wrapperSize = isButton ? 'h-16 w-16' : 'h-20 w-20';
  const moodClass = petMoodClasses[mood] || petMoodClasses.idle;
  const dotClass = petMoodDotClasses[mood] || petMoodDotClasses.idle;
  const animation = petAnimationStates[petMoodAnimation[mood] || 'idle'];
  const spriteWidth = isButton ? 58 : 74;
  const spriteScale = spriteWidth / PET_CELL_WIDTH;
  const spriteHeight = Math.round(PET_CELL_HEIGHT * spriteScale);
  const rowY = Math.round(animation.row * PET_CELL_HEIGHT * spriteScale) * -1;
  const toX = Math.round(animation.frames * PET_CELL_WIDTH * spriteScale) * -1;
  const backgroundWidth = Math.round(PET_CELL_WIDTH * PET_ATLAS_COLUMNS * spriteScale);
  const backgroundHeight = Math.round(PET_CELL_HEIGHT * PET_ATLAS_ROWS * spriteScale);
  const spriteStyle = {
    width: `${spriteWidth}px`,
    height: `${spriteHeight}px`,
    backgroundImage: `url(${pixelNaviBunAtlas})`,
    backgroundSize: `${backgroundWidth}px ${backgroundHeight}px`,
    backgroundPosition: `0px ${rowY}px`,
    animationDuration: animation.duration,
    animationTimingFunction: `steps(${animation.frames})`,
    '--tp-pet-row-y': `${rowY}px`,
    '--tp-pet-to-x': `${toX}px`
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 shadow-sm ${wrapperSize} ${moodClass}`}
      aria-hidden="true"
    >
      <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${dotClass} shadow-sm`} />
      <span className="tp-ai-pet-sprite block select-none" style={spriteStyle} />
      {mood === 'happy' && (
        <Sparkles size={13} className="absolute -right-1 top-0 text-emerald-500 dark:text-emerald-300" />
      )}
    </div>
  );
};

const getRecommendationKey = (recommendation, target) => `${recommendation.id}:${target}`;

const RecommendationCard = ({
  recommendation,
  canEdit,
  onApplyPlace,
  onApplyEvent,
  appliedKeys
}) => {
  const [isApplying, setIsApplying] = useState('');
  const placeKey = getRecommendationKey(recommendation, 'place');
  const eventKey = getRecommendationKey(recommendation, 'event');
  const placeApplied = appliedKeys.has(placeKey);
  const eventApplied = appliedKeys.has(eventKey);

  const handleApply = async (target) => {
    if (!canEdit || isApplying) return;
    setIsApplying(target);
    try {
      if (target === 'place') {
        await onApplyPlace?.(recommendation);
      } else {
        await onApplyEvent?.(recommendation);
      }
    } finally {
      setIsApplying('');
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-black text-slate-950 dark:text-white">
            {recommendation.title}
          </h4>
          {recommendation.locationText && (
            <p className="mt-1 flex items-start gap-1.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span>{recommendation.locationText}</span>
            </p>
          )}
        </div>
        <Badge variant={recommendation.kind === 'event' ? 'info' : 'success'}>
          {recommendation.kind === 'event' ? '行程' : '想去'}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="muted">Day {recommendation.suggestedDay}</Badge>
        {recommendation.time && <Badge variant="muted">{recommendation.time}</Badge>}
        {recommendation.durationMinutes > 0 && (
          <Badge variant="muted">{recommendation.durationMinutes} 分鐘</Badge>
        )}
        {recommendation.tags.map((tag) => (
          <Badge key={tag} variant="info">{tag}</Badge>
        ))}
      </div>

      {recommendation.reason && (
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
          {recommendation.reason}
        </p>
      )}

      {recommendation.caution && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          {recommendation.caution}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          variant={placeApplied ? 'secondary' : 'primary'}
          size="sm"
          disabled={!canEdit || placeApplied || Boolean(isApplying)}
          onClick={() => handleApply('place')}
          className="w-full justify-center"
        >
          {placeApplied ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
          {placeApplied ? '已加入想去' : (isApplying === 'place' ? '加入中...' : '加到想去')}
        </Button>
        <Button
          variant={eventApplied ? 'secondary' : 'secondary'}
          size="sm"
          disabled={!canEdit || eventApplied || Boolean(isApplying)}
          onClick={() => handleApply('event')}
          className="w-full justify-center"
        >
          {eventApplied ? <CheckCircle2 size={14} /> : <CalendarPlus size={14} />}
          {eventApplied ? '已排入行程' : (isApplying === 'event' ? '排入中...' : `排進 Day ${recommendation.suggestedDay}`)}
        </Button>
      </div>
    </article>
  );
};

const TripAiRecommendationPanel = ({
  isOpen,
  mode,
  response,
  isLoading,
  error,
  canEdit,
  isHidden = false,
  onOpen,
  onClose,
  onModeChange,
  onGenerate,
  onApplyPlace,
  onApplyEvent
}) => {
  const [appliedKeys, setAppliedKeys] = useState(() => new Set());
  const recommendations = response?.recommendations || [];
  const petMood = error
    ? 'error'
    : (isLoading ? 'thinking' : (recommendations.length ? 'happy' : 'idle'));
  const activeModeOption = useMemo(
    () => modeOptions.find((option) => option.id === mode) || modeOptions[0],
    [mode]
  );
  const ActiveModeIcon = activeModeOption.icon;

  const handleApplyPlace = async (recommendation) => {
    await onApplyPlace?.(recommendation);
    setAppliedKeys((prev) => new Set(prev).add(getRecommendationKey(recommendation, 'place')));
  };

  const handleApplyEvent = async (recommendation) => {
    await onApplyEvent?.(recommendation);
    setAppliedKeys((prev) => new Set(prev).add(getRecommendationKey(recommendation, 'event')));
  };

  if (isHidden) return null;

  return (
    <div className="fixed bottom-[calc(var(--footer-nav-height)+0.75rem)] left-3 z-50 sm:left-auto sm:right-5 lg:bottom-28">
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpen?.(mode)}
          className="touch-target tp-press-feedback inline-flex items-center justify-center rounded-full transition active:scale-95"
          aria-label="開啟 AI 旅伴"
          title="AI 旅伴"
        >
          <AiTravelPet mood={petMood} size="button" />
        </button>
      )}

      {isOpen && (
        <section className="tp-panel max-h-[min(74vh,640px)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto p-4 shadow-2xl sm:w-[420px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <AiTravelPet mood={petMood} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  AI 旅伴
                </p>
                <h3 className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">
                  {response?.headline || '幫你找下一個好點子'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="關閉 AI 旅伴"
              title="關閉"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {response?.companionLine || '我只會讀這趟旅程目前的內容，先產生候選卡，你再決定要不要加入。'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = option.id === mode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onModeChange?.(option.id)}
                  className={`touch-target inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-black transition ${
                    active
                      ? 'border-cyan-200 bg-sky-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950/35 dark:text-brand-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={active}
                >
                  <Icon size={16} />
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => onGenerate?.(mode)}
            disabled={!canEdit || isLoading}
            className="mt-3 w-full justify-center"
          >
            {isLoading ? <ActiveModeIcon size={16} /> : <Sparkles size={16} />}
            {isLoading ? '產生推薦中...' : '產生推薦'}
          </Button>

          {!canEdit && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
              目前是唯讀權限，不能產生或套用 AI 推薦。
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="mt-4 grid gap-3">
            {recommendations.length ? (
              recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  canEdit={canEdit}
                  onApplyPlace={handleApplyPlace}
                  onApplyEvent={handleApplyEvent}
                  appliedKeys={appliedKeys}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                還沒有推薦。選一種模式後按「產生推薦」。
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default TripAiRecommendationPanel;
