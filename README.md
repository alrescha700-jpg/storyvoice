# StoryVoice Gemini TTS

## Deploy
1. Upload the project contents to the root of your GitHub repository.
2. Import/redeploy the repository on Vercel.
3. Open the deployed app and paste your Google AI Studio API key into the API Key field.
4. Enter a short test text and generate audio.

## API key handling
The key entered in the UI is held only in the current page memory and sent over HTTPS in each request to `/api/tts`. It is not written to localStorage, cookies, source files, or logs by this app. Refreshing the page clears the field. The Vercel function uses the supplied key for that request. Do not share your key or use the app on an untrusted device.

An optional `GEMINI_API_KEY` Vercel Environment Variable remains supported as a fallback, but is not required when the user enters a key in the app.

## Free usage
Google AI Studio free-tier availability, model access, quotas, and rate limits are controlled by Google and may change. Long scripts are split into sequential requests; they are not unlimited and may take time.
