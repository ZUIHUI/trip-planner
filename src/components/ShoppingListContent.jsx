import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  Upload,
  X,
  ZoomIn
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateShoppingCategories, updateShoppingList } from '../services/tripService';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Select, Textarea } from './ui';

const DEFAULT_CATEGORIES = ['未分類', '藥妝', '服飾', '伴手禮', '電器', '零食', '其他'];

const INITIAL_FORM_DATA = {
  name: '',
  category: '未分類',
  shop: '',
  quantity: 1,
  notes: '',
  image: null
};

const getProgress = (totalItems, purchasedItems) => (
  totalItems ? Math.round((purchasedItems / totalItems) * 100) : 0
);

const renderToBody = (node) => {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
};

const ShoppingSummary = ({ totalItems, purchasedItems }) => {
  const progress = getProgress(totalItems, purchasedItems);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="tp-icon-chip bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="tp-section-title">購物清單</h2>
            <p className="tp-section-subtitle">整理想買商品、店家、圖片與備註。</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">總計</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{totalItems}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">已買</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{purchasedItems}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">進度</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{progress}%</p>
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Card>
  );
};

const ShoppingControls = ({
  categories,
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
  onManageCategories
}) => (
  <Card className="p-4">
    <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]">
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
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
          aria-label="購物分類篩選"
        >
          <option value="All">顯示所有分類</option>
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
  </Card>
);

const ManageCategoriesModal = ({
  categories,
  newCategoryName,
  setNewCategoryName,
  onAddCategory,
  onDeleteCategory,
  onClose
}) => renderToBody(
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="管理分類">
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">管理分類</h3>
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
          type="text"
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddCategory();
            }
          }}
          placeholder="新分類名稱"
          aria-label="新分類名稱"
        />
        <Button onClick={onAddCategory} disabled={!newCategoryName.trim()}>
          <Plus size={16} />
          新增
        </Button>
      </div>

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{category}</span>
            {!DEFAULT_CATEGORIES.includes(category) && (
              <button
                type="button"
                onClick={() => onDeleteCategory(category)}
                className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
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
    className="fixed inset-0 z-[130] flex cursor-pointer items-center justify-center bg-black/90 p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="圖片預覽"
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
  imagePreview,
  setFormData,
  setImagePreview,
  onImageChange,
  onSave,
  onClose
}) => renderToBody(
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={editingId ? '編輯購物項目' : '新增購物項目'}>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:max-w-md sm:rounded-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? '編輯購物項目' : '新增購物項目'}</h3>
        <button
          type="button"
          onClick={onClose}
          className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="關閉購物項目表單"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <Field label="商品名稱" htmlFor="shopping-item-name">
          <Input
            id="shopping-item-name"
            type="text"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="例如：EVE 止痛藥"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
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
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(event) => setFormData({ ...formData, quantity: parseInt(event.target.value, 10) || 1 })}
            />
          </Field>
        </div>

        <Field label="店家 / 地點" htmlFor="shopping-item-shop">
          <Input
            id="shopping-item-shop"
            type="text"
            value={formData.shop}
            onChange={(event) => setFormData({ ...formData, shop: event.target.value })}
            placeholder="例如：松本清、Donki"
          />
        </Field>

        <Field label="備註 / 連結" htmlFor="shopping-item-notes">
          <Textarea
            id="shopping-item-notes"
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
            placeholder="規格、型號、價格、購買連結..."
            rows="3"
          />
        </Field>

        <Field label="圖片">
          <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-700">
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
                <span className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">點擊上傳圖片</span>
              </>
            )}
          </label>
        </Field>

        <Button type="submit" className="w-full">
          {editingId ? '儲存變更' : '確認新增'}
        </Button>
      </div>
    </form>
  </div>
);

