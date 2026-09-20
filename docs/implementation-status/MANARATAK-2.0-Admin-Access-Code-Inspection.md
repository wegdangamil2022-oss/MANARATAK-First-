# MANARATAK 2.0 - Admin Access Code Inspection Report

## 1. Route Definitions & Admin Bridge Component
**File:** `apps/web/src/router/index.tsx`
```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // ... (other routes) ...
      {
        path: 'login',
        element: <LoginPage />
      },
      // ...
      {
        path: 'admin',
        element: <AdminAccessBridgePage />
      }
    ]
  }
]);

function AdminAccessBridgePage() {
  const { t } = useTranslation();
  const demoUnlocked = localStorage.getItem('manaratak_demo_role') === 'admin';
  const rawAdminUrl = import.meta.env.VITE_ADMIN_URL;
  // Use VITE_ADMIN_URL only if it's a valid external URL, not /admin
  const hasExternalAdminUrl = rawAdminUrl && rawAdminUrl !== '/admin' && rawAdminUrl.startsWith('http');

  const openAdminPortal = () => {
    if (hasExternalAdminUrl) {
      window.location.href = demoUnlocked ? `${rawAdminUrl}?auto_unlock=admin-demo` : rawAdminUrl;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div className="bg-white border rounded-3xl p-10 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">{t('admin_portal_access') || 'Admin Portal Access'}</h1>
        
        {demoUnlocked && (
          <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-medium mb-6">
            ✓ {t('demo_admin_unlocked') || 'Demo admin credentials unlocked successfully.'}
          </div>
        )}

        {hasExternalAdminUrl ? (
          // ... Shows external portal button ...
        ) : (
          <div className="text-left space-y-6">
            <p className="text-gray-600 text-center">
              {t('admin_portal_local_desc') || 'The Admin Portal is a separate React application (@manaratak/admin).'}
            </p>
            
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm">
              <strong className="block mb-2">To view the Admin Portal locally:</strong>
              <ul className="list-disc pl-5 space-y-1">
                <li>Run <code>npm run dev</code> to start the main app on port 3000.</li>
                <li>In a new terminal, run <code>npm run dev -w @manaratak/admin</code> to start the admin app.</li>
                <li>Navigate to <code>http://localhost:3001</code> in your browser.</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-xl text-sm">
              <strong className="block mb-2">Google Studio / Hosted Preview:</strong>
              <p>
                In environments where only a single port (3000) is exposed, secondary apps cannot be reached directly. 
                Configure <code>VITE_ADMIN_URL</code> to a fully deployed admin URL to enable the bridge.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## 2. Demo Admin Login Logic
**File:** `apps/web/src/features/auth/LoginPage.tsx`
```tsx
    if (role === 'admin') {
      if (normalizedEmail !== 'wegdangamil2022@gmail.com' || password !== 'wegdan1234@1234') {
        setMessage(t('demo_admin_invalid'));
        return;
      }
      localStorage.setItem('manaratak_demo_email', normalizedEmail);
      localStorage.setItem('manaratak_demo_role', role);

      // Detect environment to safely route the admin demo access
      let adminUrl = import.meta.env.VITE_ADMIN_URL;
      
      if (!adminUrl || adminUrl === '/admin') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          adminUrl = 'http://localhost:3001';
        } else {
          // We are in a hosted preview environment (like Google Studio) where port 3001 isn't available
          // Navigate to a safe same-origin fallback
          navigate('/admin');
          return;
        }
      }

      window.location.href = `${adminUrl}?auto_unlock=admin-demo`;
      return;
    }
```

## 3. Translation Dictionaries
**File:** `apps/web/src/i18n/en.ts`
```json
  "nav_admin": "Admin Portal",
  "admin_portal_access": "Admin Portal Access",
  "demo_admin_unlocked": "Demo admin credentials unlocked successfully.",
  "admin_portal_external": "The Admin Portal is hosted externally. Click below to proceed.",
  "open_admin_portal": "Open Admin Portal",
  "admin_portal_local_desc": "The Admin Portal is a separate React application (@manaratak/admin).",
```
**File:** `apps/web/src/i18n/ar.ts`
```json
  "nav_admin": "لوحة التحكم",
```
*Note:* The additional keys (`admin_portal_access`, etc.) are currently missing from `ar.ts` because the previous `sed` injection failed to match an anchor string.

## 4. App Provider Setup
**File:** `apps/web/src/App.tsx`
```tsx
export function App() {
  return (
    <I18nProvider>
      <ThemeProvider defaultTheme="system">
        <RTLProvider>
          <AppRouter />
        </RTLProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
```

## 5. Header / Footer Layout (AppShell Usage)
**File:** `packages/ui/src/index.tsx`
```tsx
export const AppShell = ({header, children, footer}: any) => <div className="flex flex-col min-h-screen">{header}<main className="flex-1">{children}</main>{footer}</div>;
```
**File:** `apps/web/src/router/index.tsx` (in `RootLayout`)
```tsx
        <>
          <div className="bg-slate-50 border-b px-4 py-1.5 text-center text-xs font-medium text-slate-500">
            <a href={import.meta.env.VITE_ADMIN_URL || 'http://localhost:3001'} className="hover:text-slate-900 transition-colors flex items-center justify-center gap-1" target="_blank" rel="noopener noreferrer">
              <span>{t('nav_admin')}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
          ...
```

## 6. Current Behavior Analysis
**Why translation keys are appearing instead of text:**
The default language for MANARATAK 2.0 is Arabic (`ar`), which uses `ar.ts`. The new translation keys (`admin_portal_access`, etc.) were successfully added to `en.ts` but the text replacement failed on `ar.ts`. Because `t(key)` in `I18nProvider.tsx` is defined as `dictionaries[language][key] || key`, falling back to Arabic returns undefined for those keys, causing the raw key string to be rendered.

**Why `/admin` only shows instructions instead of opening the dashboard:**
The app explicitly checks if `VITE_ADMIN_URL` is an external domain (`hasExternalAdminUrl`). If it's set to `/admin` or left blank in a non-localhost environment, `hasExternalAdminUrl` evaluates to false. This intentionally triggers the instructional fallback layout instead of looping the user back to `/admin` or navigating to a dead port.

**Is apps/admin running separately in Google Studio?**
No. `package.json`'s root `dev` script is set to `"npm run dev -w @manaratak/web"`. When Google Studio boots the preview, it only spins up the `apps/web` Vite server on port 3000. `apps/admin` (configured for port 3001) is not running in the background, and even if it were, Google Studio's reverse proxy only exposes port 3000 to the browser.
