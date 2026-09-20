import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DataProvider } from './context/DataProvider';
import { registerServiceWorker } from './utils/registerServiceWorker';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/adaptive.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root is missing from index.html');

// Remove the pre-JS paint shell now that React is about to take over.
document.getElementById('boot')?.remove();

createRoot(host).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
);

registerServiceWorker();
