import React from 'react';

const TimePicker = ({ value, onChange, name, className }) => {
  // value format: "HH:mm"
  const safeValue = value || '00:00';
  const [hours, minutes] = safeValue.split(':');

  const handleHourChange = (e) => {
    const newHour = e.target.value;
    const newValue = `${newHour}:${minutes || '00'}`;
    onChange({ target: { name, value: newValue } });
  };

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value;
    const newValue = `${hours || '00'}:${newMinute}`;
    onChange({ target: { name, value: newValue } });
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <div className="relative flex-1">
        <select 
          value={hours || '00'} 
          onChange={handleHourChange}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500 appearance-none text-center"
        >
          {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
      <span className="text-gray-400 font-bold">:</span>
      <div className="relative flex-1">
        <select 
          value={minutes || '00'} 
          onChange={handleMinuteChange}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500 appearance-none text-center"
        >
          {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TimePicker;
