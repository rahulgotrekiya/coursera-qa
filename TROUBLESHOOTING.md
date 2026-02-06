# TROUBLESHOOTING GUIDE

## 🆕 New in v2.0 - AI Features

### API Key Issues

#### ❌ "Invalid API key format"

**Solution:**

- Gemini API keys must start with `AIzaSy`
- Get a new key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure there are no spaces before/after the key
- Copy directly from Google AI Studio, don't type it

#### ❌ "Failed to get AI response"

**Solution:**

1. Check your internet connection
2. Verify your API key is valid
3. Check if you've exceeded free tier limits:
   - 15 requests/minute
   - 1,500 requests/day
4. Try regenerating your API key
5. Wait a few minutes and try again

#### ❌ "API key invalid" error

**Solution:**

- Your key may have been revoked or deleted
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Delete old key and create a new one
- Update in extension settings

#### ❌ Green dot not showing after saving API key

**Solution:**

- Refresh the extension popup (close and reopen)
- Check if key was actually saved (click Change to verify)
- Try saving again
- Restart browser if issue persists

---

## 🔧 Common Extension Issues

### 1. Extension doesn't appear after installation

**Solution:**

- Go to `chrome://extensions/` or `brave://extensions/`
- Make sure "Developer mode" is turned ON (top-right)
- Check if the extension is in the list and ENABLED
- Look for the extension icon in the toolbar

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
- Scroll down to ensure all questions are loaded
- Some pages might have a different structure

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
- Open an issue on GitHub with the prompt text
- Manually add new patterns to `content.js`

---

## 🤖 AI Response Issues

### ❌ AI gives incomplete answers

**Possible causes:**

- Token limit reached (very long quizzes)
- Network interruption
- API timeout

**Solutions:**

- Try copying fewer questions at once
- Check your internet connection
- Refresh and try again

### ❌ AI answers seem incorrect

**Remember:**

- AI can make mistakes
- Always verify answers
- Use explanations to learn, not just copy
- Cross-reference with course materials

**Solutions:**

- Ask for clarification in the AI output
- Compare with course notes
- Understand the reasoning, don't just trust blindly

### ❌ "Quota exceeded" error

**Solution:**

- You've hit the free tier limit:
  - 15 requests/minute
  - 1,500 requests/day
- Wait a few minutes/hours
- Monitor usage in [Google AI Studio](https://aistudio.google.com/)
- Consider upgrading if you need more (unlikely for normal use)

---

## 🔍 Debugging Steps

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
   - ✓ Permissions: activeTab, scripting, clipboardWrite, storage

### Test API connection:

1. Open popup
2. Click "Solve Questions"
3. Watch the Network tab in DevTools
4. Look for requests to `generativelanguage.googleapis.com`
5. Check for 200 OK status

---

## 🆘 Still Having Issues?

### Try these steps in order:

1. **Clear browser cache**
   - Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

2. **Disable other extensions temporarily**
   - Some extensions may conflict
   - Disable all except this one
   - Test if it works

3. **Restart your browser**
   - Completely close and reopen
   - Try the extension again

4. **Reinstall the extension**
   - Remove completely
   - Download fresh copy
   - Install again

5. **Check your browser version**
   - This requires Chrome/Brave 88+
   - Go to `chrome://version/` or `brave://version/`
   - Update if needed

6. **Test on a simple Coursera quiz**
   - Try a free course quiz first
   - Make sure you're logged into Coursera

---

## 📝 Reporting Issues

If nothing works, provide:

1. **Browser name and version**
   - From `chrome://version/`

2. **Error messages**
   - Full text of any errors
   - Screenshots help!

3. **Coursera page URL**
   - If not sensitive/private

4. **Console errors**
   - From DevTools → Console
   - Both popup and page console

5. **Steps to reproduce**
   - What you clicked
   - What happened
   - What you expected

6. **API key status**
   - Is it configured?
   - Green dot showing?
   - When was it created?

---

## 🔐 Privacy & Security Concerns

### "Is my API key safe?"

**Yes:**

- Stored in Chrome's encrypted local storage
- Never transmitted except to Google's API
- Not accessible by websites
- Not shared with anyone

### "Can Coursera detect this?"

**Technical answer:**

- Extension works client-side only
- Doesn't modify Coursera's pages
- Uses your browser normally
- Like copying manually

**Important:**

- Still respect academic policies
- Use for learning, not cheating
- Understand the ethical implications

---

## 💡 Performance Tips

1. **Scroll through quiz first**
   - Loads all questions before extracting
   - Ensures nothing is missed

2. **Close other tabs**
   - Reduces browser memory usage
   - Faster API responses

3. **Use "Copy Questions Only" for speed**
   - Faster than AI solving
   - No API call needed
   - Good for quick text extraction

4. **Monitor API usage**
   - Check Google AI Studio dashboard
   - Stay within free tier limits

---

## 🆕 Version-Specific Issues

### Upgrading from v1.0 to v2.0

1. **Remove old version**
   - Go to chrome://extensions/
   - Remove "Coursera Question Copier v1.0"

2. **Install new version**
   - Load v2.0 folder
   - Configure API key

3. **No data migration needed**
   - Fresh start with new features
   - API key stored separately

---

**Most issues are solved by:**

1. ✓ Checking API key is configured correctly
2. ✓ Reloading the extension
3. ✓ Reloading the Coursera page
4. ✓ Checking you're on an actual quiz/assessment page
5. ✓ Verifying internet connection for AI features
