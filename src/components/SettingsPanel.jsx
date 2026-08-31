import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Heart,
  Image as ImageIcon,
  MapPin,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  Users,
  X
} from 'lucide-react';
import { MAX_COVER_IMAGE_FILE_SIZE_BYTES, normalizeCoverImageUrl } from '../utils/coverImage';
import { Button, Field, Input, Select } from './ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { moneyInputProps, plainTextInputProps } from '../utils/mobileInputProps';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

const fileSizeLabel = `${Math.round(MAX_COVER_IMAGE_FILE_SIZE_BYTES / 1024)}KB`;

const themeOptions = [
  {
    id: 'light',
    name: '海洋白',
    description: '清爽的 Ocean Pearl',
    icon: Sun
  },
  {
    id: 'soft-pink',
    name: '柔和粉',
    description: '糖果粉與櫻花重點色',
    icon: Heart
  },
  {
    id: 'sunny-yellow',
    name: '晴光黃',
    description: '暖白與高亮黃色',
    icon: Sparkles
  },
  {
    id: 'dark',
    name: '深海夜',
    description: '夜間低亮度介面',
    icon: Moon
  }
];

const Section = ({ icon: Icon, title, children }) => (
  <section className="tp-mobile-settings-section rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-start gap-3">
      <div className="tp-icon-chip">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="tp-section-title">{title}</h3>
      </div>
    </div>
    {children}
  </section>
);

