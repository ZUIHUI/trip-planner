import React, { useState } from 'react';

const EditDetailsForm = ({ tripDetails, detailsType, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    detailsType === 'accommodation' ? (tripDetails?.accommodation || {}) :
    detailsType === 'outbound' ? (tripDetails?.flights?.outbound || {}) :
    detailsType === 'inbound' ? (tripDetails?.flights?.inbound || {}) : {}
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (detailsType === 'accommodation') {
      onSave({ accommodation: formData });
    } else if (detailsType === 'outbound') {
      onSave({
        flights: {
          ...tripDetails.flights,
          outbound: formData
        }
      });
    } else if (detailsType === 'inbound') {
      onSave({
        flights: {
          ...tripDetails.flights,
          inbound: formData
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {detailsType === 'accommodation' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">住宿名稱</label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：新大久保 / 新宿御苑 V"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：新大久保站"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
            <input
              type="text"
              name="checkIn"
              value={formData.checkIn || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：2/23 16:00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
            <input
              type="text"
              name="checkOut"
              value={formData.checkOut || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：2/28 10:00"
            />
          </div>
        </>
      )}

      {(detailsType === 'outbound' || detailsType === 'inbound') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">航班代碼</label>
            <input
              type="text"
              name="code"
              value={formData.code || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：JX802"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">航空公司</label>
            <input
              type="text"
              name="airline"
              value={formData.airline || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：星宇航空"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="text"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：2/23"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
            <input
              type="text"
              name="time"
              value={formData.time || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="例：14:40 抵達"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">起飛地</label>
              <input
                type="text"
                name="dep"
                value={formData.dep || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="例：TPE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">抵達地</label>
              <input
                type="text"
                name="arr"
                value={formData.arr || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="例：NRT"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-medium"
        >
          取消
        </button>
      </div>
    </form>
  );
};

export default EditDetailsForm;
