import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, ChevronDown, ChevronUp, Upload, ExternalLink } from 'lucide-react';
import { useFeedback } from '../contexts/FeedbackContext';
import { logger } from '../utils/logger';

/**
 * 購物清單組件
 * 功能: 記錄店家、商品、支援圖片上傳、備註可放連結
 */
const ShoppingList = ({ isOpen, onClose }) => {
  const { confirm, toast } = useFeedback();
  const [lists, setLists] = useState([]);
  const [newList, setNewList] = useState('');
  const [expandedList, setExpandedList] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 從 localStorage 載入購物清單
  useEffect(() => {
    const saved = localStorage.getItem('shoppingLists');
    if (saved) {
      try {
        setLists(JSON.parse(saved));
      } catch (err) {
        logger.error('載入購物清單失敗:', err);
      }
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
  }, [lists]);

  if (!isOpen) return null;

  // 新增清單
  const addList = () => {
    if (newList.trim()) {
      const list = {
        id: Date.now(),
        name: newList,
        items: [],
        createdAt: new Date().toISOString()
      };
      setLists([...lists, list]);
      setNewList('');
    }
  };

  // 刪除清單
  const deleteList = async (id) => {
    const target = lists.find((list) => list.id === id);
    if (!target) return;
    const shouldDelete = await confirm({
      title: '刪除購物清單？',
      description: `「${target.name}」會從本機購物清單移除。`,
      confirmLabel: '刪除清單',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    const previousLists = lists;
    setLists(lists.filter(l => l.id !== id));
    toast({
      variant: 'info',
      title: '已刪除購物清單',
      description: target.name,
      actionLabel: '復原',
      duration: 7000,
      onAction: () => setLists(previousLists)
    });
  };

  // 新增清單項目
  const addItem = (listId, item) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: [
            ...list.items,
            {
              id: Date.now(),
              shop: item.shop,
              product: item.product,
              quantity: item.quantity || 1,
              notes: item.notes,
              image: item.image,
              purchased: false
            }
          ]
        };
      }
      return list;
    }));
    setShowForm(false);
  };

  // 刪除清單項目
  const deleteItem = (listId, itemId) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.filter(i => i.id !== itemId)
        };
      }
      return list;
    }));
  };

  // 更新清單項目
  const updateItem = (listId, itemId, updatedItem) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(i => (i.id === itemId ? { ...i, ...updatedItem } : i))
        };
      }
      return list;
    }));
  };

  // 切換購買狀態
  const togglePurchased = (listId, itemId) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(i =>
            i.id === itemId ? { ...i, purchased: !i.purchased } : i
          )
        };
      }
      return list;
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🛒 購物清單</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 新增清單 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="新增清單名稱 (如: 東京購物清單)"
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addList()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addList}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              新增
            </button>
          </div>

          {/* 清單列表 */}
          {lists.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500">
              <p>尚無購物清單</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lists.map(list => (
                <div key={list.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* 清單標題 */}
                  <div
                    onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
                    className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {expandedList === list.id ? <ChevronUp size={20} className="dark:text-gray-300" /> : <ChevronDown size={20} className="dark:text-gray-300" />}
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{list.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {list.items.filter(i => i.purchased).length}/{list.items.length} 已購買
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList(list.id);
                      }}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400"
                      title="刪除清單"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* 清單項目 */}
                  {expandedList === list.id && (
                    <div className="p-4 space-y-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      {/* 新增項目表單 */}
                      {showForm && (
                        <ShoppingItemForm
                          onSubmit={(item) => {
                            addItem(list.id, item);
                          }}
                          onCancel={() => setShowForm(false)}
                        />
                      )}

                      {/* 項目列表 */}
                      {list.items.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                          <p>此清單尚無項目</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {list.items.map(item => (
                            <ShoppingItemCard
                              key={item.id}
                              item={item}
                              onTogglePurchased={() => togglePurchased(list.id, item.id)}
                              onUpdate={(updated) => updateItem(list.id, item.id, updated)}
                              onDelete={() => deleteItem(list.id, item.id)}
                            />
                          ))}
                        </div>
                      )}

                      {/* 新增按鈕 */}
                      {!showForm && (
                        <button
                          onClick={() => setShowForm(true)}
                          className="w-full mt-4 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={20} />
                          新增項目
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 購物項目卡片
 */
const ShoppingItemCard = ({ item, onTogglePurchased, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(item);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="店家"
            value={editData.shop}
            onChange={(e) => setEditData({ ...editData, shop: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="商品"
            value={editData.product}
            onChange={(e) => setEditData({ ...editData, product: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
          />
        </div>
        <textarea
          placeholder="備註 (可放連結: https://...)"
          value={editData.notes}
          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm resize-none"
          rows="2"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 py-2 rounded-lg font-bold transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-colors ${
        item.purchased
          ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 購買狀態複選框 */}
        <input
          type="checkbox"
          checked={item.purchased}
          onChange={onTogglePurchased}
          className="mt-1 w-5 h-5 cursor-pointer"
        />

        {/* 項目內容 */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              item.purchased
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 line-through'
                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
            }`}>
              {item.shop}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              item.purchased
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 line-through'
                : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
            }`}>
              {item.product} {item.quantity > 1 ? `×${item.quantity}` : ''}
            </span>
          </div>

          {/* 圖片 */}
          {item.image && (
            <div className="mb-3 overflow-hidden rounded-lg">
              <img
                src={item.image}
                alt="商品圖片"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* 備註 */}
          {item.notes && (
            <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {/* 檢測並渲染連結 */}
                {item.notes.split(/(\bhttps?:\/\/[^\s]+)/g).map((part, i) =>
                  part.match(/^https?:/) ? (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      {part} <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
            title="編輯"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400"
            title="刪除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 購物項目表單
 */
const ShoppingItemForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    shop: '',
    product: '',
    quantity: 1,
    notes: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (formData.shop.trim() && formData.product.trim()) {
      onSubmit(formData);
      setFormData({ shop: '', product: '', quantity: 1, notes: '', image: null });
      setImagePreview(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-lg border-2 border-blue-200 dark:border-gray-500 space-y-4">
      <h4 className="font-bold text-gray-900 dark:text-gray-100">新增項目</h4>

      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="店家 (如: 百貨公司)"
          value={formData.shop}
          onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="商品名稱"
          value={formData.product}
          onChange={(e) => setFormData({ ...formData, product: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 數量 */}
      <input
        type="number"
        min="1"
        placeholder="數量"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* 圖片上傳 */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-600 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          id="imageInput"
        />
        <label htmlFor="imageInput" className="flex flex-col items-center gap-2 cursor-pointer">
          <Upload size={24} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">點擊上傳商品圖片</span>
        </label>
        {imagePreview && (
          <div className="mt-3 relative">
            <img src={imagePreview} alt="預覽" className="max-h-32 rounded-lg" />
            <button
              onClick={(e) => {
                e.preventDefault();
                setImagePreview(null);
                setFormData({ ...formData, image: null });
              }}
              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 備註 */}
      <textarea
        placeholder="備註 (可放連結: https://... 或其他備註)"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="3"
      />

      {/* 按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition-colors"
        >
          新增項目
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 py-2 rounded-lg font-bold transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default ShoppingList;