const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
      checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
    }`}
    role="switch"
    aria-checked={checked}
    aria-label={label}
  >
    <span
      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
);

const SettingsPanel = ({
  isOpen,
  onClose,
  enableGPS,
  onGPSToggle,
  travelers = [],
  travelersReadOnly = false,
  onUpdateTravelers,
  currentTheme,
  onThemeChange,
  interfaceSize,
  onInterfaceSizeChange,
  exchangeRate,
  onExchangeRateChange,
  onUpdateRate,
  lastUpdateDate,
  isRateUpdating = false,
  rateUpdateError = '',
  coverImage,
  onCoverImageChange
}) => {
  const { confirm, toast } = useFeedback();
  const [newTravelerName, setNewTravelerName] = useState('');
  const [coverImageError, setCoverImageError] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const coverFileInputRef = useRef(null);
  const coverImagePreviewUrl = normalizeCoverImageUrl(coverImage);

  if (!isOpen) return null;

  const handleAddTraveler = () => {
    if (travelersReadOnly) return;
    const name = newTravelerName.trim();
    if (!name) return;
    onUpdateTravelers([
      ...travelers,
      {
        id: Date.now().toString(),
        name
      }
    ]);
    setNewTravelerName('');
  };

  const handleDeleteTraveler = async (id) => {
    if (travelersReadOnly) return;
    const target = travelers.find((traveler) => traveler.id === id);
    if (!target) return;
    const shouldDelete = await confirm({
      title: '刪除旅伴？',
      description: `「${target.name}」會從旅伴清單移除。`,
      confirmLabel: '刪除旅伴',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    const previousTravelers = travelers;
    onUpdateTravelers(travelers.filter((traveler) => traveler.id !== id));
    toast({
      variant: 'info',
      title: '已刪除旅伴',
      description: target.name,
      actionLabel: '復原',
      duration: 7000,
      onAction: () => onUpdateTravelers(previousTravelers)
    });
  };

  const handleCoverImageFileChange = (event) => {
    const file = event.target.files?.[0];
    setCoverImageError('');

    if (!file) return;

    if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      setCoverImageError('僅支援 JPG、PNG、WEBP、GIF、AVIF 圖片格式。');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_COVER_IMAGE_FILE_SIZE_BYTES) {
      setCoverImageError(`圖片大小不可超過 ${fileSizeLabel}，避免雲端儲存失敗。請壓縮後再上傳。`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onCoverImageChange(reader.result);
      setCoverImagePreview(reader.result);
      setCoverImageError('');
    };
    reader.onerror = () => {
      setCoverImageError('讀取圖片失敗，請重試。');
    };
    reader.readAsDataURL(file);
  };

  const clearCoverImage = () => {
    setCoverImagePreview('');
    onCoverImageChange('');
    setCoverImageError('');
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  return (
    <div className="tp-mobile-settings-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="設定">
      <div className="tp-mobile-settings-sheet max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-slate-50 shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg dark:border-slate-800 dark:bg-slate-950">
        <div className="tp-mobile-settings-header sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="tp-mobile-settings-eyebrow">Trip controls</p>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="關閉設定"
          >
            <X size={22} />
          </button>
        </div>

        <div className="tp-mobile-settings-body space-y-4 p-4">
          <Section
            icon={Palette}
            title="外觀主題"
          >
            <div className="tp-theme-choice-grid" aria-label="選擇外觀主題">
              {themeOptions.map((theme) => {
                const ThemeIcon = theme.icon;
                const isSelected = currentTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    className="tp-theme-choice"
                    data-theme-option={theme.id}
                    aria-pressed={isSelected}
                    onClick={() => onThemeChange(theme.id)}
                  >
                    <span className="tp-theme-choice-swatch" aria-hidden="true">
                      <ThemeIcon size={19} />
                    </span>
                    <span className="tp-theme-choice-copy">
                      <strong>{theme.name}</strong>
                      <small>{theme.description}</small>
                    </span>
                    {isSelected && <Check className="tp-theme-choice-check" size={17} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={Type}
            title="介面大小"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { id: 'small', name: '精簡', sizeClass: 'text-sm' },
                { id: 'medium', name: '標準', sizeClass: 'text-base' },
                { id: 'large', name: '寬鬆', sizeClass: 'text-lg' }
              ].map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onInterfaceSizeChange(size.id)}
                  className={`relative rounded-lg border p-3 text-left transition ${
                    interfaceSize === size.id
                      ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-800'
                  }`}
                >
                  <span className={`block font-black text-slate-900 dark:text-white ${size.sizeClass}`}>A</span>
                  <span className="mt-2 block text-sm font-bold">{size.name}</span>
                  {interfaceSize === size.id && <Check size={16} className="absolute right-3 top-3 text-brand-600 dark:text-brand-300" />}
                </button>
              ))}
            </div>
          </Section>

          <Section
            icon={RefreshCw}
            title="匯率設定"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="1 日圓等於多少台幣" htmlFor="exchange-rate">
                <div className="flex items-center gap-2">
                  <Input
                    id="exchange-rate"
                    {...moneyInputProps}
                    step="0.001"
                    value={exchangeRate || ''}
                    onChange={(event) => onExchangeRateChange(parseFloat(event.target.value) || 0)}
                  />
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">TWD</span>
                </div>
              </Field>
              <Button variant="secondary" onClick={onUpdateRate} disabled={isRateUpdating}>
                <RefreshCw size={16} className={isRateUpdating ? 'animate-spin' : ''} />
                {isRateUpdating ? '更新中' : '更新匯率'}
              </Button>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdateDate ? `最近更新：${lastUpdateDate}` : '尚未更新匯率'}
            </div>
            {rateUpdateError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {rateUpdateError}
              </p>
            )}
          </Section>

          <Section
            icon={ImageIcon}
            title="背景圖片"
          >
            <div className="space-y-3">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageFileChange}
                className="hidden"
                id="coverImageInput"
              />
              <label
                htmlFor="coverImageInput"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-700"
              >
                <Upload size={24} className="text-slate-400" />
                <span className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">上傳背景圖片</span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG / PNG / WEBP / GIF / AVIF，最多 {fileSizeLabel}</span>
              </label>

              {coverImageError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {coverImageError}
                </p>
              )}

              {(coverImagePreview || coverImage) ? (
                <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <img
                    src={coverImagePreview || coverImagePreviewUrl}
                    alt="背景圖片預覽"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={clearCoverImage}
                    className="absolute right-3 top-3 bg-white/90"
                  >
                    <X size={14} />
                    移除
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">尚未設定背景圖片。</p>
              )}
            </div>
          </Section>

          <Section
            icon={Users}
            title="旅伴"
          >
            <div className="space-y-2">
              {travelers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                  尚未加入旅伴
                </div>
              ) : (
                travelers.map((traveler) => (
                  <div key={traveler.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/70">
                    <span className="min-w-0 flex-1 break-words font-semibold text-slate-800 dark:text-slate-100">{traveler.name}</span>
                    {!travelersReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTraveler(traveler.id)}
                      className="touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      title={`刪除 ${traveler.name}`}
                      aria-label={`刪除 ${traveler.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {!travelersReadOnly && (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                {...plainTextInputProps}
                value={newTravelerName}
                onChange={(event) => setNewTravelerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddTraveler();
                  }
                }}
                placeholder="輸入旅伴姓名"
                aria-label="輸入旅伴姓名"
                enterKeyHint="done"
              />
              <Button onClick={handleAddTraveler} disabled={!newTravelerName.trim()}>
                <Plus size={16} />
                新增
              </Button>
            </div>
            )}
          </Section>

          <Section
            icon={MapPin}
            title="位置設定"
          >
            <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">GPS 定位</p>
              </div>
              <ToggleSwitch checked={enableGPS} onChange={onGPSToggle} label="切換 GPS 定位" />
            </div>
          </Section>

          <div className="tp-settings-legal">
            <Link to="/privacy">
              <ShieldCheck size={15} aria-hidden="true" />
              隱私權政策
            </Link>
            <p>資料儲存、共享權限與責任歸屬</p>
            <span>Trip Planner v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
