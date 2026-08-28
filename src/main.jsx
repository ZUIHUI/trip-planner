import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/noto-serif-tc/wght.css';
import './styles/index.css';
import './styles/uiux-v4.css';
import './styles/experience-v5.css';
import './styles/trip-workspace.css';
import './styles/tokens.css';
import { initializeStoredAppTheme } from './utils/appTheme';

initializeStoredAppTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
