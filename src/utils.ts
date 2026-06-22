import { Subtitle } from "./types";

/**
 * Formats seconds into SRT timestamp style: HH:MM:SS,mmm
 */
export function formatTimeSRT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => ("00" + n).slice(-z);
  const padMs = (n: number) => ("000" + n).slice(-3);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${padMs(ms)}`;
}

/**
 * Formats seconds into WebVTT timestamp style: HH:MM:SS.mmm
 */
export function formatTimeVTT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => ("00" + n).slice(-z);
  const padMs = (n: number) => ("000" + n).slice(-3);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${padMs(ms)}`;
}

interface WordInfo {
  text: string;
  start: number;
  end: number;
}

/**
 * Redistributes and reformats high-resolution subtitle segments in real-time
 * past maximum word count, character count boundaries, and strict gaps between subtitles.
 */
export function reformatSubtitles(
  rawList: Subtitle[],
  maxWords: number,
  maxChars: number,
  gapSeconds: number
): Subtitle[] {
  const words: WordInfo[] = [];

  // Extract separate words along with interpolated timestamps
  for (const segment of rawList) {
    const text = segment.text.trim();
    if (!text) continue;

    const rawWords = text.split(/\s+/);
    const duration = segment.end - segment.start;
    const totalLen = text.length || 1;

    let currentIdx = 0;
    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i];
      const startPct = currentIdx / totalLen;
      const endPct = (currentIdx + w.length) / totalLen;

      const wStart = segment.start + startPct * duration;
      const wEnd = segment.start + endPct * duration;

      words.push({
        text: w,
        start: wStart,
        end: wEnd,
      });

      currentIdx += w.length + 1; // +1 to account for join spaces
    }
  }

  if (words.length === 0) return [];

  // Group words into compliant, customized subtitle intervals
  const newSubtitles: Subtitle[] = [];
  let currentGroup: WordInfo[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    const currentWordsCount = currentGroup.length;
    const wouldExceedWords = currentWordsCount >= maxWords;

    const currentTextTentative =
      currentGroup.map((g) => g.text).join(" ") +
      (currentWordsCount > 0 ? " " : "") +
      word.text;
    const wouldExceedChars = currentTextTentative.length > maxChars;

    // Check for a long pause in natural talking patterns (> 1.2s) to split paragraphs nicely
    const lastWord = currentGroup[currentGroup.length - 1];
    const isBigVoicePause = lastWord ? word.start - lastWord.end > 1.2 : false;

    // Force split if previous word ends with sentence-terminating punctuation (. ? ! …)
    // to maintain sentence integrity, ignoring common abbreviation dots
    let isSentenceEnd = false;
    if (lastWord) {
      const cleanWord = lastWord.text.trim();
      const endsWithPunct = /[.?!…]/.test(cleanWord);
      const isAbbreviation = ["vb.", "örn.", "dr.", "prof.", "cad.", "mah.", "sok.", "st.", "bkz.", "vs.", "al.", "ing.", "türk.", "yard.", "doç.", "m.ö.", "m.s."].includes(cleanWord.toLowerCase());
      if (endsWithPunct && !isAbbreviation) {
        isSentenceEnd = true;
      }
    }

    if ((wouldExceedWords || wouldExceedChars || isBigVoicePause || isSentenceEnd) && currentGroup.length > 0) {
      const gStart = currentGroup[0].start;
      const gEnd = currentGroup[currentGroup.length - 1].end;
      const gText = currentGroup.map((g) => g.text).join(" ");

      newSubtitles.push({
        id: Math.random().toString(36).substring(2, 11),
        start: gStart,
        end: gEnd,
        text: gText,
      });
      currentGroup = [word];
    } else {
      currentGroup.push(word);
    }
  }

  if (currentGroup.length > 0) {
    const gStart = currentGroup[0].start;
    const gEnd = currentGroup[currentGroup.length - 1].end;
    const gText = currentGroup.map((g) => g.text).join(" ");

    newSubtitles.push({
      id: Math.random().toString(36).substring(2, 11),
      start: gStart,
      end: gEnd,
      text: gText,
    });
  }

  // Adjust timings to ensure at least a 'gapSeconds' break between subsequent subtitles
  for (let i = 0; i < newSubtitles.length - 1; i++) {
    const cur = newSubtitles[i];
    const nxt = newSubtitles[i + 1];

    if (nxt.start - cur.end < gapSeconds) {
      // Scale back active subtitle end-time, leaving the requested gap space
      cur.end = Math.max(cur.start + 0.1, nxt.start - gapSeconds);
    }
  }

  return newSubtitles;
}

