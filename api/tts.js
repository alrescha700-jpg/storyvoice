
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { text, voice, apiKey } = req.body || {};

    if (!apiKey || !text) {
      return res.status(400).json({
        error: "API Key dan teks wajib diisi."
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: "Maksimal 5000 karakter per bagian."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: text
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice || "Kore"
                }
              }
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API gagal."
      });
    }

    const audio = data.candidates?.[0]?.content?.parts
      ?.find(part => part.inlineData)?.inlineData;

    if (!audio) {
      return res.status(500).json({
        error: "Audio tidak ditemukan dalam respons Gemini."
      });
    }

    return res.status(200).json({
      audio: audio.data,
      mimeType: audio.mimeType
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server."
    });
  }
}
