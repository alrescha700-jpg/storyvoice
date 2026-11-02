
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

    if (!apiKey || !text || !text.trim()) {
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
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-tts-preview",
          input: text,
          response_format: {
            type: "audio"
          },
          generation_config: {
            speech_config: [
              { voice: voice || "Kore" }
            ]
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

    const audioBase64 = data.output_audio?.data;

    if (!audioBase64) {
      return res.status(500).json({
        error: "Audio tidak ditemukan dalam respons Gemini."
      });
    }

    const pcm = Buffer.from(audioBase64, "base64");

    const header = Buffer.alloc(44);
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    const wav = Buffer.concat([header, pcm]);

    return res.status(200).json({
      audio: wav.toString("base64"),
      mimeType: "audio/wav"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server."
    });
  }
}
