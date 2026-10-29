import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isAndroidApp } from './platform';
import { stopAudio } from './audio';

export default function NativeLifecycle() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAndroidApp) return;
    const back = App.addListener('backButton', () => {
      const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (dialog) {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
        return;
      }
      if (document.querySelector('[role="listbox"], [role="dialog"]')) {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
      else if (window.location.pathname !== '/') navigate('/', { replace: true });
      else void App.exitApp();
    });
    const state = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) stopAudio();
      else window.dispatchEvent(new Event('focus'));
    });
    return () => { void back.then(handle => handle.remove()); void state.then(handle => handle.remove()); };
  }, [navigate]);
  return null;
}
