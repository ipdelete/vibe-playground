import './renderer/styles/global.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './renderer/App';

console.log('Renderer script loading...');

const container = document.getElementById('root');
if (container) {
  console.log('Root container found, mounting React app...');
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('React app mounted successfully');
  } catch (error) {
    console.error('Failed to mount React app:', error);
    container.innerHTML = `<pre style="color: red; padding: 20px;">Error: ${error}</pre>`;
  }
} else {
  console.error('Root container not found!');
  document.body.innerHTML = '<pre style="color: red; padding: 20px;">Root container not found!</pre>';
}
