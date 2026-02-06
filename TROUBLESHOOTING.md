# TROUBLESHOOTING GUIDE

## ✅ Fixed Issues:

### ❌ Error: "Cannot read properties of undefined (reading 'executeScript')"
**Status:** FIXED ✓
**Solution:** Added `scripting` permission to manifest and switched to message passing approach

### ❌ Error: "Could not establish connection. Receiving end does not exist"
**Status:** FIXED ✓
**Solution:** Added automatic fallback - extension now injects code directly if content script isn't loaded
**What this means:** Extension now works even without reloading the page after installation!

---

## 🔧 Common Issues & Solutions:

### 1. Extension doesn't appear after installation
**Solution:**
- Go to `chrome://extensions/` or `brave://extensions/`
- Make sure "Developer mode" is turned ON (top-right)
- Check if the extension is in the list and ENABLED
- Look for the extension icon in the toolbar (might be in the extensions menu)

### 2. "This extension only works on Coursera pages"
**Solution:**
- Make sure you're on a URL containing `coursera.org`
- Example: `https://www.coursera.org/learn/...`
- Reload the page after installing the extension

### 3. "No questions found on this page"
**Solutions:**
- Make sure you're on a QUIZ or ASSESSMENT page, not a video/reading page
- Refresh the page (F5 or Ctrl+R)
- Wait for the page to fully load before clicking the extension
- Some pages might have a different structure - try scrolling to see all questions first

### 4. Extension icon doesn't work / No popup appears
**Solutions:**
1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the reload icon (circular arrow) for this extension
   
2. **Reinstall the extension:**
   - Remove the extension
   - Close and reopen browser
   - Reinstall using "Load unpacked"

3. **Check for errors:**
   - Right-click the extension icon
   - Select "Inspect popup"
   - Check the Console tab for errors

### 5. Questions copy but prompts are still there
**Solution:**
- The extension might need updating for new prompt patterns
- Open an issue and share the prompt text
- You can manually add new patterns to `content.js`

### 6. "Could not establish connection. Receiving end does not exist"
**Solution:**
- Reload the Coursera page
- The content script might not have loaded yet
- Wait a few seconds and try again

---

## 🔍 How to Debug:

### Check if content script is loaded:
1. On Coursera page, press F12 to open DevTools
2. Go to Console tab
3. Look for: "Coursera Question Copier extension loaded"
4. If not present, reload the page

### Check extension popup errors:
1. Right-click extension icon
2. Click "Inspect popup"
3. Check Console tab for any red errors
4. Share these errors if you need help

### Verify permissions:
1. Go to `chrome://extensions/`
2. Click "Details" on the extension
3. Make sure it has:
   - ✓ Site access: On coursera.org
   - ✓ Permissions: activeTab, scripting, clipboardWrite

---

## 🆘 Still Having Issues?

1. **Try these steps in order:**
   - Clear browser cache
   - Disable other extensions temporarily
   - Restart your browser
   - Reinstall the extension

2. **Check your browser version:**
   - This requires Chrome/Brave 88+
   - Go to `chrome://version/` or `brave://version/`

3. **Test on a simple Coursera quiz:**
   - Try a free course quiz first
   - Make sure you're logged into Coursera

---

## 📝 Reporting Issues:

If nothing works, provide:
- Browser name and version
- Full error message (if any)
- Coursera page URL (if not sensitive)
- Screenshot of the extension popup
- Console errors (from DevTools)

---

**Most issues are solved by:**
1. Reloading the extension
2. Reloading the Coursera page
3. Checking you're on an actual quiz/assessment page
