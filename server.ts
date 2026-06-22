import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set wide limits to accommodate speech audio and video files
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Check Gemini Keys
  app.get("/api/config-check", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      hasGeminiKey: hasKey,
    });
  });

  // API Route: Transcribe speech audio with Turkish spelling and grammar rules + structured timestamps
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType, fileName } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Sistemde GEMINI_API_KEY tanımlı değil! Lütfen 'Settings > Secrets' panelinden ekleyin.",
        });
      }

      if (!audioData) {
        return res.status(400).json({
          error: "Eksik parametre: audioData gönderilmedi.",
        });
      }

      // Safe normalization of MIME type for stable Gemini API processing
      let resolvedMime = mimeType || "";
      const ext = (fileName || "").toLowerCase().split('.').pop() || "";

      if (!resolvedMime) {
        if (["mp3", "mpeg"].includes(ext)) resolvedMime = "audio/mp3";
        else if (ext === "wav") resolvedMime = "audio/wav";
        else if (ext === "m4a") resolvedMime = "audio/m4a";
        else if (ext === "aac") resolvedMime = "audio/aac";
        else if (ext === "flac") resolvedMime = "audio/flac";
        else if (ext === "ogg") resolvedMime = "audio/ogg";
        else if (ext === "mp4") resolvedMime = "video/mp4";
        else if (ext === "mov") resolvedMime = "video/quicktime";
        else if (ext === "webm") resolvedMime = "video/webm";
        else resolvedMime = "audio/mp3"; // generic fallback
      } else {
        if (resolvedMime === "audio/x-m4a" || resolvedMime === "audio/x-mp4") {
          resolvedMime = "audio/m4a";
        }
        if (resolvedMime === "audio/mpeg") {
          resolvedMime = "audio/mp3";
        }
      }

      // Initialize Gemini Client inside the handler to prevent crashing if the key is empty on start
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const audioPart = {
        inlineData: {
          mimeType: resolvedMime,
          data: audioData,
        },
      };

      const systemInstruction = `Sen profesyonel bir altyazı editörü ve uzman bir Türkçe dilbilimci/filologsun.
Sana gönderilen Türkçe ses kaydını dinle ve mükemmel bir altyazı dosyası oluşturabilmek için küçük zaman dilimlerine (tercihen her biri en fazla 3-6 kelimelik anlam bütünlüğüne sahip kısa öbekler olacak şekilde) bölerek transkribe et.

Uyman Gereken Kritik Kurallar:
1. Türkçe Yazım Kuralları (TDK):
   - Özel isimlerin baş harflerini her zaman büyük yaz. Kelime eklerini kesme işaretiyle (') ayır (Örn: "İstanbul'da", "Ahmet'e", "Premiere Pro'nun", "Mustafa Kemal").
   - Bağlaç olan "da/de" ve "ki" kelimelerini her zaman ayrı yaz (Örn: "Sen de gelebilirsin.", "Öyle bir şey ki..."). Ek olan "-da/-de/-ta/-te" ve sıfat yapan "-ki"yi ise bitişik yaz (Örn: "Bende kalsın", "Masadaki kitap").
   - Soru ekleri olan "mı/mi/mu/müyü" kendinden önceki kelimeden ayrı, kendinden sonraki eklerle bitişik yaz (Örn: "Gelecek misin?", "Hazır mısınız?", "Benimle mi?").
   - "şey" kelimesini her zaman kendinden önceki ve sonraki kelimelerden ayrı yaz (Örn: "bir şey", "her şey", "hiçbir şey").
2. Noktalama İşaretleri:
   - Cümle sonlarına mutlaka uygun noktalamayı koy: nokta (.), soru soruluyorsa soru işareti (?), şaşkınlık/uyarı varsa (!) koy.
   - Doğal konuşma esnasındaki duraksamalara veya nefes alımlarına denk gelen anlamlı yerlere virgül (,) ekleyerek akıcılığı artır.
3. Dolgu Kelimelerin Temizlenmesi (Linguistic Cleaning):
   - Konuşmacıların "ııı", "eee", "şey" (duraksama dolgusu olarak), "aa", "hm" gibi duraksama ve dolgu kelimelerini / seslerini TRANSKRİPSİYONA ASLA EKLEME. Bunları tamamen temizle.
4. Hassas Zamanlama (Timestamps):
   - Her altyazı bloğunun başlangıç (start) ve bitiş (end) saniyelerini son derece hassas tespit et.
   - Zamanlamaları saniye cinsinden ondalıklı sayı olarak ver (Örn: start: 1.25, end: 4.3).
   - Zamanlama aralıkları arasında boşluklar olabilir (sessizlik anlarında), ancak altyazılar birbirinin üzerine çakışmamalıdır (bir altyazının start değeri, bir önceki altyazının end değerinden küçük olmamalıdır).

Subtitles dizisi altında bu kurallara uyan altyazı nesnelerini döndür.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          subtitles: {
            type: Type.ARRAY,
            description: "Transkribe edilmiş ve zamanlanmış Türkçe altyazı bloklarının listesi.",
            items: {
              type: Type.OBJECT,
              properties: {
                start: {
                  type: Type.NUMBER,
                  description: "Altyazı bloğunun başlangıç zamanı (saniye cinsinden, örn: 2.15)",
                },
                end: {
                  type: Type.NUMBER,
                  description: "Altyazı bloğunun bitiş zamanı (saniye cinsinden, örn: 5.40)",
                },
                text: {
                  type: Type.STRING,
                  description: "Bu zaman aralığında konuşulan, yazım kurallarına mükemmel uyumlu Türkçe metin.",
                },
              },
              required: ["start", "end", "text"],
            },
          },
        },
        required: ["subtitles"],
      };

      console.log(`Gemini API'ye gönderiliyor... Dosya Türü: ${resolvedMime}`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          audioPart,
          {
            text: "Lütfen yukarıdaki ses kaydını dinle ve tanımlanan kurallara göre kelimesi kelimesine Türkçe transkripsiyonu tamamlayarak JSON nesnesi olarak döndür.",
          },
        ],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.2, // Low temperature for maximum precision and factual spelling
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini'den boş bir yanıt alındı.");
      }

      console.log("Gemini yanıtı başarıyla alındı.");
      
      // Clean up markdown block quotes if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```[a-zA-Z]*\n/, "");
        cleanedText = cleanedText.replace(/\n```$/, "");
      }
      
      const parsedData = JSON.parse(cleanedText.trim());
      
      // Extract usage metadata if available or calculate reliable fallback
      let usage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };
      if (response.usageMetadata) {
        usage = {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0
        };
      } else {
        // Fallback estimate: Base prompt/instruction: ~2100 tokens. Voice base64 data density: ~280 tokens per second.
        const durationSeconds = (parsedData.subtitles && parsedData.subtitles.length > 0)
          ? Math.max(...parsedData.subtitles.map((s: any) => s.end))
          : 30;
        const estimatedPrompt = Math.ceil(durationSeconds * 280) + 2100;
        const estimatedCandidates = Math.ceil(cleanedText.length / 4) + 150;
        usage = {
          promptTokens: estimatedPrompt,
          candidatesTokens: estimatedCandidates,
          totalTokens: estimatedPrompt + estimatedCandidates
        };
      }

      res.json({
        subtitles: parsedData.subtitles || [],
        usage: usage
      });
    } catch (error: any) {
      console.error("Transkripsiyon hatası:", error);
      res.status(500).json({
        error: "Ses analizi ve transkripsiyon esnasında bir hata oluştu.",
        details: error.message || error,
      });
    }
  });

  // Serve static assets and Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite dev server modunda başlatılıyor...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Üretim (Production) modunda statik dosyalar sunuluyor...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Sunucu başlatma hatası:", err);
});
