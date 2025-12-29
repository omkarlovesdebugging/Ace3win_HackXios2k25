# 🔧 LinkShield Troubleshooting Guide

## Issue: "Backend Offline" on Google/GitHub but works on other sites

### Possible Causes:

1. **Mixed Content Policy**: Chrome blocks HTTP requests from HTTPS pages
2. **Content Security Policy (CSP)**: Some sites have strict CSP that blocks localhost requests
3. **Extension Permissions**: Missing permissions for certain domains
4. **Network Timing**: Trusted domains might have different network conditions

### Debugging Steps:

#### Step 1: Check Browser Console
1. Open the LinkShield popup on Google.com
2. Right-click in the popup and select "Inspect"
3. Go to the Console tab
4. Run: `debugLinkShield()`
5. Look for error messages

#### Step 2: Test Backend Directly
```bash
# Test if backend is running
curl http://127.0.0.1:8000/health

# Test Google.com analysis
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'
```

#### Step 3: Check Extension Permissions
1. Go to `chrome://extensions/`
2. Find LinkShield
3. Click "Details"
4. Ensure "Allow access to file URLs" is enabled
5. Check that site access is set to "On all sites"

#### Step 4: Reload Extension
1. Go to `chrome://extensions/`
2. Find LinkShield
3. Click the refresh icon
4. Test again

### Solutions:

#### Solution 1: Use HTTPS Backend (Recommended for Production)
```bash
# Install SSL certificate tools
pip install uvicorn[standard]

# Run with HTTPS (requires SSL certificate)
uvicorn main:app --host 127.0.0.1 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
```

#### Solution 2: Add Exception for Localhost
Add this to your manifest.json:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; connect-src 'self' http://127.0.0.1:8000; object-src 'self'"
  }
}
```

#### Solution 3: Use Background Script for API Calls
Move API calls to background.js instead of popup.js to avoid CSP restrictions.

#### Solution 4: Temporary Chrome Flag (Development Only)
1. Close Chrome completely
2. Start Chrome with: `chrome --disable-web-security --user-data-dir=/tmp/chrome_dev`
3. Test the extension

### Quick Fixes:

#### Fix 1: Increase Timeout
The issue might be that trusted domains take longer to process. The updated popup.js now has a 10-second timeout.

#### Fix 2: Check Network Tab
1. Open popup on Google.com
2. Open DevTools (F12)
3. Go to Network tab
4. Click "Scan Current Site"
5. Look for failed requests to localhost:8000

#### Fix 3: Test with Different URLs
Try these URLs to isolate the issue:
- `http://google.com` (HTTP version)
- `https://example.com` (Different HTTPS site)
- `http://httpbin.org/get` (Test HTTP site)

### Advanced Debugging:

#### Enable Verbose Logging
Add this to popup.js for more detailed logs:
```javascript
// Add at the top of popup.js
console.log("🛡️ LinkShield popup loaded");
window.addEventListener('error', (e) => {
  console.error('🚨 Popup error:', e);
});
```

#### Check Background Script Logs
1. Go to `chrome://extensions/`
2. Find LinkShield
3. Click "service worker" link
4. Check console for background script errors

### Still Having Issues?

1. **Check if backend is actually running**: `netstat -an | grep 8000`
2. **Test with curl**: `curl -v http://127.0.0.1:8000/health`
3. **Check Chrome version**: Some versions have stricter security policies
4. **Try Firefox**: Test if the issue is Chrome-specific
5. **Check antivirus/firewall**: Some security software blocks localhost requests

### Expected Behavior:

✅ **Working**: Extension shows "Website Appears Safe" for Google/GitHub  
❌ **Broken**: Extension shows "Scanner Offline" for Google/GitHub  
✅ **Working**: Backend logs show successful analysis for all domains  

If you're still experiencing issues, check the console logs and compare the network requests between working and non-working sites.