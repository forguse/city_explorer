import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div className="w-full max-w-md mx-auto h-screen bg-white shadow-2xl overflow-hidden relative">
      <App />
    </div>
  </React.StrictMode>
);
