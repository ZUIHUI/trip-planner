import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, X, ExternalLink } from 'lucide-react';

const ShoppingListContent = () => {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [expandedListId, setExpandedListId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(null);
  const [formData, setFormData] = useState({ shop: '', product: '', quantity: 1, notes: '', image: null });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('shoppingLists');
    if (saved) {
      try {
        setLists(JSON.parse(saved));
      } catch (err) {
        console.error('載入失敗:', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
  }, [lists]);

  const addList = () => {
    if (!newListName.trim()) return;
    setLists([...lists, {
      id: Date.now(),
      name: newListName,
      items: [],
      createdAt: new Date().toISOString()
    }]);
    setNewListName('');
  };

  const deleteList = (id) => {
    if (window.confirm('確定要刪除這個清單嗎?')) {
      setLists(lists.filter(l => l.id !== id));
    }
  };

  const addItem = (listId) => {
    if (!formData.shop.trim() || !formData.product.trim()) {
      alert('請填寫店家和商品名稱');
      return;
    }
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: [...list.items, { ...formData, id: Date.now(), purchased: false }]
        };
      }
      return list;
    }));
    resetForm();
  };

  const deleteItem = (listId, itemId) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return { ...list, items: list.items.filter(i => i.id !== itemId) };
      }
      return list;
    }));
  };

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ shop: '', product: '', quantity: 1, notes: '', image: null });
    setImagePreview(null);
    setShowAddForm(null);
  };

  return (
    <div className="w-full px-6 py-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🛒 購物清單</h2>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="新增清單名稱 (如: 東京購物清單)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addList()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addList}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          新增清單
        </button>
      </div>

      <div className="space-y-4">
        {lists.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg font-medium">📭 尚無購物清單</p>
            <p className="text-gray-400 text-sm mt-1">新增一個清單開始購物!</p>
          </div>
        ) : (
          lists.map(list => (
            <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <button
                  onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                  className="flex-1 flex items-center gap-3 text-left hover:bg-gray-100 p-2 rounded-lg transition-colors"
                >
                  {expandedListId === list.id ? (
                    <ChevronUp size={20} className="text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{list.name}</h3>
                    <p className="text-xs text-gray-500">
                      {list.items.filter(i => !i.purchased).length}/{list.items.length} 未購買
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deleteList(list.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                  title="刪除清單"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {expandedListId === list.id && (
                <div className="p-4 space-y-4">
                  {list.items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">尚無項目</p>
                  ) : (
                    <div className="space-y-3">
                      {list.items.map(item => (
                        <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex gap-3">
                            <input
                              type="checkbox"
                              checked={item.purchased}
                              onChange={() => togglePurchased(list.id, item.id)}
                              className="w-5 h-5 mt-1 rounded text-green-600 cursor-pointer"
                            />
                            <div className="flex-1">
                              <p className={`font-bold text-gray-900 ${item.purchased ? 'line-through text-gray-400' : ''}`}>
                                {item.product}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">🏪 {item.shop}</p>
                              <p className="text-sm text-gray-600">📦 數量: {item.quantity}</p>
                              {item.notes && (
                                <div className="mt-2 text-sm text-blue-600">
                                  {item.notes.includes('http') ? (
                                    <a href={item.notes} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                      <ExternalLink size={14} />
                                      {item.notes}
                                    </a>
                                  ) : (
                                    <span>💬 {item.notes}</span>
                                  )}
                                </div>
                              )}
                              {item.image && (
                                <img src={item.image} alt={item.product} className="mt-3 max-h-24 rounded-lg border border-gray-200" />
                              )}
                            </div>
                            <button
                              onClick={() => deleteItem(list.id, item.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 flex-shrink-0"
                              title="刪除項目"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddForm === list.id ? (
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 space-y-4">
                      <h4 className="font-bold text-gray-900">新增項目</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="店家"
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

                      <input
                        type="number"
                        min="1"
                        placeholder="數量"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <textarea
                        placeholder="備註 (可放連結)"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                      />

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-white transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id={`imageInput-${list.id}`}
                        />
                        <label htmlFor={`imageInput-${list.id}`} className="flex flex-col items-center gap-2 cursor-pointer">
                          <Upload size={20} className="text-gray-400" />
                          <span className="text-sm text-gray-600">點擊上傳商品圖片</span>
                        </label>
                        {imagePreview && (
                          <div className="mt-3 relative inline-block">
                            <img src={imagePreview} alt="預覽" className="max-h-24 rounded-lg" />
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setImagePreview(null);
                                setFormData({ ...formData, image: null });
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => addItem(list.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition-colors"
                        >
                          新增項目
                        </button>
                        <button
                          onClick={resetForm}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg font-bold transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddForm(list.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
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

export default ShoppingListContent;
