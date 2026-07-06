import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarPlus,
  CheckCircle2,
  EyeOff,
  Lightbulb,
  MapPin,
  Sparkles,
  X
} from 'lucide-react';
import { Badge, Button } from '../ui';
import pixelNaviBunAtlas from '../../assets/ai/pixel-navibun-atlas.png';

const modeOptions = [
  { id: 'dayPlan', label: '今日行程', icon: CalendarPlus }
];

const AI_INITIAL_IDEA_MAX_LENGTH = 600;

const PET_CELL_WIDTH = 192;
const PET_CELL_HEIGHT = 208;
const PET_ATLAS_COLUMNS = 8;
const PET_ATLAS_ROWS = 9;
const PET_BUTTON_SIZE = 64;
const PET_DRAG_MARGIN = 8;
const PET_MOBILE_BOTTOM_OFFSET = 84;
const PET_DESKTOP_BOTTOM_OFFSET = 112;
const PORTAL_FOOTER_NAV_HEIGHT = 'calc(72px + env(safe-area-inset-bottom))';
const PET_POSITION_STORAGE_KEY = 'tripPlanner.aiCompanionPosition';

const getCompanionViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 390, height: 720, offsetLeft: 0, offsetTop: 0 };
  }

  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width || window.innerWidth,
    height: visualViewport?.height || window.innerHeight,
    // The companion is position: fixed and pointer events use clientX/clientY,
    // so its stored coordinates must stay viewport-local. Some mobile browsers
    // change visualViewport offsets while scrolling/toolbars collapse, which
    // would otherwise push the companion outside the visible screen.
    offsetLeft: 0,
    offsetTop: 0
  };
};

const getCompanionBottomOffset = (viewportWidth) => (
  viewportWidth >= 1024 ? PET_DESKTOP_BOTTOM_OFFSET : PET_MOBILE_BOTTOM_OFFSET
);

const clampCompanionPosition = (position) => {
  const rawX = Number.isFinite(position?.x) ? position.x : 12;
  const rawY = Number.isFinite(position?.y) ? position.y : 360;

  if (typeof window === 'undefined') {
    return { x: rawX, y: rawY };
  }

  const viewport = getCompanionViewport();
  const minX = viewport.offsetLeft + PET_DRAG_MARGIN;
  const minY = viewport.offsetTop + PET_DRAG_MARGIN;
  const maxX = Math.max(
    minX,
    viewport.offsetLeft + viewport.width - PET_BUTTON_SIZE - PET_DRAG_MARGIN
  );
  const maxY = Math.max(
    minY,
    viewport.offsetTop + viewport.height - PET_BUTTON_SIZE - getCompanionBottomOffset(viewport.width)
  );

  return {
    x: Math.min(Math.max(rawX, minX), maxX),
    y: Math.min(Math.max(rawY, minY), maxY)
  };
};

const getDefaultCompanionPosition = () => {
  if (typeof window === 'undefined') {
    return { x: 12, y: 360 };
  }

  const viewport = getCompanionViewport();
  const sideOffset = viewport.width >= 640 ? 20 : 12;
  const bottomOffset = getCompanionBottomOffset(viewport.width);
  return clampCompanionPosition({
    x: viewport.width >= 640
      ? viewport.offsetLeft + viewport.width - PET_BUTTON_SIZE - sideOffset
      : viewport.offsetLeft + sideOffset,
    y: viewport.offsetTop + viewport.height - PET_BUTTON_SIZE - bottomOffset
  });
};

const readCompanionPosition = () => {
  if (typeof window === 'undefined') {
    return getDefaultCompanionPosition();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PET_POSITION_STORAGE_KEY) || 'null');
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
      return clampCompanionPosition(parsed);
    }
  } catch {
    // Position is only a local preference; fall back quietly if storage is unavailable.
  }

  return getDefaultCompanionPosition();
};

const persistCompanionPosition = (position) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PET_POSITION_STORAGE_KEY, JSON.stringify(clampCompanionPosition(position)));
  } catch {
    // The companion remains draggable even when localStorage is blocked.
  }
};

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
  landing: 'jumping',
  lifted: 'waiting',
  thinking: 'running'
};

