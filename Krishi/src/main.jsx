import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import './styles/scanner.css'
import './styles/scanner2.css'
import './styles/themes.css'
import './styles/mobile.css'

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