/**
 * Exporter: Outputs fully standard SubRip (.srt) compatible with Adobe Premiere Pro
 */
export function exportToSRT(subtitles: Subtitle[]): string {
  return subtitles
    .map((sub, idx) => {
      return `${idx + 1}\n${formatTimeSRT(sub.start)} --> ${formatTimeSRT(sub.end)}\n${sub.text}\n`;
    })
    .join("\n");
}

/**
 * Exporter: Outputs standard WebVTT (.vtt) format with correct header and dot syntax
 */
export function exportToVTT(subtitles: Subtitle[]): string {
  const body = subtitles
    .map((sub, idx) => {
      return `${idx + 1}\n${formatTimeVTT(sub.start)} --> ${formatTimeVTT(sub.end)}\n${sub.text}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${body}`;
}

/**
 * Exporter: Outputs Premiere Pro Marker XML. This lets video editors import markers representing de-şifre/subtitles!
 */
export function exportToPremiereMarkersXML(subtitles: Subtitle[], projectName: string = "Altyazı"): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<markers project="${projectName}">\n`;
  
  subtitles.forEach((sub, idx) => {
    // Premiere markers standard time representation in frames or seconds
    xml += `  <marker id="${idx + 1}">\n`;
    xml += `    <name>Altyazı #${idx + 1}</name>\n`;
    xml += `    <comments>${escapeXml(sub.text)}</comments>\n`;
    xml += `    <in>${sub.start.toFixed(3)}</in>\n`;
    xml += `    <out>${sub.end.toFixed(3)}</out>\n`;
    xml += `    <type>Comment</type>\n`;
    xml += `  </marker>\n`;
  });
  
  xml += `</markers>`;
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export interface LinguisticIssue {
  id: string;
  type: "tdk_da_de" | "tdk_ki" | "tdk_mi" | "lowercase_name" | "filler_word" | "punctuation_missing" | "reading_speed";
  severity: "info" | "warning" | "error";
  subtitleId: string;
  subtitleIndex: number;
  message: string;
  details: string;
  fixable: boolean;
  suggestedFix?: string;
}

/**
 * Audit subtitles for standard Turkish language compliance (TDK), punctuation, fillers and speed indices
 */
