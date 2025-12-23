# How to Get Google OAuth Client ID and Secret

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console
1. Open your web browser and go to: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. At the top of the page, click on the project dropdown (next to "Google Cloud")
2. Either:
   - **Create New Project**: Click "NEW PROJECT", give it a name like "Lesson Booking App", then click "CREATE"
   - **Select Existing Project**: Choose an existing project from the list

### Step 3: Enable Google Calendar API
1. In the left sidebar, go to **"APIs & Services" > "Library"**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" from the results
4. Click the **"ENABLE"** button

### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account)
3. Fill in the required fields:
   - **App name**: "Lesson Booking App" (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact email**: Your email address
4. Click **"SAVE AND CONTINUE"**
5. On the "Scopes" page, click **"SAVE AND CONTINUE"** (we'll add scopes later)
6. On the "Test users" page, click **"SAVE AND CONTINUE"**

### Step 5: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth 2.0 Client IDs"**
4. Choose **"Web application"** as the application type
5. Give it a name like "Lesson Booking OAuth Client"
6. In **"Authorized redirect URIs"**, click "ADD URI" and enter:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
7. Click **"CREATE"**

### Step 6: Copy Your Credentials
After creating the OAuth client, a popup will show your credentials:

1. **Copy the Client ID** - it looks like:
   ```
   123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com
   ```

2. **Copy the Client Secret** - it looks like:
   ```
   GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz12
   ```

### Step 7: Update Your .env File
Open your `.env` file and replace the placeholder values:

```bash
# Replace these lines:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# With your actual credentials:
GOOGLE_CLIENT_ID=123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz12
```

### Step 8: Restart Your Server
```bash
npm start
```

### Step 9: Test the OAuth Connection
1. Go to your lesson booking app
2. Navigate to the instructor calendar settings
3. Click "Connect with Google"
4. You should now see the Google consent screen instead of a 400 error!

## What Your Credentials Look Like

**Client ID Format:**
- Always ends with `.apps.googleusercontent.com`
- Example: `123456789012-randomletters.apps.googleusercontent.com`

**Client Secret Format:**
- Always starts with `GOCSPX-`
- Example: `GOCSPX-RandomLettersAndNumbers`

## Security Notes

⚠️ **Important**: Never share or commit these credentials to version control!

- Keep your `.env` file secure
- Don't post credentials in forums or chat
- Use different credentials for development and production
- If you accidentally expose them, revoke and regenerate new ones

## Troubleshooting

### "App not verified" warning
- This is normal for new apps in development
- Click "Advanced" → "Go to [Your App Name] (unsafe)" to proceed
- For production, you'll need to verify your app with Google

### "redirect_uri_mismatch" error
- Make sure you added `http://localhost:3000/api/auth/google/callback` to authorized redirect URIs
- Check that the URL exactly matches (no trailing slashes, correct port)

### Credentials not working
- Double-check you copied the full Client ID and Secret
- Make sure there are no extra spaces or line breaks
- Verify the Google Calendar API is enabled

## Next Steps

Once you have the credentials set up:
1. Test the OAuth connection in your app
2. Users can now connect their Google Calendars with just a few clicks
3. No more manual sharing or service account setup required!