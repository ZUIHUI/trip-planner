import React from 'react';
import { Plane, Home } from 'lucide-react';

const Header = ({ details }) => (
  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
    <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
      <Plane size={150} />
    </div>
    <p className="text-blue-100 text-sm font-medium tracking-wider mb-1">{details?.dates || '未設定'}</p>
    <h1 className="text-3xl font-bold mb-2">{details?.title || '旅程'}</h1>
    <div className="flex items-center space-x-2 text-blue-100 text-sm">
      <Home size={16} />
      <span>{details?.accommodation?.name || '未設定住宿'}</span>
    </div>
  </div>
);

export default Header;
