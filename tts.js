const MODEL = 'gemini-3.8-flash-lite-tts';
const VOICES = new Set([
  'Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede','Callirrhoe','Autonoe',
  'Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi',
  'Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird',
  'Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat'
]);
const wait = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method tidak diizinkan.' });
  const { text, voice = 'Kore', language = 'auto', style = '', apiKey = '' } = req.body || {};
  // Prefer a per-session key supplied by the UI; never persist or log it.
  const key = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : process.env.GEMINI_API_KEY;
  if (!key) return res.status(401).json({ error: 'Masukkan Google AI Studio API Key terlebih dahulu.' });
  if (key.length > 300) return res.status(400).json({ error: 'Format API Key tidak valid.' });
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Teks kosong.' });
  if (text.length > 3000) return res.status(400).json({ error: 'Satu bagian maksimal 3.000 karakter.' });
  if (!VOICES.has(voice)) return res.status(400).json({ error: 'Pilihan suara tidak valid.' });
  if (!['auto','en','id'].includes(language)) return res.status(400).json({ error: 'Pilihan bahasa tidak valid.' });
  const safeStyle = typeof style === 'string' ? style.slice(0, 350) : '';
  const languageInstruction = language === 'id' ? 'Speak fluent natural Bahasa Indonesia with clear Indonesian pronunciation.' : language === 'en' ? 'Speak fluent natural English with a clear, natural English accent.' : 'Detect the language of the transcript and speak it naturally. For Indonesian, use fluent natural Bahasa Indonesia pronunciation; for English, use natural English pronunciation.';
  const input = `You are a professional audiobook narrator. ${languageInstruction} ${safeStyle ? `Delivery direction: ${safeStyle}.` : 'Use a warm, clear storytelling delivery at a natural pace.'}\n\nRead the following transcript verbatim. Do not translate, summarize, add, or omit words:\n\n${text}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 52000);
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] }
      }),
      signal: controller.signal
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      let message = raw.slice(0, 900);
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.error?.message || message;
      } catch {}
      const status = upstream.status === 429 ? 429 : upstream.status === 400 ? 400 : 502;
      return res.status(status).json({ error: upstream.status === 429 ? 'Kuota atau batas permintaan Gemini tercapai. Tunggu hingga kuota tersedia kembali.' : `Gemini API (${upstream.status}): ${message}` });
    }
    let data;
    try { data = JSON.parse(raw); } catch { return res.status(502).json({ error: 'Respons Gemini tidak dapat dibaca.' }); }
    const audioBase64 = data?.output_audio?.data || data?.steps?.flatMap(s => s.content || []).find(c => c.type === 'audio')?.data;
    if (!audioBase64) return res.status(502).json({ error: 'Gemini tidak mengembalikan audio. Coba ulangi bagian ini.' });
    const audio = Buffer.from(audioBase64, 'base64');
    if (audio.length < 100 || audio.toString('ascii', 0, 4) !== 'RIFF') return res.status(502).json({ error: 'Format audio dari Gemini tidak dikenali sebagai WAV.' });
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('X-Audio-Model', MODEL);
    res.setHeader('Content-Length', String(audio.length));
    return res.status(200).send(audio);
  } catch (error) {
    const msg = error?.name === 'AbortError' ? 'Permintaan ke Gemini melewati batas waktu server. Coba gunakan potongan teks lebih pendek.' : (error?.message || 'Kesalahan server tidak diketahui.');
    return res.status(504).json({ error: msg });
  } finally {
    clearTimeout(timeout);
  }
}
