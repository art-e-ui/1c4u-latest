import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './lib/i18n'
import { registerSW } from 'virtual:pwa-register'

// Register service worker
registerSW({ 
  immediate: true,
  onRegisteredSW(swUrl, r) {
    console.log('SW Registered:', swUrl);
    
    // Register for Periodic Sync if supported
    if (r && 'periodicSync' in r) {
      const periodicSync = (r as unknown as { periodicSync: { register: (tag: string, options?: { minInterval: number }) => Promise<void> } }).periodicSync;
      periodicSync.register('fetch-latest-products', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      }).catch((err: unknown) => console.log('Periodic Sync registration failed:', err));
    }

    // Register for Background Sync if supported
    if (r && 'sync' in r) {
      const sync = (r as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync;
      sync.register('sync-orders').catch((err: unknown) => console.log('Background Sync registration failed:', err));
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <App />,
)
