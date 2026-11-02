import { useEffect, useRef, useState } from 'react';

let registration: Promise<ServiceWorkerRegistration> | undefined;
export function OfflineStatus() {
  const [ready, setReady] = useState(false); const [waiting, setWaiting] = useState<ServiceWorker | null>(null); const [error, setError] = useState(false);
  const applying = useRef(false);
  const reloading = useRef(false);
  const reloadOnce = () => { if (!reloading.current) { reloading.current = true; window.location.reload(); } };
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false; let registered: ServiceWorkerRegistration | undefined;
    const installed = () => {
      if (disposed || !registered) return;
      if (registered.waiting) setWaiting(registered.waiting);
      if (registered.active) setReady(true);
    };
    const found = () => { registered?.installing?.addEventListener('statechange', installed); };
    const controlled = () => { if (applying.current) reloadOnce(); else if (!disposed) setReady(true); };
    registration ??= navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
    void registration.then(value => { if (disposed) return; registered = value; value.addEventListener('updatefound', found); found(); installed(); }).catch(() => { if (!disposed) setError(true); registration = undefined; });
    void navigator.serviceWorker.ready.then(() => { if (!disposed) setReady(true); });
    navigator.serviceWorker.addEventListener('controllerchange', controlled);
    return () => { disposed = true; registered?.removeEventListener('updatefound', found); navigator.serviceWorker.removeEventListener('controllerchange', controlled); };
  }, []);
  if (!import.meta.env.PROD) return null;
  return <div className="offline-status"><span role="status">{error ? 'Припрема за рад без интернета није успела. Поново отворите страницу када сте повезани.' : ready ? 'Апликација је спремна за рад без интернета.' : 'Припремамо апликацију за рад без интернета…'}</span>{waiting && <><span>Доступна је нова верзија. Прво сачувајте отворен унос.</span><button className="text-button" onClick={() => {
    applying.current = true;
    const activated = () => { if (waiting.state === 'activated') { waiting.removeEventListener('statechange', activated); reloadOnce(); } };
    waiting.addEventListener('statechange', activated); waiting.postMessage('SKIP_WAITING'); activated();
  }}>Ажурирај и поново отвори</button></>}</div>;
}
