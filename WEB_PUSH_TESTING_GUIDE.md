# Web Push Notifications - Testing Guide

## Prerequisites

⚠️ **Important**: Push notifications require HTTPS (or localhost) to work. Service workers and push APIs are only available in secure contexts.

### Required:
- ✅ HTTPS connection (or `localhost`/`127.0.0.1`)
- ✅ Modern browser (Chrome, Firefox, Edge, Safari 16+)
- ✅ Backend API running with web-push endpoints configured
- ✅ VAPID keys generated and configured on backend

## Quick Start Testing

### 1. Start Your Development Server

```bash
# Development mode (Vite dev server)
npm run dev

# Or production build
npm run build
npm run preview
```

### 2. Access via HTTPS or Localhost

- ✅ `http://localhost:5173` (Vite default)
- ✅ `https://localhost:5173` (if configured)
- ✅ `https://your-domain.com` (production)

### 3. Open Browser DevTools

1. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Check **Service Workers** section

## Step-by-Step Testing

### Test 1: Service Worker Registration

1. Open your app in the browser
2. Open DevTools → **Application** tab → **Service Workers**
3. You should see:
   - ✅ Service worker registered at `/sw.js`
   - ✅ Status: **activated and running**
   - ✅ Scope: `/`

**If not working:**
- Check console for errors
- Verify `public/sw.js` exists
- Check network tab for 404 errors

### Test 2: Check Browser Support

1. Open browser console (`F12`)
2. Run this command:
   ```javascript
   'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
   ```
3. Should return: `true`

### Test 3: Get VAPID Public Key

1. Open browser console
2. Make sure you're logged in (or test endpoint doesn't require auth)
3. Run:
   ```javascript
   fetch('/api/notifications/vapid-public-key')
     .then(r => r.json())
     .then(console.log)
   ```
4. Should return: `{ publicKey: "..." }`

### Test 4: Subscribe to Push Notifications

1. Navigate to **Settings** page
2. Go to **Notifications & Security** tab
3. Find **Browser Notifications** toggle
4. Enable the toggle
5. Browser will prompt for permission → Click **Allow**
6. Check console for success messages

**Expected behavior:**
- ✅ Permission prompt appears
- ✅ After allowing, subscription is created
- ✅ Settings saved successfully
- ✅ No errors in console

### Test 5: Verify Subscription

1. Open DevTools → **Application** tab
2. Go to **Service Workers** → Click **Push** button (if available)
3. Or check in console:
   ```javascript
   navigator.serviceWorker.ready.then(reg => 
     reg.pushManager.getSubscription().then(sub => console.log(sub))
   )
   ```
4. Should show subscription object with `endpoint` and `keys`

### Test 6: Test Notification (Backend Endpoint)

1. In Settings page, click **Test Notification** button
2. Or use API directly:
   ```javascript
   fetch('/api/notifications/test', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN',
       'Content-Type': 'application/json'
     }
   })
   ```
3. You should receive a notification!

### Test 7: Background Notification

1. Subscribe to notifications (Test 4)
2. Minimize the browser or switch tabs
3. Send a test notification from backend
4. Notification should appear even when app is in background

### Test 8: Notification Click

1. Receive a notification
2. Click on it
3. Browser should:
   - ✅ Focus/open the app
   - ✅ Navigate to the URL specified in notification data

## Browser DevTools Checks

### Chrome DevTools

1. **Application Tab**:
   - Service Workers: Check registration
   - Storage → Local Storage: Check for `pushSubscription`
   - Background Sync: (if used)

2. **Console Tab**:
   - Look for `[WebPush]` or `[SW]` log messages
   - Check for errors

3. **Network Tab**:
   - Filter by `notifications`
   - Check API calls to `/notifications/*` endpoints
   - Verify status codes (200, 201, etc.)

### Firefox DevTools

1. **Storage Tab**:
   - Service Workers: Check registration
   - Local Storage: Check for `pushSubscription`

2. **Console Tab**:
   - Check for log messages and errors

3. **Network Tab**:
   - Monitor API requests

## Common Issues & Solutions

### Issue: "Service worker registration failed"

**Solutions:**
- ✅ Ensure you're on HTTPS or localhost
- ✅ Check that `public/sw.js` exists
- ✅ Verify file permissions
- ✅ Clear browser cache and hard refresh (`Ctrl+Shift+R`)

### Issue: "Push notifications are not supported"

**Solutions:**
- ✅ Use modern browser (Chrome 42+, Firefox 44+, Edge 17+)
- ✅ Ensure HTTPS (not HTTP, except localhost)
- ✅ Check browser settings allow notifications

### Issue: "Permission denied"

**Solutions:**
- ✅ Reset notification permissions in browser settings
- ✅ For Chrome: `chrome://settings/content/notifications`
- ✅ Remove site from blocked list
- ✅ Try in incognito/private mode

### Issue: "Failed to get VAPID public key"

**Solutions:**
- ✅ Verify backend is running
- ✅ Check API endpoint: `GET /notifications/vapid-public-key`
- ✅ Verify CORS settings
- ✅ Check network tab for 404/500 errors

### Issue: "Subscription failed"

**Solutions:**
- ✅ Check VAPID key format (should be base64 URL-safe)
- ✅ Verify backend accepts subscription format
- ✅ Check console for detailed error messages
- ✅ Ensure user is authenticated (if required)

### Issue: "Notifications not appearing"

**Solutions:**
- ✅ Check browser notification settings (not blocked)
- ✅ Verify service worker is active
- ✅ Check console for errors
- ✅ Test with backend `/notifications/test` endpoint
- ✅ Verify notification payload format from backend

## Testing Checklist

- [ ] Service worker registers successfully
- [ ] Browser supports push notifications
- [ ] VAPID public key retrieved successfully
- [ ] Permission granted by user
- [ ] Subscription created and saved to backend
- [ ] Subscription stored in browser
- [ ] Test notification received
- [ ] Background notification works
- [ ] Notification click navigates correctly
- [ ] Unsubscribe works correctly

## Manual Testing Script

You can paste this in browser console to test step-by-step:

```javascript
// Test 1: Check support
console.log('Push supported:', 'serviceWorker' in navigator && 'PushManager' in window);

// Test 2: Check service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs.length);
  regs.forEach(reg => console.log('SW:', reg.scope, reg.active?.state));
});

// Test 3: Get VAPID key
fetch('/api/notifications/vapid-public-key')
  .then(r => r.json())
  .then(data => console.log('VAPID Key:', data.publicKey?.substring(0, 20) + '...'))
  .catch(err => console.error('VAPID Error:', err));

// Test 4: Check current subscription
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('Current subscription:', {
        endpoint: sub.endpoint.substring(0, 50) + '...',
        hasKeys: !!sub.getKey('p256dh')
      });
    } else {
      console.log('No subscription found');
    }
  })
);

// Test 5: Check notification permission
console.log('Notification permission:', Notification.permission);
```

## Production Testing

Before deploying:

1. ✅ Test on HTTPS (not just localhost)
2. ✅ Test on multiple browsers
3. ✅ Test on mobile browsers
4. ✅ Verify VAPID keys are production keys
5. ✅ Test unsubscribe flow
6. ✅ Test with multiple users
7. ✅ Monitor error logs

## Next Steps

After successful testing:
- Remove old Firebase code (optional cleanup)
- Update documentation
- Set up monitoring for push notification delivery
- Configure production VAPID keys

