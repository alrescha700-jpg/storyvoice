export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, provider: 'Google Gemini TTS', keyMode: 'session-input-supported', configured: Boolean(process.env.GEMINI_API_KEY) });
}
