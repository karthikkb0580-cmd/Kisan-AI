import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './scanner.css'
import './scanner2.css'
import './themes.css'

const container = document.getElementById('root');
if (container) {
  if (!window._reactRoot) {
    window._reactRoot = ReactDOM.createRoot(container);
  }
  window._reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
