import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, ExternalLink, Filter, ShoppingCart, Search, Settings, ZoomIn, Pencil, GripVertical } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateShoppingList, updateShoppingCategories } from '../services/tripService';

const ShoppingListContent = ({ tripId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  
  // Categories State
  const defaultCategories = ['未分類', '藥妝', '服飾', '伴手禮', '電器', '零食', '其他'];
  const [categories, setCategories] = useState(defaultCategories);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '未分類',
    shop: '',
    quantity: 1,
    notes: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  
  // Load from Firestore
  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.shoppingList) {
          setItems(data.shoppingList);
        }
        if (data.shoppingCategories && Array.isArray(data.shoppingCategories)) {
          setCategories(data.shoppingCategories);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching shopping list:", err);
      setError("無法載入購物清單");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  const updateItems = (newItems) => {
    setItems(newItems);
    if (tripId) {
      updateShoppingList(tripId, newItems).catch(err => {
        console.error("Failed to save shopping list:", err);
      });
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const newCategories = [...categories, newCategoryName.trim()];
      setCategories(newCategories);
      setNewCategoryName('');
      if (tripId) {
        updateShoppingCategories(tripId, newCategories);
      }
    }
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (window.confirm(`確定要刪除分類「${categoryToDelete}」嗎？`)) {
      const newCategories = categories.filter(c => c !== categoryToDelete);
      setCategories(newCategories);
      if (tripId) {
        updateShoppingCategories(tripId, newCategories);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = () => {
    if (!formData.name.trim()) {
      alert('請輸入商品名稱');
      return;
    }

    if (editingId) {
      // Update existing item
      const newItems = items.map(item => 
        item.id === editingId 
          ? { ...item, ...formData } 
          : item
      );
      updateItems(newItems);
    } else {
      // Add new item
      const newItem = {
        id: Date.now(),
        ...formData,
        purchased: false,
        createdAt: new Date().toISOString()
      };
      const newItems = [newItem, ...items];
      updateItems(newItems);
    }
    resetForm();
  };

  const handleEditItem = (item) => {
    setFormData({
      name: item.name,
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
    if (window.confirm('確定要刪除此商品嗎？')) {
      const newItems = items.filter(item => item.id !== id);
      updateItems(newItems);
    }
  };

  const togglePurchased = (id) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, purchased: !item.purchased } : item
    );
    updateItems(newItems);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '未分類',
      shop: '',
      quantity: 1,
      notes: '',
      image: null
    });
    setImagePreview(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const sourceIndex = items.findIndex(i => i.id === draggedItemId);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    updateItems(newItems);
    setDraggedItemId(null);
  };

  // Touch Support for Mobile Drag and Drop
  const handleTouchStart = (e, id) => {
    setDraggedItemId(id);
  };

  const handleTouchMove = (e) => {
    if (!draggedItemId) return;
    // Prevent scrolling while dragging via the handle
    if (e.cancelable && e.target.closest('.touch-none')) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const targetRow = target.closest('[data-item-id]');
    if (targetRow) {
      const targetId = parseInt(targetRow.getAttribute('data-item-id'));
      
      // Only reorder if we are over a different item
      if (targetId && targetId !== draggedItemId) {
        const sourceIndex = items.findIndex(i => i.id === draggedItemId);
        const targetIndex = items.findIndex(i => i.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
          const newItems = [...items];
          const [movedItem] = newItems.splice(sourceIndex, 1);
          newItems.splice(targetIndex, 0, movedItem);
          updateItems(newItems);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedItemId(null);
  };

  // Safe filter
  const safeItems = Array.isArray(items) ? items : [];
  const filteredItems = safeItems.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.shop && item.shop.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const totalItems = safeItems.length;
  const purchasedItems = safeItems.filter(i => i.purchased).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <span className="ml-2 text-gray-500">載入購物清單中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>載入失敗: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-6 pb-24">
       {/* Header & Stats */}
       <div className="mb-6">
         <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <ShoppingCart className="text-orange-500" />
           購物清單
         </h2>
         <div className="flex gap-4 mt-2 text-sm text-gray-600">
           <span>總計: {totalItems} 項</span>
           <span>已買: {purchasedItems} 項</span>
           <span>進度: {totalItems ? Math.round((purchasedItems / totalItems) * 100) : 0}%</span>
         </div>
         {/* Progress Bar */}
         <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${totalItems ? (purchasedItems / totalItems) * 100 : 0}%` }}
            ></div>
         </div>
       </div>

       {/* Controls */}
       <div className="space-y-3 mb-6">
         {/* Search Bar */}
         <div className="relative">
           <input
             type="text"
             placeholder="搜尋商品、店家或備註..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand-500"
           />
           <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
           {searchQuery && (
             <button 
               onClick={() => setSearchQuery('')}
               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               <X size={16} />
             </button>
           )}
         </div>

         <div className="flex flex-col sm:flex-row gap-3">
           <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 flex-1">
             <Filter size={18} className="text-gray-400 mr-2" />
             <select 
               value={filterCategory}
               onChange={(e) => setFilterCategory(e.target.value)}
               className="bg-transparent w-full outline-none text-gray-700"
             >
               <option value="All">顯示所有分類</option>
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           <button
             onClick={() => setIsManageCategoriesOpen(true)}
             className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
             title="管理分類"
           >
             <Settings size={20} />
           </button>
         </div>
       </div>

       {/* Manage Categories Modal */}
       {isManageCategoriesOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-900">管理分類</h3>
               <button onClick={() => setIsManageCategoriesOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
             </div>
             
             <div className="flex gap-2 mb-4">
               <input
                 type="text"
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 placeholder="新分類名稱"
                 className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                 onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
               />
               <button 
                 onClick={handleAddCategory}
                 disabled={!newCategoryName.trim()}
                 className="bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
               >
                 <Plus size={18} />
               </button>
             </div>

             <div className="space-y-2 max-h-60 overflow-y-auto">
               {categories.map(cat => (
                 <div key={cat} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                   <span className="text-gray-700">{cat}</span>
                   {!defaultCategories.includes(cat) && (
                     <button 
                       onClick={() => handleDeleteCategory(cat)}
                       className="text-gray-400 hover:text-red-500"
                     >
                       <Trash2 size={16} />
                     </button>
                   )}
                 </div>
               ))}
             </div>
           </div>
         </div>
       )}

       {/* Image Zoom Modal */}
       {zoomedImage && (
         <div 
           className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-pointer"
           onClick={() => setZoomedImage(null)}
         >
           <div className="relative max-w-4xl max-h-[90vh]">
             <img 
               src={zoomedImage} 
               alt="Zoomed" 
               className="max-w-full max-h-[90vh] object-contain rounded-lg"
             />
             <button 
               onClick={() => setZoomedImage(null)}
               className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 shadow-lg hover:bg-gray-200"
             >
               <X size={24} />
             </button>
           </div>
         </div>
       )}

       {/* Add Form Modal/Panel */}
       {showAddForm && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-gray-900">{editingId ? '編輯購物項目' : '新增購物項目'}</h3>
               <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱 *</label>
                 <input 
                   type="text" 
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                   placeholder="例如: EVE止痛藥"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                   <select 
                     value={formData.category}
                     onChange={e => setFormData({...formData, category: e.target.value})}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                   >
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">數量</label>
                   <input 
                     type="number" 
                     min="1"
                     value={formData.quantity}
                     onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">店家 / 地點</label>
                 <input 
                   type="text" 
                   value={formData.shop}
                   onChange={e => setFormData({...formData, shop: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                   placeholder="例如: 松本清, Donki"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">備註 (可貼連結)</label>
                 <textarea 
                   value={formData.notes}
                   onChange={e => setFormData({...formData, notes: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none resize-none"
                   rows="3"
                   placeholder="規格、型號、價格..."
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">圖片</label>
                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                   <input 
                     type="file" 
                     accept="image/*" 
                     onChange={handleImageChange}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   />
                   {imagePreview ? (
                     <div className="relative inline-block">
                       <img src={imagePreview} alt="Preview" className="max-h-32 rounded mx-auto" />
                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setImagePreview(null);
                           setFormData({...formData, image: null});
                         }}
                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                       >
                         <X size={12} />
                       </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center text-gray-500">
                       <Upload size={24} className="mb-2" />
                       <span className="text-sm">點擊上傳圖片</span>
                     </div>
                   )}
                 </div>
               </div>

               <button 
                 onClick={handleSaveItem}
                 className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors mt-2"
               >
                 {editingId ? '儲存變更' : '確認新增'}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* List */}
       <div className="space-y-3">
         {filteredItems.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
             <p className="text-gray-400">沒有找到商品</p>
           </div>
         ) : (
           filteredItems.map(item => (
             <div 
               key={item.id} 
               data-item-id={item.id}
               draggable
               onDragStart={(e) => handleDragStart(e, item.id)}
               onDragOver={handleDragOver}
               onDrop={(e) => handleDrop(e, item.id)}
               className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
                 item.purchased ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
               } ${draggedItemId === item.id ? 'opacity-50 bg-gray-100' : ''}`}
             >
               <div className="flex gap-4">
                 {/* Drag Handle */}
                 <div 
                   className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none flex items-center -ml-2 p-2"
                   onTouchStart={(e) => handleTouchStart(e, item.id)}
                   onTouchMove={handleTouchMove}
                   onTouchEnd={handleTouchEnd}
                 >
                   <GripVertical size={20} />
                 </div>

                 {/* Checkbox */}
                 <div className="pt-1">
                   <input 
                     type="checkbox" 
                     checked={item.purchased}
                     onChange={() => togglePurchased(item.id)}
                     className="w-6 h-6 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                   />
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className={`font-bold text-lg text-gray-900 truncate ${item.purchased ? 'line-through text-gray-400' : ''}`}>
                         {item.name}
                       </h3>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                           {item.category}
                         </span>
                         {item.shop && (
                           <span className="text-xs text-gray-500 flex items-center gap-1">
                             🏪 {item.shop}
                           </span>
                         )}
                         <span className="text-xs text-gray-500">
                           x{item.quantity}
                         </span>
                       </div>
                     </div>
                     <div className="flex gap-1">
                       <button 
                         onClick={() => handleEditItem(item)}
                         className="text-gray-400 hover:text-brand-500 p-1"
                       >
                         <Pencil size={18} />
                       </button>
                       <button 
                         onClick={() => deleteItem(item.id)}
                         className="text-gray-400 hover:text-red-500 p-1"
                       >
                         <Trash2 size={18} />
                       </button>
                     </div>
                   </div>

                   {/* Notes & Image */}
                   {(item.notes || item.image) && (
                     <div className={`mt-3 pt-3 border-t ${item.purchased ? 'border-green-100' : 'border-gray-50'} space-y-2`}>
                       {item.notes && (
                         <div className="text-sm text-gray-600 break-words">
                           {item.notes.includes('http') ? (
                             <a href={item.notes} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
                               <ExternalLink size={14} />
                               連結
                             </a>
                           ) : (
                             item.notes
                           )}
                         </div>
                       )}
                       {item.image && (
                         <div className="relative group inline-block">
                           <img 
                             src={item.image} 
                             alt={item.name} 
                             className="max-h-32 rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity" 
                             onClick={() => setZoomedImage(item.image)}
                           />
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                             <ZoomIn className="text-white drop-shadow-md" size={24} />
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             </div>
           ))
         )}
       </div>

       {/* Floating Action Button */}
       <button
         onClick={() => setShowAddForm(true)}
         className="fixed bottom-24 right-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 transition-colors z-40"
       >
         <Plus size={32} />
       </button>
    </div>
  );
};

export default ShoppingListContent;
