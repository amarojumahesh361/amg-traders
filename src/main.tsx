import {createRoot} from 'react-dom/client';
import AuthGate from './AuthGate';
import './styles.css';
import './redesign.css';
try{const appearance=localStorage.getItem('amg-appearance')==='dark'?'dark':'light';document.documentElement.dataset.appearance=appearance;document.documentElement.style.colorScheme=appearance}catch{}
createRoot(document.getElementById('root')!).render(<AuthGate/>);
