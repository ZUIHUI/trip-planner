import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Filter,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Select,
  Textarea
} from './ui';
import { integerInputProps, plainTextInputProps, searchInputProps } from '../utils/mobileInputProps';
import { validateImageFile, validatePositiveInteger, validateRequiredText } from '../utils/validation';

const DEFAULT_CATEGORIES = ['藥妝', '伴手禮', '零食', '票券', '衣物', '3C 配件', '其他'];

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'todo', label: '未購買' },
  { id: 'done', label: '已購買' }
];

const COMMON_SUGGESTIONS = ['藥妝', '伴手禮', '零食', '票券', '衣物', '3C 配件'];

const SUGGESTIONS_BY_CATEGORY = {
  藥妝: ['眼藥水', '感冒藥', '防曬乳', '面膜', '痠痛貼布'],
  伴手禮: ['餅乾禮盒', '抹茶點心', '限定吊飾', '明信片', '地方名產'],
  零食: ['巧克力', '洋芋片', '泡麵', '糖果', '飲料'],
  票券: ['交通票券', '景點門票', '展覽票', '餐券', '優惠券'],
  衣物: ['外套', '帽子', '襪子', '圍巾', '雨衣'],
  '3C 配件': ['充電線', '行動電源', '記憶卡', '轉接頭', '保護貼'],
  其他: ['雨傘', '環保袋', '收納袋', '濕紙巾', '小工具']
};

const DEFAULT_FORM_DATA = {
  name: '',
  category: DEFAULT_CATEGORIES[0],
  shop: '',
  quantity: 1,
  notes: '',
  image: null
};

const getId = (value) => String(value ?? '');

const getDefaultCategory = (categories = []) => (
  categories[0] || DEFAULT_CATEGORIES[0]
);

const buildFormData = (categories = [], defaults = {}) => {
  const fallbackCategory = getDefaultCategory(categories);
  const category = defaults.category || fallbackCategory;
  const quantity = Number(defaults.quantity || DEFAULT_FORM_DATA.quantity);

  return {
    ...DEFAULT_FORM_DATA,
    category,
    ...defaults,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    image: defaults.image ?? null
  };
};

export const normalizeShoppingItems = (items = []) => (
  Array.isArray(items) ? items : []
);

export const normalizeShoppingCategories = (categories = []) => {
  const safeCategories = Array.isArray(categories)
    ? categories.map((category) => String(category || '').trim()).filter(Boolean)
    : [];
  return safeCategories.length ? Array.from(new Set(safeCategories)) : DEFAULT_CATEGORIES;
};

const renderToBody = (node) => {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
};

export const getShoppingStats = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];
  const total = safeItems.length;
  const purchased = safeItems.filter((item) => item.purchased).length;
  const remaining = Math.max(total - purchased, 0);

  return {
    total,
    purchased,
    remaining,
    progress: total ? Math.round((purchased / total) * 100) : 0
  };
};

export const getVisibleShoppingItems = (
  items = [],
  { statusFilter = 'all', filterCategory = 'All', searchQuery = '' } = {}
) => {
  const query = searchQuery.trim().toLowerCase();

  return (Array.isArray(items) ? items : []).filter((item) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'todo' && !item.purchased) ||
      (statusFilter === 'done' && Boolean(item.purchased));
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch =
      !query ||
      String(item.name || '').toLowerCase().includes(query) ||
      String(item.shop || '').toLowerCase().includes(query) ||
      String(item.category || '').toLowerCase().includes(query) ||
      String(item.notes || '').toLowerCase().includes(query);

    return matchesStatus && matchesCategory && matchesSearch;
  });
};

export const getShoppingSuggestions = (filterCategory = 'All') => (
  SUGGESTIONS_BY_CATEGORY[filterCategory] || COMMON_SUGGESTIONS
);

