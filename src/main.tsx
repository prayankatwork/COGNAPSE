import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { opsTelemetry } from './services/opsTelemetry';

// Initialize non-invasive operational telemetry for the Command Centre
opsTelemetry.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
