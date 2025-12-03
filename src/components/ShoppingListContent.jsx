import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Upload, ExternalLink, X } from 'lucide-react';

/**
 * 購物清單內容組件 - 用於在標籤頁面顯示
 * 功能: 記錄店家、商品、支援圖片上傳、備註可放連結
 */
const ShoppingListContent = () => {
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
        console.error('載入購物清單失敗:', err);
      }
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
  }, [lists]);

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
  const deleteList = (id) => {
    if (window.confirm('確定要刪除這個清單嗎?')) {
      setLists(lists.filter(l => l.id !== id));
    }
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
    <div className="py-4 pb-20 space-y-6">
      {/* 新增清單 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="新增清單名稱 (如: 東京購物清單)"
          value={newList}
          onChange={(e) => setNewList(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addList()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addList}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          新增清單
        </button>
      </div>

      {/* 清單列表 */}
      <div className="space-y-4">
        {lists.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg">尚無購物清單</p>
            <p className="text-gray-400 text-sm">新增一個清單開始購物!</p>
          </div>
        ) : (
          lists.map(list => (
            <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 清單標題 */}
              <button
                onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedList === list.id ? (
                    <ChevronUp size={20} className="text-blue-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{list.name}</h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                    {list.items.filter(i => !i.purchased).length}/{list.items.length}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteList(list.id);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </button>

              {/* 清單內容 */}
              {expandedList === list.id && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                  {/* 項目列表 */}
                  <div className="space-y-3">
                    {list.items.length === 0 ? (
                      <p className="text-center text-gray-400 py-4">尚無項目</p>
                    ) : (
                      list.items.map(item => (
                        <div
                          key={item.id}
                          className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.purchased}
                              onChange={() => togglePurchased(list.id, item.id)}
                              className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-gray-900 ${item.purchased ? 'line-through text-gray-400' : ''}`}>
                                {item.product}
                              </p>
                              <p className="text-sm text-gray-600">🏪 {item.shop}</p>
                              <p className="text-sm text-gray-600">📦 數量: {item.quantity}</p>
                              {item.notes && (
                                <div className="mt-2 text-sm text-blue-600 break-words">
                                  {item.notes.includes('http') ? (
                                    <a
                                      href={item.notes}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 hover:underline"
                                    >
                                      <ExternalLink size={14} />
                                      {item.notes}
                                    </a>
                                  ) : (
                                    <span>💬 {item.notes}</span>
                                  )}
                                </div>
                              )}
                              {item.image && (
                                <div className="mt-3">
                                  <img
                                    src={item.image}
                                    alt={item.product}
                                    className="max-h-32 rounded-lg border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => deleteItem(list.id, item.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 flex-shrink-0"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 新增項目表單 */}
                  {showForm ? (
                    <ShoppingItemForm
                      onSubmit={(item) => addItem(list.id, item)}
                      onCancel={() => setShowForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowForm(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      新增項目
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 新增購物項目的表單子組件
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 space-y-4">
      <h4 className="font-bold text-gray-900">新增項目</h4>

      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="店家 (如: 百貨公司)"
          value={formData.shop}
          onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="商品名稱"
          value={formData.product}
          onChange={(e) => setFormData({ ...formData, product: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 數量 */}
      <input
        type="number"
        min="1"
        placeholder="數量"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* 圖片上傳 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-100 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          id="imageInput"
        />
        <label htmlFor="imageInput" className="flex flex-col items-center gap-2 cursor-pointer">
          <Upload size={24} className="text-gray-400" />
          <span className="text-sm text-gray-600">點擊上傳商品圖片</span>
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg font-bold transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default ShoppingListContent;