const ShoppingSummary = ({ stats, sortMode, onToggleSort }) => (
  <Card className="p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="tp-icon-chip bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
          <ShoppingCart size={20} />
        </div>
        <div>
          <h2 className="tp-section-title">購物清單</h2>
          <p className="tp-section-subtitle">待買與已買。</p>
        </div>
      </div>
      <Button
        variant={sortMode ? 'primary' : 'secondary'}
        size="sm"
        onClick={onToggleSort}
        aria-pressed={sortMode}
        className="w-full sm:w-auto"
      >
        <GripVertical size={16} />
        {sortMode ? '完成排序' : '排序'}
      </Button>
    </div>

    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
      <div className="rounded-lg bg-slate-50 px-2 py-3 dark:bg-slate-800/70">
        <p className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">全部</p>
      </div>
      <div className="rounded-lg bg-emerald-50 px-2 py-3 dark:bg-emerald-950/30">
        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.purchased}</p>
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">已購買</p>
      </div>
      <div className="rounded-lg bg-amber-50 px-2 py-3 dark:bg-amber-950/30">
        <p className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.remaining}</p>
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">未購買</p>
      </div>
      <div className="rounded-lg bg-orange-50 px-2 py-3 dark:bg-orange-950/30">
        <p className="text-lg font-black text-orange-700 dark:text-orange-300">{stats.progress}%</p>
        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">完成率</p>
      </div>
    </div>

    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-orange-500 transition-all duration-500"
        style={{ width: `${stats.progress}%` }}
      />
    </div>
  </Card>
);

