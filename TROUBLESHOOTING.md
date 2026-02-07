# TROUBLESHOOTING GUIDE

## 🆕 New in v3.0 - Auto-Submit Features

### Auto-Submit Issues

#### ❌ "Only some answers selected"

**Solution:**

- The extension filters for elements with 3-6 radio button options
- Make sure all questions are multiple choice with radio buttons
- Essay questions or other formats won't work
- Check browser console (F12) for detailed logs:
  ```
  Found X total input groups
  After filtering: Y actual quiz questions
  ```

#### ❌ "Wrong answers selected"

**Possible causes:**

- AI interpreted questions incorrectly
- Question extraction missed some context
- AI model gave incorrect answer

**Solution:**

1. Check the console for which answers were selected
2. AI answers are not 100% accurate - verify important submissions
3. Try running again - AI responses may vary
4. Use "Copy Questions Only" to review before submitting

#### ❌ "Submit button not found"

**Solution:**

- Make sure the quiz page is fully loaded
- The honor code checkbox must be visible on the page
- Check if the submit button has unusual styling
- Console will show: `"Looking for submit button..."` - check what follows

#### ❌ "Honor code checkbox not found"

**Solution:**

- Make sure there's a checkbox with text like "I understand that submitting..."
- Some quizzes may not have this checkbox
- The extension will still select answers even without it

#### ❌ "Confirmation dialog not handled"

**Solution:**

- The extension waits 3 seconds for the dialog to appear
- If dialog is slow to load, it might be missed
- Manually click the confirmation if needed
- Check console for: `"Looking for confirmation dialog submit button..."`

---

## 🔧 API Key Issues

### ❌ "Invalid API key format"

**Solution:**

- Gemini API keys must start with `AIzaSy`
- Get a new key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure there are no spaces before/after the key
- Copy directly from Google AI Studio, don't type it

### ❌ "Failed to get AI response"

**Solution:**

1. Check your internet connection
2. Verify your API key is valid
3. Check if you've exceeded free tier limits:
   - 15 requests/minute
   - 1,500 requests/day
4. Try regenerating your API key
5. Wait a few minutes and try again

### ❌ "API key invalid" error

**Solution:**

- Your key may have been revoked or deleted
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Delete old key and create a new one
- Update in extension settings

### ❌ Green dot not showing after saving API key

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
- Quiz pages must have multiple choice questions with radio buttons
- Refresh the page (F5 or Ctrl+R)
- Wait for the page to fully load before clicking the extension
- Scroll down to ensure all questions are loaded

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

---

## 🤖 AI Response Issues

### ❌ AI gives incomplete answers

**Possible causes:**

- Token limit reached (very long quizzes)
- Network interruption
- API timeout

**Solutions:**

- Try a quiz with fewer questions
- Check your internet connection
- Refresh and try again

### ❌ "Quota exceeded" error

**Solution:**

- You've hit the free tier limit:
  - 15 requests/minute
  - 1,500 requests/day
- Wait a few minutes/hours
- Monitor usage in [Google AI Studio](https://aistudio.google.com/)

---

## 🔍 Debugging Steps

### Check the console for detailed logs:

1. On Coursera page, press F12 to open DevTools
2. Go to Console tab
3. Click "Solve & Submit Assignment"
4. Look for these messages:

```
Starting question extraction...
Found X form control groups
After filtering: Y actual quiz questions
Extracted Y questions total

Attempting to select answers: ['A', 'B', 'C']
Processing question 1, answer: A
Clicked input for answer A on question 1

Looking for honor code checkbox...
Found honor code checkbox, clicking it...

Looking for submit button...
Submit button found and enabled: Submit

Looking for confirmation dialog submit button...
```

### Common console warnings:

- `"Warning: Found X questions but have Y answers"` - Mismatch between detected questions and AI answers
- `"Submit button not found"` - Submit button has unusual structure
- `"No confirmation dialog found"` - Confirmation dialog didn't appear or was already handled

### Verify permissions:

1. Go to `chrome://extensions/`
2. Click "Details" on the extension
3. Make sure it has:
   - ✓ Site access: On coursera.org
   - ✓ Permissions: activeTab, scripting, clipboardWrite, storage

---

## 🆘 Still Having Issues?

### Try these steps in order:

1. **Reload extension**
   - Go to chrome://extensions/
   - Click reload button on the extension

2. **Refresh Coursera page**
   - F5 or Ctrl+R

3. **Clear browser cache**
   - Settings → Privacy → Clear browsing data

4. **Restart browser**
   - Close and reopen completely

5. **Reinstall extension**
   - Remove and install fresh copy

---

## 📝 Reporting Issues

If nothing works, provide:

1. **Browser name and version** - From `chrome://version/`
2. **Console output** - Full logs from F12 → Console
3. **Error messages** - Screenshots help!
4. **Coursera page URL** - If not sensitive/private
5. **Steps to reproduce** - What you clicked and what happened

---

## 🔐 Privacy & Security

### "Is my API key safe?"

**Yes:**
- Stored in Chrome's encrypted local storage
- Never transmitted except to Google's API
- Not accessible by websites
- Not shared with anyone

### "Can Coursera detect this?"

**Technical answer:**
- Extension works client-side only
- Clicks are performed like normal user clicks
- No server-side detection is triggered

**Important:**
- Still respect academic policies
- Use for learning, not cheating
- Understand the ethical implications

---

## 🆕 Version-Specific Issues

### Upgrading from v2.0 to v3.0

1. **Remove old version**
   - Go to chrome://extensions/
   - Remove old version

2. **Install new version**
   - Load v3.0 folder
   - API key should still be saved

3. **New button name**
   - "Solve Questions" is now "Solve & Submit Assignment"
   - Same key, now with auto-submit!

---

**Most issues are solved by:**

1. ✓ Checking API key is configured correctly
2. ✓ Reloading the extension
3. ✓ Reloading the Coursera page
4. ✓ Checking you're on an actual quiz page with radio buttons
5. ✓ Checking browser console for detailed error messages
