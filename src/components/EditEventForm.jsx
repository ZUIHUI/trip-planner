import React, { useState } from 'react';
import { MapPin, Navigation, Save, Link as LinkIcon } from 'lucide-react';
import GooglePlaceInput from './GooglePlaceInput';

const EditEventForm = ({ event, onSave, onCancel, readOnly = false, onRequestEdit }) => {
  const [formData, setFormData] = useState(event || {
    time: "", title: "", type: "sightseeing", location: "", desc: "", urgent: false,
    locationPlace: null,
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

  const handleLocationTextChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      location: value,
      locationPlace: null
    }));
  };

  const handleLocationPlaceSelect = (place) => {
    const nextLocation = place.address || place.name || '';
    setFormData((prev) => ({
      ...prev,
      title: prev.title || place.name || nextLocation,
      location: nextLocation,
      locationPlace: place
    }));
  };

  const trimmedLocation = (formData.location || '').trim();
  const mapEmbedUrl = trimmedLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedLocation)}&output=embed`
    : '';
  const mapSearchRecommendations = trimmedLocation
    ? [
        { label: '附近景點', keyword: '景點' },
        { label: '附近餐廳', keyword: '餐廳' },
        { label: '附近咖啡', keyword: '咖啡' },
        { label: '附近購物', keyword: '購物' }
      ]
    : [];

  return (
    <div className="space-y-4 tp-body-text">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">時間</label>
          <input type="time" name="time" value={formData.time} onChange={handleChange} disabled={readOnly} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed" />
        </div>
        <div>
          <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">類型</label>
          <select name="type" value={formData.type} onChange={handleChange} disabled={readOnly} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed">
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
        <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">標題</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} disabled={readOnly} placeholder="輸入行程名稱" className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed" />
      </div>

      <div>
        <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">地點 (用於導航)</label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
          <GooglePlaceInput
            name="location"
            value={formData.location}
            onTextChange={handleLocationTextChange}
            onPlaceSelect={handleLocationPlaceSelect}
            disabled={readOnly}
            placeholder="輸入Google Maps地點名稱"
            className="w-full pl-9 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>
        {trimmedLocation && (
          <div className="mt-3 space-y-2">
            <p className="tp-caption-text text-gray-500 dark:text-slate-400">Google Maps 預覽</p>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600">
              <iframe
                title="location-map-preview"
                src={mapEmbedUrl}
                className="h-44 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {mapSearchRecommendations.map((item) => (
                <a
                  key={item.keyword}
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${trimmedLocation} ${item.keyword}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">描述 / 備註</label>
        <textarea name="desc" value={formData.desc} onChange={handleChange} disabled={readOnly} placeholder="輸入詳細資訊" rows="2" className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"></textarea>
      </div>

      <div>
        <label className="tp-caption-text text-gray-500 dark:text-slate-400 font-bold block mb-1">相關連結 (URL)</label>
        <div className="relative">
          <LinkIcon size={16} className="absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
          <input type="url" name="url" value={formData.url || ""} onChange={handleChange} disabled={readOnly} placeholder="https://example.com" className="w-full pl-9 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg tp-form-control focus:outline-brand-500 text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed" />
        </div>
        <p className="tp-caption-text text-gray-400 dark:text-slate-500 mt-1">例如: 官方網站、購票連結、預約確認等</p>
      </div>

      <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-lg border border-brand-100 dark:border-brand-900/50">
        <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 mb-2 flex items-center"><Navigation size={12} className="mr-1"/> 交通資訊 (選填)</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="text" name="transport.duration" value={formData.transport?.duration || ""} onChange={handleChange} disabled={readOnly} placeholder="預估時間 (如: 30分)" className="bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 rounded p-1.5 text-xs text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed" />
          <select name="transport.mode" value={formData.transport?.mode || "train"} onChange={handleChange} disabled={readOnly} className="bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 rounded p-1.5 text-xs text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed">
            <option value="train">電車/地鐵</option>
            <option value="walk">步行</option>
            <option value="taxi">計程車/Uber</option>
            <option value="bus">巴士</option>
            <option value="flight">飛機</option>
          </select>
        </div>
        <input type="text" name="transport.route" value={formData.transport?.route || ""} onChange={handleChange} disabled={readOnly} placeholder="路線備註 (如: 山手線往池袋)" className="w-full bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 rounded p-1.5 text-xs text-gray-900 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed" />
      </div>

      <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500 dark:text-slate-400 font-bold">💰 花費設定</label>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-slate-400">幣別:</label>
            <select
              name="currency"
              value={formData.currency || 'JPY'}
              onChange={handleChange}
              disabled={readOnly}
              className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="JPY">JPY (日幣)</option>
              <option value="TWD">TWD (台幣)</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">預估金額 (預算)</label>
          <input
            type="number"
            name="cost"
            value={formData.cost || ""}
            onChange={handleChange}
            disabled={readOnly}
            placeholder="輸入預算"
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm focus:outline-brand-500 dark:text-gray-200 disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" id="urgent" name="urgent" checked={formData.urgent} onChange={handleChange} disabled={readOnly} className="rounded text-brand-600 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed" />
        <label htmlFor="urgent" className="text-sm text-gray-700 dark:text-gray-300 font-medium">標記為重要 (需預約/必去)</label>
      </div>

      {readOnly ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            關閉
          </button>
          <button onClick={onRequestEdit} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-md">
            編輯行程
          </button>
        </div>
      ) : (
        <button onClick={() => onSave(formData)} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-md mt-2 flex items-center justify-center">
          <Save size={18} className="mr-2" />
          儲存行程
        </button>
      )}
    </div>
  );
};

export default EditEventForm;
