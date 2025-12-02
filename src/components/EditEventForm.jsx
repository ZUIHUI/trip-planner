import React, { useState } from 'react';
import { MapPin, Navigation, Save } from 'lucide-react';

const EditEventForm = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState(event || {
    time: "", title: "", type: "sightseeing", location: "", desc: "", urgent: false,
    transport: { mode: "train", duration: "", route: "" },
    cost: ""
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 font-bold block mb-1">時間</label>
          <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold block mb-1">類型</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500">
            <option value="sightseeing">景點</option>
            <option value="food">美食</option>
            <option value="shopping">購物</option>
            <option value="transport">交通</option>
            <option value="hotel">住宿</option>
            <option value="flight">航班</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">標題</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="輸入行程名稱" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">地點 (用於導航)</label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
          <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="輸入Google Maps地點名稱" className="w-full pl-9 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">描述 / 備註</label>
        <textarea name="desc" value={formData.desc} onChange={handleChange} placeholder="輸入詳細資訊" rows="2" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"></textarea>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center"><Navigation size={12} className="mr-1"/> 交通資訊 (選填)</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="text" name="transport.duration" value={formData.transport?.duration || ""} onChange={handleChange} placeholder="預估時間 (如: 30分)" className="bg-white border border-blue-200 rounded p-1.5 text-xs" />
          <select name="transport.mode" value={formData.transport?.mode || "train"} onChange={handleChange} className="bg-white border border-blue-200 rounded p-1.5 text-xs">
            <option value="train">電車/地鐵</option>
            <option value="walk">步行</option>
            <option value="taxi">計程車/Uber</option>
            <option value="bus">巴士</option>
          </select>
        </div>
        <input type="text" name="transport.route" value={formData.transport?.route || ""} onChange={handleChange} placeholder="路線備註 (如: 山手線往池袋)" className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs" />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">💰 預估花費 (選填)</label>
        <div className="relative">
          <input
            type="number"
            name="cost"
            value={formData.cost || ""}
            onChange={handleChange}
            placeholder="輸入金額 (如: 1500)"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">元</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" id="urgent" name="urgent" checked={formData.urgent} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
        <label htmlFor="urgent" className="text-sm text-gray-700 font-medium">標記為重要 (需預約/必去)</label>
      </div>

      <button onClick={() => onSave(formData)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md mt-2 flex items-center justify-center">
        <Save size={18} className="mr-2" />
        儲存行程
      </button>
    </div>
  );
};

export default EditEventForm;