const AiTravelPet = ({ mood = 'idle', size = 'md' }) => {
  const isButton = size === 'button';
  const wrapperSize = isButton ? 'h-16 w-16' : 'h-20 w-20';
  const animation = petAnimationStates[petMoodAnimation[mood] || 'idle'];
  const spriteWidth = isButton ? 58 : 74;
  const spriteScale = spriteWidth / PET_CELL_WIDTH;
  const spriteHeight = Math.round(PET_CELL_HEIGHT * spriteScale);
  const rowY = Math.round(animation.row * PET_CELL_HEIGHT * spriteScale) * -1;
  const lastFrameIndex = Math.max(animation.frames - 1, 0);
  const toX = Math.round(lastFrameIndex * PET_CELL_WIDTH * spriteScale) * -1;
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
      className={`tp-ai-pet-presence relative flex shrink-0 items-center justify-center overflow-visible ${wrapperSize}`}
      aria-hidden="true"
    >
      <span className="tp-ai-pet-sprite block select-none" style={spriteStyle} />
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
    <article className="rounded-lg border border-[#e0e9e0] bg-white/80 p-3 shadow-sm supports-[backdrop-filter]:backdrop-blur dark:border-brand-200/20 dark:bg-brand-50/75">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-black text-stone-800 dark:text-brand-900">
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
  isCompanionHidden = false,
  onOpen,
  onClose,
  onHideCompanion,
  onSummon,
  onModeChange,
  onGenerate,
  onApplyPlace,
  onApplyEvent
}) => {
  const [appliedKeys, setAppliedKeys] = useState(() => new Set());
  const [initialIdeaText, setInitialIdeaText] = useState('');
  const [companionPosition, setCompanionPosition] = useState(readCompanionPosition);
  const [companionDragState, setCompanionDragState] = useState('idle');
  const [portalTarget, setPortalTarget] = useState(null);
  const companionDragRef = useRef(null);
  const suppressCompanionClickRef = useRef(false);
  const landingTimerRef = useRef(null);
  const recommendations = response?.recommendations || [];
  const petMood = error
    ? 'error'
    : (isLoading ? 'thinking' : (recommendations.length ? 'happy' : 'idle'));
  const floatingPetMood = companionDragState === 'landing'
    ? 'landing'
    : ((companionDragState === 'lifted' || companionDragState === 'dragging') ? 'lifted' : petMood);
  const activeModeOption = useMemo(
    () => modeOptions.find((option) => option.id === mode) || modeOptions[0],
    [mode]
  );
  const ActiveModeIcon = activeModeOption.icon;
  const companionContainerClassName = isOpen
    ? 'fixed bottom-[calc(var(--footer-nav-height)+0.75rem)] left-3 z-[70] sm:left-auto sm:right-5 lg:bottom-28'
    : 'fixed z-[70]';
  const companionContainerStyle = isOpen
    ? { '--footer-nav-height': PORTAL_FOOTER_NAV_HEIGHT }
    : {
        '--footer-nav-height': PORTAL_FOOTER_NAV_HEIGHT,
        left: `${companionPosition.x}px`,
        top: `${companionPosition.y}px`
      };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    setPortalTarget(document.body);
    return () => setPortalTarget(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const keepCompanionInViewport = () => {
      setCompanionPosition((currentPosition) => {
        const nextPosition = clampCompanionPosition(currentPosition || getDefaultCompanionPosition());
        if (currentPosition?.x === nextPosition.x && currentPosition?.y === nextPosition.y) {
          return currentPosition;
        }
        return nextPosition;
      });
    };
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', keepCompanionInViewport);
    window.addEventListener('scroll', keepCompanionInViewport, { passive: true });
    visualViewport?.addEventListener('resize', keepCompanionInViewport);
    visualViewport?.addEventListener('scroll', keepCompanionInViewport);
    return () => {
      window.removeEventListener('resize', keepCompanionInViewport);
      window.removeEventListener('scroll', keepCompanionInViewport);
      visualViewport?.removeEventListener('resize', keepCompanionInViewport);
      visualViewport?.removeEventListener('scroll', keepCompanionInViewport);
    };
  }, []);

  useEffect(() => () => {
    if (landingTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(landingTimerRef.current);
    }
  }, []);

  const playCompanionLanding = useCallback(() => {
    if (landingTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(landingTimerRef.current);
    }

    setCompanionDragState('landing');
    if (typeof window !== 'undefined') {
      landingTimerRef.current = window.setTimeout(() => {
        setCompanionDragState('idle');
        landingTimerRef.current = null;
      }, 440);
    }
  }, []);

  const handleCompanionPointerDown = useCallback((event) => {
    if (isOpen || (event.button != null && event.button !== 0)) return;

    if (landingTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(landingTimerRef.current);
      landingTimerRef.current = null;
    }

    companionDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: companionPosition,
      moved: false
    };
    setCompanionDragState('lifted');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [companionPosition, isOpen]);

  const handleCompanionPointerMove = useCallback((event) => {
    const drag = companionDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const hasMoved = Math.abs(dx) + Math.abs(dy) > 4;
    if (hasMoved) {
      drag.moved = true;
      setCompanionDragState('dragging');
    }

    setCompanionPosition(clampCompanionPosition({
      x: drag.origin.x + dx,
      y: drag.origin.y + dy
    }));
  }, []);

  const handleCompanionPointerEnd = useCallback((event) => {
    const drag = companionDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    companionDragRef.current = null;

    const finalPosition = clampCompanionPosition({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY
    });
    setCompanionPosition(finalPosition);
    persistCompanionPosition(finalPosition);

    if (drag.moved) {
      suppressCompanionClickRef.current = true;
      event.preventDefault();
      playCompanionLanding();
      return;
    }

    setCompanionDragState('idle');
  }, [playCompanionLanding]);

  const handleCompanionClick = useCallback((event) => {
    if (suppressCompanionClickRef.current) {
      suppressCompanionClickRef.current = false;
      event.preventDefault();
      return;
    }

    onOpen?.(mode);
  }, [mode, onOpen]);

  const handleGenerateRecommendations = useCallback(() => {
    onGenerate?.('dayPlan', { userIdea: initialIdeaText });
  }, [initialIdeaText, onGenerate]);

  const handleApplyPlace = async (recommendation) => {
    await onApplyPlace?.(recommendation);
    setAppliedKeys((prev) => new Set(prev).add(getRecommendationKey(recommendation, 'place')));
  };

  const handleApplyEvent = async (recommendation) => {
    await onApplyEvent?.(recommendation);
    setAppliedKeys((prev) => new Set(prev).add(getRecommendationKey(recommendation, 'event')));
  };

  if (isHidden) return null;

  if (isCompanionHidden) {
    const hiddenCompanion = (
      <div
        className="fixed bottom-[calc(var(--footer-nav-height)+0.75rem)] left-3 z-[70] sm:left-auto sm:right-5 lg:bottom-28"
        style={{ '--footer-nav-height': PORTAL_FOOTER_NAV_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => onSummon?.(mode)}
          className="touch-target tp-press-feedback tp-ai-companion-summon inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-sm ring-1 ring-[#e0e9e0] transition hover:-translate-y-1 hover:bg-white hover:text-brand-900 hover:shadow-md active:scale-95 supports-[backdrop-filter]:backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-50/90 dark:text-brand-900 dark:ring-brand-300/20 dark:hover:bg-brand-100"
          aria-label="叫回旅伴"
          title="叫回旅伴"
        >
          <AiTravelPet mood="idle" size="button" />
        </button>
      </div>
    );

    return portalTarget ? createPortal(hiddenCompanion, portalTarget) : hiddenCompanion;
  }

  const companionPanel = (
    <div className={companionContainerClassName} style={companionContainerStyle}>
      {!isOpen && (
        <button
          type="button"
          onClick={handleCompanionClick}
          onPointerDown={handleCompanionPointerDown}
          onPointerMove={handleCompanionPointerMove}
          onPointerUp={handleCompanionPointerEnd}
          onPointerCancel={handleCompanionPointerEnd}
          data-drag-state={companionDragState}
          className="touch-target tp-ai-companion-button inline-flex items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label="開啟旅伴"
          title="旅伴"
        >
          <AiTravelPet mood={floatingPetMood} size="button" />
        </button>
      )}

      {isOpen && (
        <section className="tp-panel max-h-[min(74vh,640px)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto p-4 shadow-2xl sm:w-[420px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <AiTravelPet mood={petMood} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  旅伴
                </p>
                <h3 className="mt-0.5 text-lg font-black text-stone-800 dark:text-brand-900">
                  {response?.headline || '幫你找下一個好點子'}
                </h3>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
              type="button"
              onClick={onHideCompanion}
              className="touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="隱藏旅伴"
              title="隱藏旅伴"
            >
                <EyeOff size={17} />
              </button>
              <button
              type="button"
              onClick={onClose}
              className="touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="關閉旅伴"
              title="關閉"
            >
                <X size={18} />
              </button>
            </div>
          </div>


          <div className="mt-4">
            <label
              htmlFor="trip-ai-initial-idea"
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              初始想法
            </label>
            <textarea
              id="trip-ai-initial-idea"
              value={initialIdeaText}
              onChange={(event) => setInitialIdeaText(event.target.value.slice(0, AI_INITIAL_IDEA_MAX_LENGTH))}
              placeholder="例如：想晚點出門、安排室內備案、晚上想吃燒肉"
              rows={3}
              maxLength={AI_INITIAL_IDEA_MAX_LENGTH}
              className="w-full resize-none rounded-lg border border-[#e0e9e0] bg-white/80 px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 supports-[backdrop-filter]:backdrop-blur focus:border-brand-400 focus:ring-2 focus:ring-sky-100 dark:border-brand-200/20 dark:bg-brand-50/70 dark:text-brand-900 dark:placeholder:text-brand-600 dark:focus:border-brand-500 dark:focus:ring-brand-200/20"
            />
          </div>

          <Button
            onClick={handleGenerateRecommendations}
            disabled={!canEdit || isLoading}
            className="mt-3 w-full justify-center"
          >
            {isLoading ? <ActiveModeIcon size={16} /> : <Sparkles size={16} />}
            {isLoading ? '整理路線中...' : '幫我排'}
          </Button>

          {!canEdit && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
              目前是唯讀權限，不能產生或套用推薦。
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
              <div className="rounded-lg border border-dashed border-[#e0e9e0] p-4 text-sm font-semibold text-stone-500 dark:border-brand-200/20 dark:text-brand-700">
                還沒有小提案。按「幫我排」開始整理。
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );

  return portalTarget ? createPortal(companionPanel, portalTarget) : companionPanel;
};

export default TripAiRecommendationPanel;
