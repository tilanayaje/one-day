import { registerRootComponent } from 'expo';
import App from './App';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    * { font-family: 'Raleway_400Regular', sans-serif !important; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #666; }
    .light-mode ::-webkit-scrollbar-thumb { background: #bbb; }
    .light-mode ::-webkit-scrollbar-thumb:hover { background: #999; }
  `;
  document.head.appendChild(style);
}

registerRootComponent(App);