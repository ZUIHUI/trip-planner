import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, ExternalLink, Search, Filter, ShoppingBag } from 'lucide-react';

const ShoppingListContent = () => {
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  
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

  // Categories for suggestion
  const categories = ['未分類', '藥妝', '服飾', '伴手禮', '電器', '零食', '其他'];

  useEffect(() => {
    const saved = localStorage.getItem('shoppingItems');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to load shopping list', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shoppingItems', JSON.stringify(items));
  }, [items]);

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

  const addItem = () => {
    if (!formData.name.trim()) {
      alert('請輸入商品名稱');
      return;
    }
    const newItem = {
      id: Date.now(),
      ...formData,
      purchased: false,
      createdAt: new Date().toISOString()
    };
    setItems(prev => [newItem, ...prev]);
    resetForm();
  };

  const deleteItem = (id) => {
    if (window.confirm('確定要刪除此商品嗎？')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const togglePurchased = (id) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, purchased: !item.purchased } : item
    ));
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
    setShowAddForm(false);
  };

  const filteredItems = filterCategory === 'All' 
    ? items 
    : items.filter(item => item.category === filterCategory);

  // Calculate stats
  const totalItems = items.length;
  const purchasedItems = items.filter(i => i.purchased).length;

  return (
    <div className="w-full px-4 sm:px-6 py-6 pb-24">
       {/* Header & Stats */}
       <div className="mb-6">
         <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <ShoppingBag className="text-orange-500" />
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
       <div className="flex flex-col sm:flex-row gap-3 mb-6">
         <button 
           onClick={() => setShowAddForm(true)}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
         >
           <Plus size={20} />
           新增商品
         </button>
         
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
       </div>

       {/* Add Form Modal/Panel */}
       {showAddForm && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-gray-900">新增購物項目</h3>
               <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱 *</label>
                 <input 
                   type="text" 
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                 onClick={addItem}
                 className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2"
               >
                 確認新增
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
             <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border ${item.purchased ? 'border-green-200 bg-green-50/30' : 'border-gray-100'} transition-all`}>
               <div className="flex gap-4">
                 {/* Checkbox */}
                 <div className="pt-1">
                   <input 
                     type="checkbox" 
                     checked={item.purchased}
                     onChange={() => togglePurchased(item.id)}
                     className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                     <button 
                       onClick={() => deleteItem(item.id)}
                       className="text-gray-400 hover:text-red-500 p-1"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>

                   {/* Notes & Image */}
                   {(item.notes || item.image) && (
                     <div className={`mt-3 pt-3 border-t ${item.purchased ? 'border-green-100' : 'border-gray-50'} space-y-2`}>
                       {item.notes && (
                         <p className="text-sm text-gray-600 break-words">
                           {item.notes}
                         </p>
                       )}
                       {item.image && (
                         <img src={item.image} alt={item.name} className="max-h-32 rounded-lg border border-gray-200" />
                       )}
                     </div>
                   )}
                 </div>
               </div>
             </div>
           ))
         )}
       </div>
    </div>
  );
};

export default ShoppingListContent;
