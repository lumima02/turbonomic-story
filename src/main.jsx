import React from 'react';
import { createRoot } from 'react-dom/client';
import '@ibm/plex-sans/css/ibm-plex-sans-default.min.css';
import './styles/index.scss';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