export function analyzeLinguisticAccuracy(subtitles: Subtitle[]): LinguisticIssue[] {
  const issues: LinguisticIssue[] = [];
  
  // Hardcoded list of common Turkish personal/place names that should be capitalized
  const commonTurkishNames = [
    "ahmet", "mehmet", "mustafa", "ayşe", "fatma", "ali", "veli", "hasan", "huseyin", "hüseyin",
    "serkan", "buğra", "can", "cem", "deniz", "aslı", "burcu", "merve", "zeynep", "emre",
    "istanbul", "ankara", "izmir", "bursa", "antalya", "turkiye", "türkiye", "kadıköy", "beşiktaş"
  ];

  // Common spoken filler words that should ideally not remain in subtitles
  const fillerWords = ["ııı", "eee", "şey", "hm", "hmm", "ee", "ıı"];

  subtitles.forEach((sub, idx) => {
    const text = sub.text;
    const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/);
    
    // 1. Reading speed warning: CPS (Characters Per Second)
    const duration = sub.end - sub.start;
    if (duration > 0) {
      const cps = text.length / duration;
      if (cps > 21) {
        issues.push({
          id: `speed-${sub.id}`,
          type: "reading_speed",
          severity: "warning",
          subtitleId: sub.id,
          subtitleIndex: idx + 1,
          message: "Çok Hızlı Okuma Süresi",
          details: `Bu altyazı saniyede ${cps.toFixed(1)} karakter içeriyor. İzleyicinin okuması zor olabilir. Maksimum kelime/karakter sınırını düşürün.`,
          fixable: false
        });
      }
    }

    // 2. Check for missing final punctuation
    const lastChar = text.trim().slice(-1);
    if (![".", "?", "!", '"', "”", "…"].includes(lastChar)) {
      issues.push({
        id: `punc-${sub.id}`,
        type: "punctuation_missing",
        severity: "info",
        subtitleId: sub.id,
        subtitleIndex: idx + 1,
        message: "Noktalama Eksikliği",
        details: "Cümlenin sonunda nokta (.), soru işareti (?) veya üç nokta (...) eksik görünüyor.",
        fixable: true,
        suggestedFix: text.trim() + "."
      });
    }

    // 3. Check for filler words
    const foundFillers = words.filter(w => fillerWords.includes(w));
    if (foundFillers.length > 0) {
      // Find clean string
      const cleanText = sub.text.replace(/\s*(ııı|eee|şey|hm|hmm|ee|ıı)\s*/gi, " ").trim().replace(/\s+/g, " ");
      issues.push({
        id: `filler-${sub.id}`,
        type: "filler_word",
        severity: "warning",
        subtitleId: sub.id,
        subtitleIndex: idx + 1,
        message: `Gereksiz Dolgu Sesi (${foundFillers.join(", ")})`,
        details: `Altyazıda akıcılığı bozan "${foundFillers.join(" / ")}" benzeri dolgu sözcükleri tespit edildi.`,
        fixable: true,
        suggestedFix: cleanText
      });
    }

    // 4. Case sensitivity check for known names
    const originalWords = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/);
    originalWords.forEach((word) => {
      const lower = word.toLowerCase();
      if (commonTurkishNames.includes(lower) && word[0] !== word[0].toUpperCase()) {
        const capitalized = word[0].toUpperCase() + word.slice(1);
        issues.push({
          id: `case-${sub.id}-${lower}`,
          type: "lowercase_name",
          severity: "error",
          subtitleId: sub.id,
          subtitleIndex: idx + 1,
          message: "Özel İsim Küçük Harfle Başlıyor",
          details: `"${word}" özel isminin baş harfi büyük yazılmalıdır (${capitalized}).`,
          fixable: true,
          suggestedFix: text.replace(new RegExp(`\\b${word}\\b`, "g"), capitalized)
        });
      }
    });

    // 5. Question particle separate writing rules "mi"
    const miMatch = text.match(/\b(mi|mı|mu|mü|misin|mısın|musun|müsünüz|miyiz|mıyız)\b/gi);
    // Let's check for basic merged questions like "gittinmi", "gelecekmisin", "olurmu"
    const mergedMiMatch = text.match(/\b\w+(mi|mı|mu|mü|misin|mısın|musun|müsünüz)\b/gi);
    if (mergedMiMatch) {
      // Exclude words that genuinely end with those syllables unless they are clearly missing a space
      // E.g. "On altı", "cami", "balmumu" etc. are excluded since they aren't question particles.
      // But verbs like "gitti-mi", "yaptın-mı" can be verified
      const nonQuestionEndings = ["cami", "umumi", "mumi", "tatarımsı", "dolmuş", "kırmızı", "kamu"];
      mergedMiMatch.forEach((word) => {
        const lowerWord = word.toLowerCase();
        if (!nonQuestionEndings.some(ending => lowerWord.endsWith(ending)) && 
            (lowerWord.endsWith("mi") || lowerWord.endsWith("mı") || lowerWord.endsWith("mu") || lowerWord.endsWith("mü") || lowerWord.endsWith("misin") || lowerWord.endsWith("mısın"))) {
          
          let stem = "";
          let particle = "";
          if (lowerWord.endsWith("misin")) { stem = word.slice(0, -5); particle = word.slice(-5); }
          else if (lowerWord.endsWith("mısın")) { stem = word.slice(0, -5); particle = word.slice(-5); }
          else { stem = word.slice(0, -2); particle = word.slice(-2); }
          
          issues.push({
            id: `mi-${sub.id}-${word}`,
            type: "tdk_mi",
            severity: "error",
            subtitleId: sub.id,
            subtitleIndex: idx + 1,
            message: "Soru Eki Bitişik Yazılmış",
            details: `"${word}" soru edatı kendinden önceki kelimeden ayrı yazılmalıdır: "${stem} ${particle}"`,
            fixable: true,
            suggestedFix: text.replace(word, `${stem} ${particle}`)
          });
        }
      });
    }
  });

  return issues;
}
