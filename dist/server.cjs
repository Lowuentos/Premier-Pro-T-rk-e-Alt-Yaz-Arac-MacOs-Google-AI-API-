var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/config-check", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      hasGeminiKey: hasKey
    });
  });
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType, fileName } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Sistemde GEMINI_API_KEY tan\u0131ml\u0131 de\u011Fil! L\xFCtfen 'Settings > Secrets' panelinden ekleyin."
        });
      }
      if (!audioData) {
        return res.status(400).json({
          error: "Eksik parametre: audioData g\xF6nderilmedi."
        });
      }
      let resolvedMime = mimeType || "";
      const ext = (fileName || "").toLowerCase().split(".").pop() || "";
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
        else resolvedMime = "audio/mp3";
      } else {
        if (resolvedMime === "audio/x-m4a" || resolvedMime === "audio/x-mp4") {
          resolvedMime = "audio/m4a";
        }
        if (resolvedMime === "audio/mpeg") {
          resolvedMime = "audio/mp3";
        }
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const audioPart = {
        inlineData: {
          mimeType: resolvedMime,
          data: audioData
        }
      };
      const systemInstruction = `Sen profesyonel bir altyaz\u0131 edit\xF6r\xFC ve uzman bir T\xFCrk\xE7e dilbilimci/filologsun.
Sana g\xF6nderilen T\xFCrk\xE7e ses kayd\u0131n\u0131 dinle ve m\xFCkemmel bir altyaz\u0131 dosyas\u0131 olu\u015Fturabilmek i\xE7in k\xFC\xE7\xFCk zaman dilimlerine (tercihen her biri en fazla 3-6 kelimelik anlam b\xFCt\xFCnl\xFC\u011F\xFCne sahip k\u0131sa \xF6bekler olacak \u015Fekilde) b\xF6lerek transkribe et.

Uyman Gereken Kritik Kurallar:
1. T\xFCrk\xE7e Yaz\u0131m Kurallar\u0131 (TDK):
   - \xD6zel isimlerin ba\u015F harflerini her zaman b\xFCy\xFCk yaz. Kelime eklerini kesme i\u015Faretiyle (') ay\u0131r (\xD6rn: "\u0130stanbul'da", "Ahmet'e", "Premiere Pro'nun", "Mustafa Kemal").
   - Ba\u011Fla\xE7 olan "da/de" ve "ki" kelimelerini her zaman ayr\u0131 yaz (\xD6rn: "Sen de gelebilirsin.", "\xD6yle bir \u015Fey ki..."). Ek olan "-da/-de/-ta/-te" ve s\u0131fat yapan "-ki"yi ise biti\u015Fik yaz (\xD6rn: "Bende kals\u0131n", "Masadaki kitap").
   - Soru ekleri olan "m\u0131/mi/mu/m\xFCy\xFC" kendinden \xF6nceki kelimeden ayr\u0131, kendinden sonraki eklerle biti\u015Fik yaz (\xD6rn: "Gelecek misin?", "Haz\u0131r m\u0131s\u0131n\u0131z?", "Benimle mi?").
   - "\u015Fey" kelimesini her zaman kendinden \xF6nceki ve sonraki kelimelerden ayr\u0131 yaz (\xD6rn: "bir \u015Fey", "her \u015Fey", "hi\xE7bir \u015Fey").
2. Noktalama \u0130\u015Faretleri:
   - C\xFCmle sonlar\u0131na mutlaka uygun noktalamay\u0131 koy: nokta (.), soru soruluyorsa soru i\u015Fareti (?), \u015Fa\u015Fk\u0131nl\u0131k/uyar\u0131 varsa (!) koy.
   - Do\u011Fal konu\u015Fma esnas\u0131ndaki duraksamalara veya nefes al\u0131mlar\u0131na denk gelen anlaml\u0131 yerlere virg\xFCl (,) ekleyerek ak\u0131c\u0131l\u0131\u011F\u0131 art\u0131r.
3. Dolgu Kelimelerin Temizlenmesi (Linguistic Cleaning):
   - Konu\u015Fmac\u0131lar\u0131n "\u0131\u0131\u0131", "eee", "\u015Fey" (duraksama dolgusu olarak), "aa", "hm" gibi duraksama ve dolgu kelimelerini / seslerini TRANSKR\u0130PS\u0130YONA ASLA EKLEME. Bunlar\u0131 tamamen temizle.
4. Hassas Zamanlama (Timestamps):
   - Her altyaz\u0131 blo\u011Funun ba\u015Flang\u0131\xE7 (start) ve biti\u015F (end) saniyelerini son derece hassas tespit et.
   - Zamanlamalar\u0131 saniye cinsinden ondal\u0131kl\u0131 say\u0131 olarak ver (\xD6rn: start: 1.25, end: 4.3).
   - Zamanlama aral\u0131klar\u0131 aras\u0131nda bo\u015Fluklar olabilir (sessizlik anlar\u0131nda), ancak altyaz\u0131lar birbirinin \xFCzerine \xE7ak\u0131\u015Fmamal\u0131d\u0131r (bir altyaz\u0131n\u0131n start de\u011Feri, bir \xF6nceki altyaz\u0131n\u0131n end de\u011Ferinden k\xFC\xE7\xFCk olmamal\u0131d\u0131r).

Subtitles dizisi alt\u0131nda bu kurallara uyan altyaz\u0131 nesnelerini d\xF6nd\xFCr.`;
      const responseSchema = {
        type: import_genai.Type.OBJECT,
        properties: {
          subtitles: {
            type: import_genai.Type.ARRAY,
            description: "Transkribe edilmi\u015F ve zamanlanm\u0131\u015F T\xFCrk\xE7e altyaz\u0131 bloklar\u0131n\u0131n listesi.",
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                start: {
                  type: import_genai.Type.NUMBER,
                  description: "Altyaz\u0131 blo\u011Funun ba\u015Flang\u0131\xE7 zaman\u0131 (saniye cinsinden, \xF6rn: 2.15)"
                },
                end: {
                  type: import_genai.Type.NUMBER,
                  description: "Altyaz\u0131 blo\u011Funun biti\u015F zaman\u0131 (saniye cinsinden, \xF6rn: 5.40)"
                },
                text: {
                  type: import_genai.Type.STRING,
                  description: "Bu zaman aral\u0131\u011F\u0131nda konu\u015Fulan, yaz\u0131m kurallar\u0131na m\xFCkemmel uyumlu T\xFCrk\xE7e metin."
                }
              },
              required: ["start", "end", "text"]
            }
          }
        },
        required: ["subtitles"]
      };
      console.log(`Gemini API'ye g\xF6nderiliyor... Dosya T\xFCr\xFC: ${resolvedMime}`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          audioPart,
          {
            text: "L\xFCtfen yukar\u0131daki ses kayd\u0131n\u0131 dinle ve tan\u0131mlanan kurallara g\xF6re kelimesi kelimesine T\xFCrk\xE7e transkripsiyonu tamamlayarak JSON nesnesi olarak d\xF6nd\xFCr."
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2
          // Low temperature for maximum precision and factual spelling
        }
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini'den bo\u015F bir yan\u0131t al\u0131nd\u0131.");
      }
      console.log("Gemini yan\u0131t\u0131 ba\u015Far\u0131yla al\u0131nd\u0131.");
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```[a-zA-Z]*\n/, "");
        cleanedText = cleanedText.replace(/\n```$/, "");
      }
      const parsedData = JSON.parse(cleanedText.trim());
      let usage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };
      if (response.usageMetadata) {
        usage = {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0
        };
      } else {
        const durationSeconds = parsedData.subtitles && parsedData.subtitles.length > 0 ? Math.max(...parsedData.subtitles.map((s) => s.end)) : 30;
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
        usage
      });
    } catch (error) {
      console.error("Transkripsiyon hatas\u0131:", error);
      res.status(500).json({
        error: "Ses analizi ve transkripsiyon esnas\u0131nda bir hata olu\u015Ftu.",
        details: error.message || error
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite dev server modunda ba\u015Flat\u0131l\u0131yor...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("\xDCretim (Production) modunda statik dosyalar sunuluyor...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Sunucu ba\u015Flatma hatas\u0131:", err);
});
//# sourceMappingURL=server.cjs.map