const ShoppingControls = ({
  categories,
  filterCategory,
  setFilterCategory,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onManageCategories,
  onClearFilters
}) => {
  const hasActiveFilters = Boolean(searchQuery.trim()) || filterCategory !== 'All' || statusFilter !== 'all';

  return (
    <Card className="p-3 sm:p-4">
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              {...searchInputProps}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜尋商品、店家或備註"
              className="pl-9 pr-10"
              aria-label="搜尋購物清單"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="touch-target absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="清除搜尋"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative">
            <Filter size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="pl-9"
              aria-label="依分類篩選購物清單"
            >
              <option value="All">全部分類</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </div>

          <Button variant="secondary" onClick={onManageCategories}>
            <Settings size={17} />
            管理分類
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="購物狀態篩選">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={isActive}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-bold transition ${
                  isActive
                    ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="min-h-[40px] rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              清除篩選
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

const ConfirmDialog = ({ target, onCancel, onConfirm }) => {
  if (!target) return null;

  return renderToBody(
    <div
      className="tp-fade-in fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopping-confirm-title"
    >
      <div className="tp-slide-up w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 id="shopping-confirm-title" className="text-lg font-black text-slate-900 dark:text-white">
          {target.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {target.description}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>取消</Button>
          <Button variant="danger" onClick={onConfirm}>{target.confirmLabel || '刪除'}</Button>
        </div>
      </div>
    </div>
  );
};

const ManageCategoriesModal = ({
  categories,
  newCategoryName,
  setNewCategoryName,
  onAddCategory,
  onDeleteCategory,
  onClose
}) => renderToBody(
  <div
    className="tp-fade-in fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-label="管理分類"
  >
    <div className="tp-slide-up max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:max-w-sm sm:rounded-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">管理分類</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">保留常用分類，讓手機篩選更快。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="關閉分類管理"
        >
          <X size={20} />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          {...plainTextInputProps}
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddCategory();
            }
          }}
          placeholder="新增分類名稱"
          aria-label="新增分類名稱"
          enterKeyHint="done"
        />
        <Button onClick={onAddCategory} disabled={!newCategoryName.trim()}>
          <Plus size={16} />
          新增
        </Button>
      </div>

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <span className="min-w-0 break-words font-semibold text-slate-700 dark:text-slate-200">{category}</span>
            {!DEFAULT_CATEGORIES.includes(category) && (
              <button
                type="button"
                onClick={() => onDeleteCategory(category)}
                className="touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                title={`刪除分類 ${category}`}
                aria-label={`刪除分類 ${category}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ImageZoomModal = ({ image, onClose }) => renderToBody(
  <div
    className="tp-fade-in fixed inset-0 z-[130] flex cursor-pointer items-center justify-center bg-black/90 p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="商品圖片預覽"
  >
    <div className="relative max-h-[90vh] max-w-4xl">
      <img src={image} alt="商品圖片預覽" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
      <button
        type="button"
        onClick={onClose}
        className="touch-target absolute -right-3 -top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg hover:bg-slate-100"
        aria-label="關閉圖片預覽"
      >
        <X size={22} />
      </button>
    </div>
  </div>
);

const ShoppingItemFormModal = ({
  categories,
  editingId,
  formData,
  formError,
  imagePreview,
  suggestions,
  setFormData,
  setFormError,
  setImagePreview,
  onImageChange,
  onSave,
  onClose
}) => renderToBody(
  <div
    className="tp-fade-in fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-label={editingId ? '編輯購物項目' : '新增購物項目'}
  >
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="tp-slide-up max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:max-w-md sm:rounded-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {editingId ? '編輯購物項目' : '新增購物項目'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            名稱必填，其餘資訊可依需要補上。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="關閉購物項目表單"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
          <Field label="商品名稱" htmlFor="shopping-item-name">
            <Input
              id="shopping-item-name"
              {...plainTextInputProps}
              value={formData.name}
              onChange={(event) => {
                setFormData({ ...formData, name: event.target.value });
                if (formError) setFormError('');
              }}
              placeholder="例如：限定餅乾、藥妝、交通票券"
              enterKeyHint="next"
              autoFocus
              aria-invalid={Boolean(formError)}
            />
            {formError && (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">
                {formError}
              </p>
            )}
          </Field>

          {!editingId && suggestions.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Sparkles size={14} />
                常用項目
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, name: suggestion });
                      setFormError('');
                    }}
                    className="min-h-[36px] rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-900/70 dark:hover:bg-orange-950/30"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="分類" htmlFor="shopping-item-category">
              <Select
                id="shopping-item-category"
                value={formData.category}
                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Field label="數量" htmlFor="shopping-item-quantity">
              <Input
                id="shopping-item-quantity"
                {...integerInputProps}
                min="1"
                value={formData.quantity}
                onChange={(event) => setFormData({ ...formData, quantity: parseInt(event.target.value, 10) || 1 })}
              />
            </Field>
          </div>

          <Field label="店家 / 地點" htmlFor="shopping-item-shop" className="mt-3">
            <Input
              id="shopping-item-shop"
              {...plainTextInputProps}
              value={formData.shop}
              onChange={(event) => setFormData({ ...formData, shop: event.target.value })}
              placeholder="例如：藥妝店、機場、百貨公司"
              enterKeyHint="next"
            />
          </Field>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <Field label="備註 / 連結" htmlFor="shopping-item-notes">
            <Textarea
              id="shopping-item-notes"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="規格、顏色、網址、價格線索..."
              rows="3"
              enterKeyHint="done"
            />
          </Field>

          <Field label="圖片" className="mt-3">
            <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-orange-300 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-orange-900/70">
              <input type="file" accept="image/*" onChange={onImageChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              {imagePreview ? (
                <span className="relative inline-block">
                  <img src={imagePreview} alt="商品圖片預覽" className="mx-auto max-h-32 rounded-lg" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setImagePreview(null);
                      setFormData({ ...formData, image: null });
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow-sm"
                    aria-label="移除商品圖片"
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <>
                  <Upload size={24} className="text-slate-400" />
                  <span className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">上傳商品照片</span>
                </>
              )}
            </label>
          </Field>
        </section>

        <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 dark:border-slate-800 dark:bg-slate-900/95 sm:dark:bg-transparent">
          <Button type="submit" className="w-full">
            {editingId ? '儲存修改' : '加入購物清單'}
          </Button>
        </div>
      </div>
    </form>
  </div>
);

const ShoppingItemCard = ({
  item,
  draggedItemId,
  sortMode,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTogglePurchased,
  onEdit,
  onDelete,
  onZoomImage
}) => {
  const isDragging = draggedItemId === getId(item.id);
  const purchased = Boolean(item.purchased);
  const statusLabel = purchased ? '已購買' : '未購買';

  return (
    <Card
      as="article"
      interactive
      className={`tp-animate-enter tp-motion-panel overflow-hidden p-0 ${
        purchased ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/70 dark:bg-emerald-950/20' : ''
      } ${isDragging ? 'opacity-60 ring-2 ring-orange-200 dark:ring-orange-900/70' : ''}`}
      draggable
      data-item-id={getId(item.id)}
      onDragStart={(event) => onDragStart(event, item.id)}
      onDragOver={onDragOver}
      onDrop={(event) => onDrop(event, item.id)}
    >
      <div className="flex gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          type="button"
          aria-label="拖曳排序"
          onTouchStart={(event) => onTouchStart(event, item.id)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`tp-press-feedback h-11 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400 ${
            sortMode ? 'flex' : 'hidden sm:flex'
          }`}
        >
          <GripVertical size={18} />
        </button>

        <input
          type="checkbox"
          checked={purchased}
          onChange={() => onTogglePurchased(item.id)}
          className="tp-press-feedback mt-2 h-5 w-5 shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-500 checked:scale-110 dark:border-slate-700 dark:bg-slate-900"
          aria-label={`標記 ${item.name} 為${purchased ? '未購買' : '已購買'}`}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => onTogglePurchased(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onTogglePurchased(item.id);
            }
          }}
          className="tp-press-feedback min-w-0 flex-1 rounded-lg px-1 py-1 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
          aria-label={`切換 ${item.name} 購買狀態`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            {purchased ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {statusLabel}
          </div>
          <h3 className={`mt-1 break-words text-base font-black leading-tight transition-all duration-200 sm:text-lg ${
            purchased ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'
          }`}>
            {item.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="muted">{item.category || '未分類'}</Badge>
            {item.shop && <Badge variant="info">{item.shop}</Badge>}
            <Badge variant="warning">x{item.quantity || 1}</Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          {item.image && (
            <button
              type="button"
              onClick={() => onZoomImage(item.image)}
              className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
              title={`查看 ${item.name} 圖片`}
              aria-label={`查看 ${item.name} 圖片`}
            >
              <ImageIcon size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
            title={`編輯 ${item.name}`}
            aria-label={`編輯 ${item.name}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            title={`刪除 ${item.name}`}
            aria-label={`刪除 ${item.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {(item.notes || item.image) && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
          {item.notes && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              {item.notes.includes('http') ? (
                <a
                  href={item.notes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 break-all font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  <ExternalLink size={14} className="shrink-0" />
                  {item.notes}
                </a>
              ) : item.notes}
            </div>
          )}

          {item.image && (
            <button
              type="button"
              onClick={() => onZoomImage(item.image)}
              className="group relative inline-block text-left"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-28 w-auto rounded-lg border border-slate-200 object-cover shadow-sm transition-opacity group-hover:opacity-90 dark:border-slate-700"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="text-white drop-shadow-md" size={22} />
              </span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

const ShoppingListContent = forwardRef(({
  shoppingList = [],
  shoppingCategories = [],
  onShoppingListChange,
  onShoppingCategoriesChange,
  onModalOpenChange,
  readOnly = false
}, ref) => {
  const [items, setItems] = useState(() => normalizeShoppingItems(shoppingList));
  const loading = false;
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [categories, setCategories] = useState(() => normalizeShoppingCategories(shoppingCategories));
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState(() => buildFormData(DEFAULT_CATEGORIES));
  const [formError, setFormError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const safeItems = Array.isArray(items) ? items : [];
  const stats = useMemo(() => getShoppingStats(safeItems), [safeItems]);
  const filteredItems = useMemo(
    () => getVisibleShoppingItems(safeItems, { statusFilter, filterCategory, searchQuery }),
    [safeItems, statusFilter, filterCategory, searchQuery]
  );
  const suggestions = useMemo(() => {
    const existing = new Set(
      safeItems.map((item) => String(item.name || '').trim()).filter(Boolean)
    );
    return getShoppingSuggestions(formData.category || filterCategory).filter((item) => !existing.has(item));
  }, [safeItems, formData.category, filterCategory]);

  const openAddForm = useCallback((defaults = {}) => {
    if (readOnly) return;
    const nextFormData = buildFormData(categories, {
      category: filterCategory !== 'All' ? filterCategory : undefined,
      ...defaults
    });
    setEditingId(null);
    setFormError('');
    setFormData(nextFormData);
    setImagePreview(nextFormData.image || null);
    setShowAddForm(true);
  }, [categories, filterCategory, readOnly]);

  useEffect(() => {
    const hasModalOpen =
      showAddForm ||
      isManageCategoriesOpen ||
      Boolean(zoomedImage) ||
      Boolean(confirmTarget);
    onModalOpenChange?.(hasModalOpen);

    return () => {
      onModalOpenChange?.(false);
    };
  }, [showAddForm, isManageCategoriesOpen, zoomedImage, confirmTarget, onModalOpenChange]);

  useImperativeHandle(ref, () => ({
    openAddForm
  }), [openAddForm]);

  useEffect(() => {
    setItems(normalizeShoppingItems(shoppingList));
    setError(null);
  }, [shoppingList]);

  useEffect(() => {
    const nextCategories = normalizeShoppingCategories(shoppingCategories);
    setCategories(nextCategories);
    setFormData((prev) => (
      nextCategories.includes(prev.category)
        ? prev
        : { ...prev, category: getDefaultCategory(nextCategories) }
    ));
  }, [shoppingCategories]);

  const updateItems = (newItems) => {
    if (readOnly) return;
    setItems(newItems);
    onShoppingListChange?.(newItems);
  };

  const updateCategories = (newCategories) => {
    if (readOnly) return;
    setCategories(newCategories);
    onShoppingCategoriesChange?.(newCategories);
  };

  const handleAddCategory = () => {
    if (readOnly) return;
    const nextCategory = newCategoryName.trim();
    if (!nextCategory || categories.includes(nextCategory)) return;
    updateCategories([...categories, nextCategory]);
    setNewCategoryName('');
  };

  const requestDeleteCategory = (categoryToDelete) => {
    if (readOnly) return;
    setConfirmTarget({
      type: 'category',
      value: categoryToDelete,
      title: '刪除這個分類？',
      description: `「${categoryToDelete}」會從分類選單移除，既有商品資料不會被刪除。`,
      confirmLabel: '刪除'
    });
  };

  const handleImageChange = (event) => {
    if (readOnly) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const imageError = validateImageFile(file);
    if (imageError) {
      setFormError(imageError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setFormData((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(buildFormData(categories));
    setImagePreview(null);
    setEditingId(null);
    setFormError('');
    setShowAddForm(false);
  };

  const handleSaveItem = () => {
    if (readOnly) return false;
    const name = formData.name.trim();
    const nameError = validateRequiredText(name, '商品名稱', { maxLength: 120 });
    const quantityError = validatePositiveInteger(formData.quantity, '數量', { min: 1, max: 999 });
    if (nameError || quantityError) {
      setFormError(nameError || quantityError);
      return false;
    }

    const normalizedItem = {
      ...formData,
      name,
      category: formData.category || getDefaultCategory(categories),
      shop: formData.shop.trim(),
      quantity: Math.max(1, Number(formData.quantity) || 1),
      notes: formData.notes.trim(),
      image: formData.image || null
    };

    if (editingId) {
      updateItems(safeItems.map((item) => (
        getId(item.id) === getId(editingId) ? { ...item, ...normalizedItem } : item
      )));
      resetForm();
      return true;
    } else {
      updateItems([
        {
          id: Date.now(),
          ...normalizedItem,
          purchased: false,
          createdAt: new Date().toISOString()
        },
        ...safeItems
      ]);
    }
    setFormData(buildFormData(categories, { category: normalizedItem.category }));
    setImagePreview(null);
    setFormError('');
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.setTimeout(() => document.getElementById('shopping-item-name')?.focus(), 0);
    }
    return true;
  };

  const handleEditItem = (item) => {
    if (readOnly) return;
    const nextFormData = buildFormData(categories, {
      name: item.name || '',
      category: item.category || getDefaultCategory(categories),
      shop: item.shop || '',
      quantity: item.quantity || 1,
      notes: item.notes || '',
      image: item.image || null
    });

    setFormData(nextFormData);
    setImagePreview(item.image || null);
    setFormError('');
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const requestDeleteItem = (item) => {
    if (readOnly) return;
    setConfirmTarget({
      type: 'item',
      value: item.id,
      title: '刪除這個商品？',
      description: `「${item.name}」會從購物清單移除，這個動作無法復原。`,
      confirmLabel: '刪除'
    });
  };

  const handleConfirmDelete = () => {
    if (readOnly) return;
    if (!confirmTarget) return;

    if (confirmTarget.type === 'item') {
      updateItems(safeItems.filter((item) => getId(item.id) !== getId(confirmTarget.value)));
    }

    if (confirmTarget.type === 'category') {
      const nextCategories = categories.filter((category) => category !== confirmTarget.value);
      updateCategories(nextCategories);
      if (filterCategory === confirmTarget.value) {
        setFilterCategory('All');
      }
      if (formData.category === confirmTarget.value) {
        setFormData((prev) => ({
          ...prev,
          category: getDefaultCategory(nextCategories)
        }));
      }
    }

    setConfirmTarget(null);
  };

  const togglePurchased = (id) => {
    if (readOnly) return;
    updateItems(safeItems.map((item) => (
      getId(item.id) === getId(id) ? { ...item, purchased: !item.purchased } : item
    )));
  };

  const handleDragStart = (event, id) => {
    if (readOnly) return;
    setDraggedItemId(getId(id));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const reorderItems = (targetId) => {
    if (readOnly) return;
    if (!draggedItemId || getId(draggedItemId) === getId(targetId)) return;
    const sourceIndex = safeItems.findIndex((item) => getId(item.id) === getId(draggedItemId));
    const targetIndex = safeItems.findIndex((item) => getId(item.id) === getId(targetId));
    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextItems = [...safeItems];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    updateItems(nextItems);
  };

  const handleDrop = (event, targetId) => {
    if (readOnly) return;
    event.preventDefault();
    reorderItems(targetId);
    setDraggedItemId(null);
  };

  const handleTouchStart = (event, id) => {
    if (readOnly) return;
    if (!sortMode) return;
    setDraggedItemId(getId(id));
  };

  const handleTouchMove = (event) => {
    if (readOnly) return;
    if (!sortMode || !draggedItemId) return;
    if (event.cancelable) {
      event.preventDefault();
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = target?.closest?.('[data-item-id]');
    if (!targetRow) return;
    reorderItems(targetRow.getAttribute('data-item-id'));
  };

  const handleTouchEnd = () => {
    setDraggedItemId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setStatusFilter('all');
  };

  if (loading) {
    return <LoadingState label="載入購物清單中..." className="mx-4 my-8 sm:mx-6 lg:mx-8" />;
  }

  if (error) {
    return <ErrorState title="購物清單載入失敗" description={error} className="mx-4 my-8 sm:mx-6 lg:mx-8" />;
  }

  return (
    <div className="w-full space-y-4 overflow-x-hidden px-4 py-4 pb-24 sm:px-6 lg:px-8">
      <ShoppingSummary
        stats={stats}
        sortMode={sortMode}
        onToggleSort={() => setSortMode((value) => !value)}
      />

      <ShoppingControls
        categories={categories}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onManageCategories={() => setIsManageCategoriesOpen(true)}
        onClearFilters={clearFilters}
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={safeItems.length ? '沒有符合條件的商品' : '目前沒有購物項目'}
          description={safeItems.length ? '清除搜尋或切換篩選。' : '新增第一個商品。'}
          actionLabel={safeItems.length ? '清除篩選' : '新增第一個商品'}
          onAction={safeItems.length ? clearFilters : () => openAddForm()}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              draggedItemId={draggedItemId}
              sortMode={sortMode}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTogglePurchased={togglePurchased}
              onEdit={handleEditItem}
              onDelete={requestDeleteItem}
              onZoomImage={setZoomedImage}
            />
          ))}
        </div>
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          categories={categories}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          onAddCategory={handleAddCategory}
          onDeleteCategory={requestDeleteCategory}
          onClose={() => setIsManageCategoriesOpen(false)}
        />
      )}

      {zoomedImage && <ImageZoomModal image={zoomedImage} onClose={() => setZoomedImage(null)} />}

      {showAddForm && (
        <ShoppingItemFormModal
          categories={categories}
          editingId={editingId}
          formData={formData}
          formError={formError}
          imagePreview={imagePreview}
          suggestions={suggestions}
          setFormData={setFormData}
          setFormError={setFormError}
          setImagePreview={setImagePreview}
          onImageChange={handleImageChange}
          onSave={handleSaveItem}
          onClose={resetForm}
        />
      )}

      <ConfirmDialog
        target={confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});

ShoppingListContent.displayName = 'ShoppingListContent';

export default ShoppingListContent;
