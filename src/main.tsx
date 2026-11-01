import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pt-sans/cyrillic-400.css';
import '@fontsource/pt-sans/cyrillic-700.css';
import '@fontsource/pt-sans/latin-400.css';
import '@fontsource/pt-sans/latin-700.css';
import '@fontsource/pt-serif/cyrillic-400.css';
import '@fontsource/pt-serif/cyrillic-400-italic.css';
import '@fontsource/pt-serif/latin-400.css';
import '@fontsource/pt-serif/latin-400-italic.css';
import '@xyflow/react/dist/style.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