const ShoppingItemCard = ({
  item,
  draggedItemId,
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
}) => (
  <Card
    as="article"
    interactive
    className={`p-4 ${item.purchased ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/70 dark:bg-emerald-950/20' : ''} ${
      draggedItemId === item.id ? 'opacity-50' : ''
    }`}
    draggable
    data-item-id={item.id}
    onDragStart={(event) => onDragStart(event, item.id)}
    onDragOver={onDragOver}
    onDrop={(event) => onDrop(event, item.id)}
  >
    <div className="flex gap-3">
      <div
        className="touch-none flex shrink-0 cursor-grab items-start pt-1 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
        onTouchStart={(event) => onTouchStart(event, item.id)}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <GripVertical size={20} />
      </div>

      <input
        type="checkbox"
        checked={item.purchased}
        onChange={() => onTogglePurchased(item.id)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
        aria-label={`標記 ${item.name} 是否已購買`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`break-words text-lg font-bold leading-tight ${
              item.purchased ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'
            }`}>
              {item.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="muted">{item.category || '未分類'}</Badge>
              {item.shop && <Badge variant="info">{item.shop}</Badge>}
              <Badge variant="warning">x{item.quantity || 1}</Badge>
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
              title={`編輯 ${item.name}`}
              aria-label={`編輯 ${item.name}`}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              title={`刪除 ${item.name}`}
              aria-label={`刪除 ${item.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {(item.notes || item.image) && (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
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
              <button type="button" onClick={() => onZoomImage(item.image)} className="group relative inline-block text-left">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-32 w-auto rounded-lg border border-slate-200 object-cover shadow-sm transition-opacity group-hover:opacity-90 dark:border-slate-700"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="text-white drop-shadow-md" size={24} />
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  </Card>
);

const ShoppingListContent = forwardRef(({ tripId, onModalOpenChange }, ref) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);

  useEffect(() => {
    const hasModalOpen = showAddForm || isManageCategoriesOpen || Boolean(zoomedImage);
    onModalOpenChange?.(hasModalOpen);

    return () => {
      onModalOpenChange?.(false);
    };
  }, [showAddForm, isManageCategoriesOpen, zoomedImage, onModalOpenChange]);

  useImperativeHandle(ref, () => ({
    openAddForm: () => {
      setEditingId(null);
      setFormData(INITIAL_FORM_DATA);
      setImagePreview(null);
      setShowAddForm(true);
    }
  }), []);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.shoppingList) {
          setItems(data.shoppingList);
        }
        if (data.shoppingCategories && Array.isArray(data.shoppingCategories)) {
          setCategories(data.shoppingCategories);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching shopping list:', err);
      setError('無法載入購物清單');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  const safeItems = Array.isArray(items) ? items : [];
  const filteredItems = useMemo(() => safeItems.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = !query ||
      String(item.name || '').toLowerCase().includes(query) ||
      String(item.shop || '').toLowerCase().includes(query) ||
      String(item.notes || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  }), [safeItems, filterCategory, searchQuery]);

  const purchasedItems = safeItems.filter((item) => item.purchased).length;

  const updateItems = (newItems) => {
    setItems(newItems);
    if (tripId) {
      updateShoppingList(tripId, newItems).catch((err) => {
        console.error('Failed to save shopping list:', err);
      });
    }
  };

  const updateCategories = (newCategories) => {
    setCategories(newCategories);
    if (tripId) {
      Promise.resolve(updateShoppingCategories(tripId, newCategories)).catch((err) => {
        console.error('Failed to save shopping categories:', err);
      });
    }
  };

  const handleAddCategory = () => {
    const nextCategory = newCategoryName.trim();
    if (!nextCategory || categories.includes(nextCategory)) return;
    updateCategories([...categories, nextCategory]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (!window.confirm(`確定要刪除分類「${categoryToDelete}」嗎？`)) return;
    updateCategories(categories.filter((category) => category !== categoryToDelete));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setFormData((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setImagePreview(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSaveItem = () => {
    const name = formData.name.trim();
    if (!name) {
      alert('請輸入商品名稱');
      return;
    }

    if (editingId) {
      updateItems(safeItems.map((item) => (
        item.id === editingId ? { ...item, ...formData, name } : item
      )));
    } else {
      updateItems([
        {
          id: Date.now(),
          ...formData,
          name,
          purchased: false,
          createdAt: new Date().toISOString()
        },
        ...safeItems
      ]);
    }
    resetForm();
  };

  const handleEditItem = (item) => {
    setFormData({
      name: item.name || '',
      category: item.category || '未分類',
      shop: item.shop || '',
      quantity: item.quantity || 1,
      notes: item.notes || '',
      image: item.image || null
    });
    setImagePreview(item.image || null);
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const deleteItem = (id) => {
    const target = safeItems.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`確定要刪除「${target.name}」嗎？`)) return;
    updateItems(safeItems.filter((item) => item.id !== id));
  };

  const togglePurchased = (id) => {
    updateItems(safeItems.map((item) => (
      item.id === id ? { ...item, purchased: !item.purchased } : item
    )));
  };

  const handleDragStart = (event, id) => {
    setDraggedItemId(id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const reorderItems = (targetId) => {
    if (!draggedItemId || draggedItemId === targetId) return;
    const sourceIndex = safeItems.findIndex((item) => item.id === draggedItemId);
    const targetIndex = safeItems.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextItems = [...safeItems];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    updateItems(nextItems);
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    reorderItems(targetId);
    setDraggedItemId(null);
  };

  const handleTouchStart = (event, id) => {
    setDraggedItemId(id);
  };

  const handleTouchMove = (event) => {
    if (!draggedItemId) return;
    if (event.cancelable && event.target.closest('.touch-none')) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = target?.closest?.('[data-item-id]');
    if (!targetRow) return;
    const targetId = parseInt(targetRow.getAttribute('data-item-id'), 10);
    if (targetId) reorderItems(targetId);
  };

  const handleTouchEnd = () => {
    setDraggedItemId(null);
  };

  if (loading) {
    return <LoadingState label="載入購物清單中..." className="mx-4 my-8 sm:mx-6 lg:mx-8" />;
  }

  if (error) {
    return <ErrorState title="購物清單載入失敗" description={error} className="mx-4 my-8 sm:mx-6 lg:mx-8" />;
  }

  return (
    <div className="w-full space-y-4 overflow-x-hidden px-4 py-4 pb-24 sm:px-6 lg:px-8">
      <ShoppingSummary totalItems={safeItems.length} purchasedItems={purchasedItems} />

      <ShoppingControls
        categories={categories}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onManageCategories={() => setIsManageCategoriesOpen(true)}
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={safeItems.length ? '沒有找到符合條件的商品' : '尚無購物項目'}
          description={safeItems.length ? '調整搜尋關鍵字或分類篩選。' : '點擊底部新增按鈕，加入第一個想買的商品。'}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              draggedItemId={draggedItemId}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTogglePurchased={togglePurchased}
              onEdit={handleEditItem}
              onDelete={deleteItem}
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
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setIsManageCategoriesOpen(false)}
        />
      )}

      {zoomedImage && <ImageZoomModal image={zoomedImage} onClose={() => setZoomedImage(null)} />}

      {showAddForm && (
        <ShoppingItemFormModal
          categories={categories}
          editingId={editingId}
          formData={formData}
          imagePreview={imagePreview}
          setFormData={setFormData}
          setImagePreview={setImagePreview}
          onImageChange={handleImageChange}
          onSave={handleSaveItem}
          onClose={resetForm}
        />
      )}
    </div>
  );
});

ShoppingListContent.displayName = 'ShoppingListContent';

export default ShoppingListContent;
