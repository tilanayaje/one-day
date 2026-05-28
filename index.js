import { registerRootComponent } from 'expo';
import App from './App';

if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.innerHTML = `
    * { font-family: 'Raleway', sans-serif !important; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #666; }
  `;
  document.head.appendChild(style);
}

registerRootComponent(App);