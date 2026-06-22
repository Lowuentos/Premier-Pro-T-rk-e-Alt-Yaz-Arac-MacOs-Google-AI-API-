import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Upload, Play, Pause, Download, Plus, Trash2, 
  Settings, Layers, Volume2, Sparkles, CheckCircle2, 
  AlertTriangle, BookOpen, Search, HelpCircle, 
  Clock, RotateCcw, AlertCircle, FileText, ChevronRight, Edit3, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Subtitle, FormattingParams, ProjectStats, DemoInterview, ArchivedProject } from "./types";
import { DEMO_INTERVIEWS } from "./data";
import { 
  reformatSubtitles, 
  exportToSRT, 
  exportToVTT, 
  exportToPremiereMarkersXML, 
  analyzeLinguisticAccuracy, 
  formatTimeSRT 
} from "./utils";

export default function App() {
  // Archive database state stored in localStorage (pre-seeded with demos on first load for testing)
  const [archive, setArchive] = useState<ArchivedProject[]>(() => {
    try {
      const stored = localStorage.getItem("tr_subtitle_archive");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    // Seed with DEMO_INTERVIEWS as helpful deletable records on the very first load
    return DEMO_INTERVIEWS.map((interview, index) => {
      const promptMap = [13580, 10420, 8960];
      const outputMap = [418, 352, 215];
      const total = (promptMap[index] || 10000) + (outputMap[index] || 300);
      return {
        id: `seed-${interview.id}`,
        title: interview.title,
        subtitles: interview.subtitles,
        tokenUsage: {
          promptTokens: promptMap[index] || 10000,
          candidatesTokens: outputMap[index] || 300,
          totalTokens: total,
          isDemo: true
        },
        audioFileName: `${interview.title} (Örnek Sahneli)`,
        createdAt: "Hazır Örnek"
      };
    });
  });

  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem("tr_subtitle_archive_active_id");
      if (stored) return stored;
    } catch {}
    return "seed-tech-interview";
  });

  // State for raw subtitles loaded into active editing window
  const [rawSubtitles, setRawSubtitles] = useState<Subtitle[]>(() => {
    try {
      const storedArchive = localStorage.getItem("tr_subtitle_archive");
      const activeId = localStorage.getItem("tr_subtitle_archive_active_id") || "seed-tech-interview";
      if (storedArchive) {
        const parsed = JSON.parse(storedArchive);
        if (parsed.length > 0) {
          const activeProj = parsed.find((p: any) => p.id === activeId);
          if (activeProj) return activeProj.subtitles;
        }
      }
    } catch {}
    return DEMO_INTERVIEWS[0]?.subtitles || [];
  });

  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // Token usage tracker state
  const [tokenUsage, setTokenUsage] = useState<{
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    isDemo: boolean;
  } | null>(() => {
    try {
      const storedArchive = localStorage.getItem("tr_subtitle_archive");
      const activeId = localStorage.getItem("tr_subtitle_archive_active_id") || "seed-tech-interview";
      if (storedArchive) {
        const parsed = JSON.parse(storedArchive);
        if (parsed.length > 0) {
          const activeProj = parsed.find((p: any) => p.id === activeId);
          if (activeProj && activeProj.tokenUsage) return activeProj.tokenUsage;
        }
      }
    } catch {}
    return {
      promptTokens: 13580,
      candidatesTokens: 418,
      totalTokens: 13998,
      isDemo: true
    };
  });

  // Memoized token & cost calculations (Input: $0.075/1M, Output: $0.30/1M, 1 USD = 33.50 TL)
  const activeTokenInfo = useMemo(() => {
    if (!tokenUsage) {
      // Tech-interview demo presets
      const prompt = 13580;
      const candidates = 418;
      const total = 13998;
      const costUSD = (prompt * 0.000000075) + (candidates * 0.000000300);
      return {
        promptTokens: prompt,
        candidatesTokens: candidates,
        totalTokens: total,
        costTRY: costUSD * 33.50,
        isDemo: true
      };
    }
    const costUSD = (tokenUsage.promptTokens * 0.000000075) + (tokenUsage.candidatesTokens * 0.000000300);
    return {
      ...tokenUsage,
      costTRY: costUSD * 33.50
    };
  }, [tokenUsage]);
  
  // Non-blocking custom confirmation dialog state to replace native window.confirm (blocked/sandboxed in iframes)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom styling formatting parameters
  const [params, setParams] = useState<FormattingParams>({
    maxWords: 7,
    maxChars: 42,
    gapSeconds: 0.10 // 100 milliseconds
  });

  // Active compiled subtitles applying formatting params in real-time
  const formattedSubtitles = useMemo(() => {
    return reformatSubtitles(rawSubtitles, params.maxWords, params.maxChars, params.gapSeconds);
  }, [rawSubtitles, params]);

  // Player configurations
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [activeDemoId, setActiveDemoId] = useState<string>("");
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(() => {
    try {
      const storedArchive = localStorage.getItem("tr_subtitle_archive");
      const activeId = localStorage.getItem("tr_subtitle_archive_active_id") || "seed-tech-interview";
      if (storedArchive) {
        const parsed = JSON.parse(storedArchive);
        if (parsed.length > 0) {
          const activeProj = parsed.find((p: any) => p.id === activeId);
          if (activeProj) return activeProj.title;
        }
      }
    } catch {}
    return "Yapay Zeka ve Sinema Sektörü";
  });

  // Advanced features and search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [replaceTerm, setReplaceTerm] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string; type: "success" | "error" | "info"} | null>(null);

  const isCEP = useMemo(() => {
    return typeof window !== "undefined" && (window.location.protocol === "file:" || !!(window as any).__adobe_cep__);
  }, []);

  const [audioTracks, setAudioTracks] = useState<string[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(-1);
  const [isExportingTimelineAudio, setIsExportingTimelineAudio] = useState<boolean>(false);

  const refreshAudioTracks = () => {
    if (isCEP && (window as any).CSInterface) {
      const csInterface = new (window as any).CSInterface();
      csInterface.evalScript("getAudioTracks()", (result: string) => {
        if (result === "no_active_sequence") {
          setAudioTracks([]);
        } else if (result.startsWith("error:") || result.startsWith("ExtendScript")) {
          console.error(result);
          setAudioTracks([]);
        } else if (result.trim()) {
          setAudioTracks(result.split("||"));
        } else {
          setAudioTracks([]);
        }
      });
    }
  };

  useEffect(() => {
    if (isCEP) {
      const timer = setTimeout(() => {
        refreshAudioTracks();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isCEP]);

  // Speech to Text upload tracker
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionStep, setTranscriptionStep] = useState<string>("");
  const [dragOver, setDragOver] = useState<boolean>(false);

  // DOM element references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<any>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Check backend server config for Gemini key availability
  useEffect(() => {
    const isCEPEnv = typeof window !== "undefined" && (window.location.protocol === "file:" || !!(window as any).__adobe_cep__);
    const apiPrefix = isCEPEnv ? "http://localhost:3000" : "";
    fetch(`${apiPrefix}/api/config-check`)
      .then((res) => res.json())
      .then((data) => {
        setHasGeminiKey(!!data.hasGeminiKey);
      })
      .catch((err) => {
        console.error("Config check failed:", err);
      });
  }, []);

  // Show status notification helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Local storage synchronization effects
  useEffect(() => {
    localStorage.setItem("tr_subtitle_archive", JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    if (activeArchiveId) {
      localStorage.setItem("tr_subtitle_archive_active_id", activeArchiveId);
    } else {
      localStorage.removeItem("tr_subtitle_archive_active_id");
    }
  }, [activeArchiveId]);

  // Synchronize current edits of rawSubtitles & tokenUsage back to archive state
  useEffect(() => {
    if (activeArchiveId && rawSubtitles.length > 0) {
      setArchive(prev => {
        const index = prev.findIndex(p => p.id === activeArchiveId);
        if (index === -1) return prev;
        const target = prev[index];
        // Only update if subtitles or tokens are actually different to prevent render loops
        if (JSON.stringify(target.subtitles) === JSON.stringify(rawSubtitles) &&
            JSON.stringify(target.tokenUsage) === JSON.stringify(tokenUsage)) {
          return prev;
        }
        const updated = [...prev];
        updated[index] = {
          ...target,
          subtitles: rawSubtitles,
          tokenUsage: tokenUsage || undefined
        };
        return updated;
      });
    }
  }, [rawSubtitles, tokenUsage, activeArchiveId]);

  // Archive loading, renaming, deleting, and seeding controls
  const handleSelectArchiveProject = (projectId: string) => {
    const project = archive.find(p => p.id === projectId);
    if (project) {
      setActiveArchiveId(project.id);
      setRawSubtitles(project.subtitles);
      setCustomFileName(project.title);
      
      if (project.tokenUsage) {
        setTokenUsage(project.tokenUsage);
      } else {
        setTokenUsage(null);
      }

      // Local audio blob URLs expire when page is reloaded, handle loading fallback gracefully
      setCustomAudioUrl(null);
      if (audioRef.current) {
        audioRef.current.src = "";
      }
      setCurrentTime(0);
      setIsPlaying(false);
      showToast(`'${project.title}' arşivi başarıyla yüklendi.`, "success");
    }
  };

  const [editingArchiveId, setEditingArchiveId] = useState<string | null>(null);
  const [editingArchiveTitle, setEditingArchiveTitle] = useState<string>("");

  const handleRenameArchiveProject = (projectId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setArchive(prev => prev.map(p => p.id === projectId ? { ...p, title: newTitle.trim() } : p));
    if (activeArchiveId === projectId) {
      setCustomFileName(newTitle.trim());
    }
    setEditingArchiveId(null);
    showToast("Arşiv kaydı ismi güncellendi.", "success");
  };

  const handleDeleteArchiveProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering loading selection
    const project = archive.find(p => p.id === projectId);
    if (!project) return;
    
    setConfirmModal({
      title: "Kayıt Silinecek",
      message: `"${project.title}" arşiv kaydını ve tüm altyazılarını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      onConfirm: () => {
        setArchive(prev => prev.filter(p => p.id !== projectId));
        if (activeArchiveId === projectId) {
          setActiveArchiveId(null);
          setRawSubtitles([]);
          setCustomFileName(null);
          setTokenUsage(null);
        }
        showToast("Arşiv kaydı başarıyla silindi.", "success");
      }
    });
  };

  // Restores standard demo data as seeds inside archive
  const handleResetArchiveSeeds = () => {
    const seeds = DEMO_INTERVIEWS.map((interview, index) => {
      const promptMap = [13580, 10420, 8960];
      const outputMap = [418, 352, 215];
      const total = (promptMap[index] || 10000) + (outputMap[index] || 300);
      return {
        id: `seed-${interview.id}`,
        title: interview.title,
        subtitles: interview.subtitles,
        tokenUsage: {
          promptTokens: promptMap[index] || 10000,
          candidatesTokens: outputMap[index] || 300,
          totalTokens: total,
          isDemo: true
        },
        audioFileName: `${interview.title} (Örnek Sahneli)`,
        createdAt: "Hazır Örnek"
      };
    });
    setArchive(seeds);
    setActiveArchiveId("seed-tech-interview");
    const test = seeds[0];
    setRawSubtitles(test.subtitles);
    setCustomFileName(test.title);
    setTokenUsage(test.tokenUsage);
    showToast("Örnek deşifre şablonları arşive geri yüklendi.", "success");
  };

  // Synchronized Audio Playback Engine
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          setCurrentTime(current);
          
          // Check if audio has finished
          if (audioRef.current.ended) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }
      }, 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          // Fallback if browser blocks autoplay or dynamic files
          setIsPlaying(true);
          console.warn("Audio element play interrupted, simulating progress...", err);
        });
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  // Find active subtitle corresponding to playback current time
  const activeSubtitle = useMemo(() => {
    return formattedSubtitles.find(s => currentTime >= s.start && currentTime <= s.end);
  }, [formattedSubtitles, currentTime]);

  // Stats calculation
  const stats: ProjectStats = useMemo(() => {
    const totalDuration = formattedSubtitles.length > 0 
      ? Math.max(...formattedSubtitles.map(s => s.end)) 
      : 0;
    
    let totalWords = 0;
    let totalChars = 0;
    formattedSubtitles.forEach(s => {
      totalWords += s.text.trim().split(/\s+/).length;
      totalChars += s.text.length;
    });

    const averageWordsPerSub = formattedSubtitles.length > 0 
      ? Math.round(totalWords / formattedSubtitles.length) 
      : 0;

    const averageCharsPerSub = formattedSubtitles.length > 0
      ? Math.round(totalChars / formattedSubtitles.length)
      : 0;

    const readingSpeedAlerts = analyzeLinguisticAccuracy(formattedSubtitles)
      .filter(i => i.type === "reading_speed").length;

    return {
      totalDuration,
      subtitleCount: formattedSubtitles.length,
      averageWordsPerSub,
      averageCharsPerSub,
      readingSpeedAlerts
    };
  }, [formattedSubtitles]);

  // Evaluate grammar & TDK constraints
  const linguisticIssues = useMemo(() => {
    return analyzeLinguisticAccuracy(formattedSubtitles);
  }, [formattedSubtitles]);

  // Upload and Call Gemini Server Transcription
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    let file: File | null = null;
    if ("dataTransfer" in event) {
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        file = event.dataTransfer.files[0];
      }
    } else if (event.target.files && event.target.files.length > 0) {
      file = event.target.files[0];
    }

    if (!file) return;

    // Type validation
    const fileType = file.type || "";
    const validTypes = ["audio/", "video/"];
    const isMimeValid = validTypes.some(t => fileType.startsWith(t));
    const isExtensionValid = [".mp3", ".wav", ".m4a", ".mp4", ".mov", ".mkv"].some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isMimeValid && !isExtensionValid) {
      showToast("Lütfen sadece ses (.mp3, .wav, .m4a) veya video (.mp4, .mov) yükleyin.", "error");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast("Dosya boyutu çok büyük! Gemini API hızlı analizi için lütfen 25MB altı bir dosya yükleyin.", "error");
      return;
    }

    try {
      setIsTranscribing(true);
      setTranscriptionStep("Medya okunuyor...");

      // Convert to Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          // Extract base64 segment from URL payload
          const base64Data = result.split(",")[1];
          const mimeType = file.type || "";

          setTranscriptionStep("Gemini 3.5-flash bağlanıyor... Ses analizi başlatıldı.");
          
          const isCEPEnv = typeof window !== "undefined" && (window.location.protocol === "file:" || !!(window as any).__adobe_cep__);
          const apiPrefix = isCEPEnv ? "http://localhost:3000" : "";
          
          const response = await fetch(`${apiPrefix}/api/transcribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType: mimeType,
              fileName: file.name
            })
          });

          if (!response.ok) {
            let errMsg = "Sunucu işlemi başarısız oldu.";
            try {
              const errData = await response.json();
              errMsg = errData.error || errData.details || errMsg;
            } catch (pErr) {
              errMsg = `Sunucu Hatası (Kod: ${response.status})`;
            }
            throw new Error(errMsg);
          }

          const responseData = await response.json();
          if (responseData.subtitles && responseData.subtitles.length > 0) {
            // Assign unique client-side IDs
            const mappedSubs: Subtitle[] = responseData.subtitles.map((s: any, idx: number) => ({
              id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              start: s.start,
              end: s.end,
              text: s.text
            }));
            
             // Create a new archived project for the uploaded file
             const newArchiveProj: ArchivedProject = {
               id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
               title: file.name,
               subtitles: mappedSubs,
               tokenUsage: responseData.usage ? {
                 promptTokens: responseData.usage.promptTokens,
                 candidatesTokens: responseData.usage.candidatesTokens,
                 totalTokens: responseData.usage.totalTokens,
                 isDemo: false
               } : {
                 promptTokens: 0,
                 candidatesTokens: 0,
                 totalTokens: 0,
                 isDemo: false
               },
               audioFileName: file.name,
               createdAt: new Date().toLocaleString("tr-TR", {
                 day: "2-digit",
                 month: "2-digit",
                 year: "numeric",
                 hour: "2-digit",
                 minute: "2-digit"
               })
             };

             setArchive(prev => [newArchiveProj, ...prev]);
             setActiveArchiveId(newArchiveProj.id);
             setRawSubtitles(mappedSubs);
             setCustomFileName(file.name);
             setActiveDemoId("");
             
             // Set dynamic token usage tracker from server response
             if (responseData.usage) {
               setTokenUsage({
                 promptTokens: responseData.usage.promptTokens,
                 candidatesTokens: responseData.usage.candidatesTokens,
                 totalTokens: responseData.usage.totalTokens,
                 isDemo: false
               });
             } else {
               setTokenUsage(null);
             }
            
            // Generate temporary local media URL for user-uploaded audio/video listening
            const audioObjUrl = URL.createObjectURL(file);
            setCustomAudioUrl(audioObjUrl);
            if (audioRef.current) {
              audioRef.current.src = audioObjUrl;
              audioRef.current.load();
            }

            showToast("Videodaki konuşmalar başarıyla Türkçe imla kurallarına uygun deşifre edildi!", "success");
          } else {
            throw new Error("Transkipsiyonda geçerli altyazı bulunamadı.");
          }
        } catch (err: any) {
          console.error("Transcription operation failure:", err);
          showToast(err.message || "Deşifre esnasında bir hata meydana geldi.", "error");
        } finally {
          setIsTranscribing(false);
          setTranscriptionStep("");
        }
      };
      
      reader.onerror = () => {
        throw new Error("Dosya yüklenirken okuma hatası oluştu.");
      };
      
      reader.readAsDataURL(file);

    } catch (err: any) {
      showToast(err.message, "error");
      setIsTranscribing(false);
    }
  };

  // Live Manual Edits handlers
  const handleEditSubtitleText = (id: string, newText: string) => {
    // Find index of editing subtitle inside raw/formatted sequence
    // It's safer to map directly on rawSubtitles
    // Since formattedSubtitles is a processed view, editing individual pieces we modify raw list to preserve original deşifre timing
    setRawSubtitles(prev => prev.map(sub => {
      // If we find matching segment, update text
      // Note: Since raw list might differ in lengths from adjusted, we apply text map corresponding to timestamps
      return sub.id === id ? { ...sub, text: newText } : sub;
    }));
  };

  const handleEditTimestamps = (id: string, field: "start" | "end", valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0) return;
    setRawSubtitles(prev => prev.map(sub => {
      if (sub.id === id) {
        return {
          ...sub,
          [field]: val
        };
      }
      return sub;
    }));
  };

  const handleAddField = () => {
    const maxEnd = formattedSubtitles.length > 0 
      ? Math.max(...formattedSubtitles.map(s => s.end)) 
      : 0;

    const newSub: Subtitle = {
      id: `man-${Date.now()}`,
      start: maxEnd + 0.5,
      end: maxEnd + 3.5,
      text: "Yeni altyazı metnini buraya girin."
    };
    setRawSubtitles(prev => [...prev, newSub]);
    showToast("Yeni altyazı satırı eklendi.", "info");

    // Scroll to bottom
    setTimeout(() => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = listContainerRef.current.scrollHeight;
      }
    }, 150);
  };

  const handleDeleteSub = (id: string) => {
    setRawSubtitles(prev => prev.filter(s => s.id !== id));
    showToast("Altyazı satırı silindi.", "info");
  };

  const handleClearAll = () => {
    setConfirmModal({
      title: "Satırları Temizle",
      message: "Düzenleme panelindeki tüm altyazı satırlarını temizlemek istediğinize emin misiniz? (Arşivdeki asıl kopya etkilenmez)",
      onConfirm: () => {
        setRawSubtitles([]);
        showToast("Tüm satırlar temizlendi. Yeni ekleyebilir veya deşifre edebilirsiniz.", "info");
      }
    });
  };

  // Bulk Search and Replace
  const handleGlobalReplace = () => {
    if (!searchTerm.trim()) {
      showToast("Aramak için lütfen bir kelime belirtin.", "error");
      return;
    }
    let count = 0;
    setRawSubtitles(prev => prev.map(sub => {
      const regex = new RegExp(searchTerm, "gi");
      const match = sub.text.match(regex);
      if (match) {
        count += match.length;
        const updated = sub.text.replace(regex, replaceTerm);
        return { ...sub, text: updated };
      }
      return sub;
    }));
    showToast(`${count} adet eşleşen kelime "${replaceTerm}" ile başarıyla değiştirildi!`, "success");
    setSearchTerm("");
    setReplaceTerm("");
  };

  // Automated Turkish Grammar and Fillers Corrector
  const handleAutoFixAllGrammar = () => {
    let fixCount = 0;
    
    // We update current raw list with automated fixes for:
    // lowercase names, filler words, question space particles
    setRawSubtitles(prev => prev.map(sub => {
      let text = sub.text;

      // 1. Remove filler words (ııı, eee, şey)
      const originalText = text;
      text = text.replace(/\s*(ııı|eee|şey|hm|hmm|ee|ıı)\s*/gi, " ").trim().replace(/\s+/g, " ");
      
      // 2. Fix lowercase names (Istanbul -> İstanbul, ahmet -> Ahmet etc.)
      const namesToCapitalize = [
        "ahmet", "mehmet", "mustafa", "ayşe", "fatma", "ali", "veli", "hasan", "hüseyin",
        "serkan", "buğra", "can", "cem", "deniz", "aslı", "burcu", "merve", "zeynep", "emre",
        "istanbul", "ankara", "izmir", "bursa", "antalya", "türkiye", "kadıköy", "beşiktaş"
      ];
      namesToCapitalize.forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, "gi");
        text = text.replace(regex, (match) => match[0].toUpperCase() + match.slice(1));
      });

      // 3. Fix merged question suffixes "mi/mı" (yapacakmısın -> yapacak mısın)
      // Standard regular replacement bounds
      text = text.replace(/\b(\w+)(misin|mısın|musun|müsün|mi|mı|mu|mü)\b/gi, (match, stem, particle) => {
        // Safe exclusions
        if (["cami", "umumi", "mumi", "kamu", "dolmuş", "kırmızı"].includes(match.toLowerCase())) {
          return match;
        }
        return `${stem} ${particle}`;
      });

      // 4. Ensure trailing punctuation if completely blank
      if (text.length > 0 && ![".", "?", "!", "…"].includes(text.slice(-1))) {
        text += ".";
      }

      if (text !== originalText) {
        fixCount++;
      }

      return { ...sub, text };
    }));

    showToast(`Dil denetimi tamamlandı. ${fixCount} adet altyazı satırı kurallara uygun olarak revize edildi!`, "success");
  };

  const handleFixIndividual = (issue: any) => {
    if (issue.fixable && issue.suggestedFix) {
      handleEditSubtitleText(issue.subtitleId, issue.suggestedFix);
      showToast("Hata düzeltildi.", "success");
    }
  };

  // Downloads / File triggers
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    showToast(`'${fileName}' dosyası başarıyla indirildi. Premiere Pro'ya aktarabilirsiniz!`, "success");
  };

  const handleDownloadSRT = () => {
    const srtContent = exportToSRT(formattedSubtitles);
    const name = customFileName ? customFileName.split(".")[0] : activeDemoId || "altyazi";
    downloadFile(srtContent, `${name}_premiere.srt`, "text/plain");
  };

  const handleDownloadVTT = () => {
    const vttContent = exportToVTT(formattedSubtitles);
    const name = customFileName ? customFileName.split(".")[0] : activeDemoId || "altyazi";
    downloadFile(vttContent, `${name}_web.vtt`, "text/plain");
  };

  const handleDownloadXMLMarkers = () => {
    const xmlContent = exportToPremiereMarkersXML(formattedSubtitles, customFileName || "Altyazi_Projesi");
    const name = customFileName ? customFileName.split(".")[0] : activeDemoId || "markers";
    downloadFile(xmlContent, `${name}_markers.xml`, "text/xml");
  };

  const handleCopyToClipboard = () => {
    const srtContent = exportToSRT(formattedSubtitles);
    navigator.clipboard.writeText(srtContent)
      .then(() => showToast("SRT içeriği başarıyla panoya kopyalandı!", "success"))
      .catch(() => showToast("Kopyalama başarısız.", "error"));
  };

  const handleImportToPremiere = () => {
    try {
      const srtContent = exportToSRT(formattedSubtitles);
      const name = customFileName ? customFileName.split(".")[0] : activeDemoId || "altyazi";
      const fileName = `${name}_premiere.srt`;
      
      if (typeof window !== "undefined" && (window as any).require) {
        const fs = (window as any).require("fs");
        const path = (window as any).require("path");
        const os = (window as any).require("os");
        
        const tempDir = os.tmpdir();
        const tempPath = path.join(tempDir, fileName);
        
        fs.writeFileSync(tempPath, srtContent, "utf8");
        
        if ((window as any).CSInterface) {
          const csInterface = new (window as any).CSInterface();
          csInterface.evalScript("importSRTFile(\"" + tempPath.replace(/\\/g, "/") + "\")", (result: string) => {
            if (result === "success") {
              showToast("Altyazı (.srt) başarıyla Premiere Pro projenizin bin klasörüne aktarıldı!", "success");
            } else {
              showToast("Premiere Pro aktarım hatası: " + result, "error");
            }
          });
        } else {
          showToast("CSInterface nesnesi bulunamadı. Lütfen Premiere Pro eklentisi olarak çalıştırdığınızdan emin olun.", "error");
        }
      } else {
        showToast("Node.js özellikleri aktif değil veya eklenti dışında çalışıyorsunuz.", "error");
      }
    } catch (err: any) {
      console.error("Premiere import error:", err);
      showToast("Aktarım sırasında beklenmeyen bir hata oluştu: " + err.message, "error");
    }
  };

  const handleTranscribeTimelineAudio = () => {
    try {
      if (typeof window === "undefined" || !(window as any).require) {
        showToast("Node.js özellikleri aktif değil.", "error");
        return;
      }
      
      const fs = (window as any).require("fs");
      const path = (window as any).require("path");
      const os = (window as any).require("os");
      
      setIsExportingTimelineAudio(true);
      setTranscriptionStep("Timeline sesi hazırlanıyor... Lütfen bekleyin.");
      setIsTranscribing(true); // Open the transcription overlay
      
      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `timeline_audio_${Date.now()}.wav`);
      
      const csInterface = new (window as any).CSInterface();
      csInterface.evalScript("exportTrackAudio(" + selectedTrackIndex + ", \"" + tempPath.replace(/\\/g, "/") + "\")", async (result: string) => {
        try {
          if (result !== "success") {
            setIsExportingTimelineAudio(false);
            setIsTranscribing(false);
            showToast("Timeline sesi dışa aktarılamadı: " + result, "error");
            return;
          }
          
          setTranscriptionStep("Ses dosyası okundu. Gemini API'ye gönderiliyor...");
          
          // Read temporary WAV file and convert to base64
          if (!fs.existsSync(tempPath)) {
            throw new Error("Geçici ses dosyası oluşturulamadı.");
          }
          
          const audioBuffer = fs.readFileSync(tempPath);
          const base64Data = audioBuffer.toString("base64");
          
          // Determine file name
          const trackLabel = selectedTrackIndex === -1 ? "Miksaj" : (audioTracks[selectedTrackIndex] || "Kanal_" + (selectedTrackIndex + 1));
          const fileName = "Timeline_" + trackLabel + ".wav";
          
          // Trigger API call
          const isCEPEnv = typeof window !== "undefined" && (window.location.protocol === "file:" || !!(window as any).__adobe_cep__);
          const apiPrefix = isCEPEnv ? "http://localhost:3000" : "";
          
          const response = await fetch(apiPrefix + "/api/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType: "audio/wav",
              fileName: fileName
            })
          });
          
          // Delete temporary file safely
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
            console.warn("Could not delete temp file:", e);
          }
          
          if (!response.ok) {
            let errMsg = "Sunucu işlemi başarısız oldu.";
            try {
              const errData = await response.json();
              errMsg = errData.error || errData.details || errMsg;
            } catch (pErr) {
              errMsg = "Sunucu Hatası (Kod: " + response.status + ")";
            }
            throw new Error(errMsg);
          }
          
          const responseData = await response.json();
          if (responseData.subtitles && responseData.subtitles.length > 0) {
            const mappedSubs: Subtitle[] = responseData.subtitles.map((s: any, idx: number) => ({
              id: Date.now() + "-" + idx + "-" + Math.random().toString(36).substring(2, 6),
              start: s.start,
              end: s.end,
              text: s.text
            }));
            
            const newArchiveProj: ArchivedProject = {
              id: Date.now() + "-" + Math.random().toString(36).substring(2, 9),
              title: fileName,
              subtitles: mappedSubs,
              tokenUsage: responseData.usage ? {
                promptTokens: responseData.usage.promptTokens,
                candidatesTokens: responseData.usage.candidatesTokens,
                totalTokens: responseData.usage.totalTokens,
                isDemo: false
              } : {
                promptTokens: 0,
                candidatesTokens: 0,
                totalTokens: 0,
                isDemo: false
              },
              audioFileName: fileName,
              createdAt: new Date().toLocaleDateString("tr-TR") + " " + new Date().toLocaleTimeString("tr-TR")
            };
            
            setArchive(prev => [newArchiveProj, ...prev]);
            setActiveArchiveId(newArchiveProj.id);
            setRawSubtitles(mappedSubs);
            setCustomFileName(fileName);
            
            showToast("Timeline ses kanalı başarıyla deşifre edildi!", "success");
          } else {
            throw new Error("Deşifre edilerek herhangi bir altyazı bloğu üretilemedi.");
          }
          
        } catch (innerErr: any) {
          console.error("Transcription execution error:", innerErr);
          showToast(innerErr.message || "Deşifre işlemi sırasında hata oluştu.", "error");
        } finally {
          setIsExportingTimelineAudio(false);
          setIsTranscribing(false);
        }
      });
      
    } catch (err: any) {
      console.error("Transcribe timeline error:", err);
      showToast("Timeline sesi aktarılırken hata oluştu: " + err.message, "error");
      setIsExportingTimelineAudio(false);
      setIsTranscribing(false);
    }
  };

  // Filter subtitles based on list search input
  const displayFilteredSubtitles = useMemo(() => {
    if (!searchQuery.trim()) return formattedSubtitles;
    return formattedSubtitles.filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [formattedSubtitles, searchQuery]);

  return (
    <div id="app-root" className="min-h-screen bg-editor-bg font-sans text-text-light flex flex-col selection:bg-accent-blue selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded border shadow-2xl ${
              notification.type === "success" 
                ? "bg-panel-bg text-white border-accent-blue/50 shadow-black/80" 
                : notification.type === "error" 
                  ? "bg-panel-bg text-red-200 border-red-500/50 shadow-black/80" 
                  : "bg-panel-bg text-white border-accent-blue/30 shadow-black/80"
            }`}
          >
            {notification.type === "success" && <CheckCircle2 className="w-5 h-5 text-accent-blue shrink-0 animate-bounce" />}
            {notification.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {notification.type === "info" && <Clock className="w-5 h-5 text-accent-blue shrink-0" />}
            <span className="text-xs font-semibold uppercase tracking-wider">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Hidden HTML5 Audio Element for Playback Sync */}
      <audio 
        ref={audioRef} 
        src={customAudioUrl || (activeArchiveId && activeArchiveId.startsWith("seed-") ? (DEMO_INTERVIEWS.find(d => d.id === activeArchiveId.replace("seed-", ""))?.audioUrl || "") : "")} 
        preload="auto"
      />

      {/* HEADER BAR */}
      <header id="app-header" className="border-b border-border-dark bg-panel-bg sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-accent-blue rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">TR</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-xs font-semibold tracking-wide uppercase text-white opacity-90">
                TR-Altyazı Automator v2.4
              </h1>
              <span className="text-[9px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded border border-accent-blue/30 font-mono font-bold uppercase">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#BBB]">
              Türkçe röportajlar için TDK uyumlu otomatik deşifre • Proje: Röportaj_Final_V3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Secret verification Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] uppercase font-bold tracking-wider ${
            hasGeminiKey 
              ? "bg-[#1473E6]/10 text-accent-blue border-accent-blue/30" 
              : "bg-amber-950/20 text-amber-400 border-amber-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasGeminiKey ? "bg-accent-blue animate-pulse" : "bg-amber-500"}`} />
            <span>
              {hasGeminiKey ? "Gemini 3.5-Flash Aktif" : "API Anahtarı Eksik (Demo)"}
            </span>
          </div>

          <a 
            href="https://ai.studio/build" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[10px] uppercase font-bold text-[#BBB] hover:text-white transition flex items-center gap-1.5 bg-[#262626] px-3 py-1.5 rounded border border-border-dark"
          >
            <HelpCircle className="w-3.5 h-3.5 text-accent-blue" />
            <span>Destek</span>
          </a>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <main id="app-main" className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: UPLOAD, DEMO & ADJUSTMENTS (lg:col-span-4) */}
        <section id="sidebar-left" className="lg:col-span-4 flex flex-col gap-5">
          
          {/* 1. MEDIA UPLOAD & AUTO TRANSCRIPTION */}
          <div id="media-upload-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white opacity-80 mb-3.5">
              <Sparkles className="w-4 h-4 text-accent-blue" />
              <span>1. Medya Deşifre Et (Voice-to-Text)</span>
            </h2>

            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileUpload}
              className={`border border-dashed rounded p-6 text-center transition cursor-pointer relative ${
                dragOver 
                  ? "border-accent-blue bg-[#1473E6]/10" 
                  : "border-border-light bg-editor-bg hover:border-[#444] hover:bg-item-hover"
              }`}
            >
              <input 
                id="file-input-element"
                type="file" 
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isTranscribing}
              />
              
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded bg-[#1e1e1e] border border-border-dark flex items-center justify-center text-neutral-400">
                  <Upload className="w-5 h-5 text-accent-blue" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sürükle bırak veya bilgisayarından seç</p>
                  <p className="text-[10px] text-[#A0A0A0] mt-1 font-mono uppercase tracking-wide">MP3, WAV, M4A, MP4 (Maks. 25MB)</p>
                </div>
              </div>
            </div>

            {/* Premiere Pro Timeline Track Audio Transcribe */}
            {isCEP && (
              <div className="mt-4 p-4 rounded bg-[#1e1e1e] border border-border-dark flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-accent-blue" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Timeline Ses Kanalı Seç (A1, A2...)</span>
                  </div>
                  <button 
                    onClick={refreshAudioTracks}
                    className="text-[10px] text-accent-blue hover:underline font-bold cursor-pointer"
                  >
                    Kanalları Yenile
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedTrackIndex}
                    onChange={(e) => setSelectedTrackIndex(Number(e.target.value))}
                    className="flex-1 bg-editor-bg border border-border-dark rounded px-3 py-2 text-xs text-[#D1D1D1] outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value={-1}>Tüm Kanallar (Miksaj)</option>
                    {audioTracks.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {name} (A{idx + 1})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleTranscribeTimelineAudio}
                    disabled={isTranscribing}
                    className="px-4 py-2 bg-accent-blue hover:bg-[#1e81ff] disabled:opacity-40 text-white font-bold rounded text-xs transition cursor-pointer active:scale-[0.98]"
                  >
                    Seçili Ses Kanalını Deşifre Et
                  </button>
                </div>
              </div>
            )}

            {/* Transcription Progress Indicator */}
            {isTranscribing && (
              <div className="mt-4 p-4 rounded bg-[#1473E6]/5 border border-accent-blue/30 text-center flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border-2 border-accent-blue/20 border-t-accent-blue animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] text-accent-blue font-bold font-mono animate-pulse">AI</div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Yapay Zeka Türkçe Deşifre Çalışıyor</p>
                  <p className="text-[9px] text-accent-blue mt-1 font-mono tracking-wide animate-pulse">{transcriptionStep}</p>
                </div>
              </div>
            )}

            {/* Active Token Usage & Cost Analysis Box */}
            <div className="mt-3.5 p-3.5 bg-editor-bg border border-border-dark rounded-md flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-border-dark pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Aktif Token & Maliyet Analizi</span>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#888] font-mono border border-border-dark uppercase tracking-wider font-bold">
                  {activeTokenInfo.isDemo ? "Demo Şablonu" : "Kullanıcı Medyası"}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-1.5 bg-[#252525]/40 rounded border border-border-dark/60">
                  <div className="text-[9px] text-gray-400">Giriş (Prompt)</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{activeTokenInfo.promptTokens.toLocaleString()}</div>
                </div>
                <div className="p-1.5 bg-[#252525]/40 rounded border border-border-dark/60">
                  <div className="text-[9px] text-gray-400">Çıkış (Output)</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{activeTokenInfo.candidatesTokens.toLocaleString()}</div>
                </div>
                <div className="p-1.5 bg-[#1473E6]/10 rounded border border-accent-blue/30 col-span-1">
                  <div className="text-[9px] text-accent-blue font-semibold">Toplam</div>
                  <div className="text-xs font-mono font-bold text-accent-blue mt-0.5">{activeTokenInfo.totalTokens.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#1473E6]/5 border border-accent-blue/20 rounded p-2 mt-0.5">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 font-medium leading-tight">Deşifre İşlem Maliyeti (TL)</span>
                  <span className="text-[8px] text-[#A0A0A0] mt-0.5 font-mono leading-tight">Gemini 3.5-Flash resmi birim fiyatları ile</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    ₺{activeTokenInfo.costTRY.toFixed(5)} TL
                  </div>
                  <span className="text-[8px] text-gray-500 font-mono">1 USD = 33.50 ₺</span>
                </div>
              </div>
            </div>

            {!hasGeminiKey && (
              <div className="mt-3 p-3 rounded bg-[#242424] border border-orange-500/10 flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-orange-300/80 leading-relaxed">
                  <span className="font-bold text-orange-400">DEMO MODU:</span> API anahtarı eklemeden aşağıdaki hazır örnek tescilli Türkçe röportajları deşifre edebilirsiniz. Kendi medyanızı deşifre etmek için secrets panelinden <code className="bg-[#111] px-1 py-0.5 rounded text-orange-400 font-mono">GEMINI_API_KEY</code> tanımlayabilirsiniz.
                </div>
              </div>
            )}
          </div>

          {/* 2. DEŞİFRE ARŞİVİ & PROJE KÜTÜPHANESİ */}
          <div id="demo-sampler-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white opacity-80">
                <Layers className="w-4 h-4 text-accent-blue" />
                <span>Deşifre Arşivi & Kütüphanesi</span>
              </h2>
              {archive.length > 0 && (
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Tüm Arşivi Temizle",
                      message: "Arşivinizdeki tüm projeleri ve deşifre edilmiş bütün kayıtları kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
                      onConfirm: () => {
                        setArchive([]);
                        setActiveArchiveId(null);
                        setRawSubtitles([]);
                        setCustomFileName(null);
                        setTokenUsage(null);
                        showToast("Tüm arşiv temizlendi.", "info");
                      }
                    });
                  }}
                  className="text-[9px] text-gray-500 hover:text-red-400 font-mono uppercase font-bold tracking-wider transition cursor-pointer"
                  title="Tüm Arşivi Sıfırla"
                >
                  Temizle
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
              Yüklediğiniz veya deşifre ettiğiniz tüm projeler otomatik olarak tarayıcınızda arşivlenir. İstediğiniz zaman ismini güncelleyebilir ve kaldığınız yerden devam edebilirsiniz.
            </p>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {archive.map((project) => {
                const isActive = activeArchiveId === project.id;
                const isEditing = editingArchiveId === project.id;
                
                return (
                  <div
                    key={project.id}
                    onClick={() => !isEditing && handleSelectArchiveProject(project.id)}
                    className={`flex flex-col text-left p-3.5 rounded border transition relative group ${
                      isActive 
                        ? "bg-[#1473E6]/10 border-accent-blue shadow-inner" 
                        : "bg-item-bg border-transparent hover:border-[#333] hover:bg-item-hover cursor-pointer"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingArchiveTitle}
                          onChange={(e) => setEditingArchiveTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRenameArchiveProject(project.id, editingArchiveTitle);
                            } else if (e.key === "Escape") {
                              setEditingArchiveId(null);
                            }
                          }}
                          className="bg-editor-bg border border-accent-blue text-xs text-white px-2 py-1.5 rounded outline-none flex-1 font-semibold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameArchiveProject(project.id, editingArchiveTitle)}
                          className="p-1.5 bg-[#1473E6] rounded text-white hover:bg-opacity-95 transition"
                          title="Kaydet"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingArchiveId(null)}
                          className="p-1.5 bg-[#333] rounded text-gray-400 hover:text-white transition"
                          title="İptal"
                        >
                          <span className="text-xs font-bold font-mono px-1">X</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between w-full mb-1.5 gap-2">
                          <span className={`text-xs font-bold leading-tight ${isActive ? "text-accent-blue" : "text-white"}`}>
                            {project.title}
                          </span>
                          
                          {/* Hover/Group edit action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingArchiveId(project.id);
                                setEditingArchiveTitle(project.title);
                              }}
                              className="p-1 rounded hover:bg-[#333] text-gray-400 hover:text-white transition"
                              title="Yeniden Adlandır"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteArchiveProject(project.id, e)}
                              className="p-1 rounded hover:bg-[#333] text-gray-400 hover:text-red-400 transition"
                              title="Arşivden Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
                            {project.subtitles.length} ALTYAZI BLOKU
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {project.createdAt}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {archive.length === 0 && (
                <div className="py-6 text-center border border-dashed border-[#333] rounded-md p-4 flex flex-col items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-gray-600" />
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Arşiviniz Boş</span>
                  <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px]">
                    Kendi ses veya videonuzu yükleyerek ilk kaydınızı oluşturun.
                  </p>
                  <button
                    onClick={handleResetArchiveSeeds}
                    className="text-xs text-accent-blue hover:underline font-bold uppercase mt-2"
                  >
                    Örnek Kayıtları Geri Yükle &or;
                  </button>
                </div>
              )}
            </div>

            {archive.length > 0 && (
              <div className="mt-3.5 pt-3.5 border-t border-border-dark flex justify-between items-center text-[10px]">
                <button
                  onClick={handleResetArchiveSeeds}
                  className="text-gray-400 hover:text-white font-medium hover:underline transition"
                >
                  Varsayılan Şablonları Geri Yükle
                </button>
                <span className="text-gray-500 font-mono uppercase">
                  Toplam: {archive.length} Proje
                </span>
              </div>
            )}
          </div>

          {/* 3. PARAMS & ADJUSTMENTS (CRITICAL REQUIREMENT) */}
          <div id="formatting-params-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white opacity-80">
                <Settings className="w-4 h-4 text-accent-blue" />
                <span>Altyazı Stili ve Parametre Ayarları</span>
              </h2>
            </div>

            <div className="space-y-4">
              {/* Max Words Count Slider */}
              <div className="p-3 bg-editor-bg rounded border border-border-dark">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase font-semibold text-[#D1D1D1]">Altyazı Başına Maks. Kelime</label>
                  <span className="text-xs font-mono font-bold text-accent-blue bg-[#1473E6]/15 px-2 py-0.5 rounded">
                    {params.maxWords}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="15" 
                  value={params.maxWords} 
                  onChange={(e) => setParams(prev => ({ ...prev, maxWords: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-[#1E1E1E] rounded-lg appearance-none cursor-pointer accent-[#1473E6]"
                />
                <div className="flex justify-between text-[9px] font-mono text-gray-500 mt-1 uppercase">
                  <span>2 Kelime (Dinamik)</span>
                  <span>15 Kelime (Blok)</span>
                </div>
              </div>

              {/* Max Characters Count Slider */}
              <div className="p-3 bg-editor-bg rounded border border-border-dark">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase font-semibold text-[#D1D1D1]">Altyazı Başına Maks. Karakter</label>
                  <span className="text-xs font-mono font-bold text-accent-blue bg-[#1473E6]/15 px-2 py-0.5 rounded">
                    {params.maxChars}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="80" 
                  value={params.maxChars} 
                  onChange={(e) => setParams(prev => ({ ...prev, maxChars: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-[#1E1E1E] rounded-lg appearance-none cursor-pointer accent-[#1473E6]"
                />
                <div className="flex justify-between text-[9px] font-mono text-gray-500 mt-1 uppercase">
                  <span>10 Karakter</span>
                  <span>80 Karakter (Geniş)</span>
                </div>
              </div>

              {/* Gap between consecutive subtitles (CRITICAL REQUIREMENT) */}
              <div className="p-3 bg-editor-bg rounded border border-border-dark">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase font-semibold text-[#D1D1D1]">En Az Altyazı Arası Boşluk</label>
                  <span className="text-xs font-mono font-bold text-accent-blue bg-[#1473E6]/15 px-2 py-0.5 rounded">
                    {(params.gapSeconds).toFixed(2)}s ({Math.round(params.gapSeconds * 1000)}ms)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={params.gapSeconds} 
                  onChange={(e) => setParams(prev => ({ ...prev, gapSeconds: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-[#1E1E1E] rounded-lg appearance-none cursor-pointer accent-[#1473E6]"
                />
                <div className="flex justify-between text-[9px] font-mono text-gray-500 mt-1 uppercase">
                  <span>0 Fr (0ms)</span>
                  <span>5 Fr (200ms)</span>
                </div>
                <p className="text-[9px] text-[#A0A0A0] mt-2 italic leading-relaxed">
                  * Profesyonel kurguda iki altyazı arasına boşluk bırakılması göz algısını rahatlatır ve Premiere Pro timeline çakışmasını engeller.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: PLAYER & SUBTITLE INTERACTIVE TIMELINE (lg:col-span-12 xl:col-span-5) */}
        <section id="col-middle" className="lg:col-span-5 flex flex-col gap-5">
          
          {/* AUDIO SYNC PLAYBACK BAR */}
          <div id="media-player-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-accent-blue" />
                <span className="text-xs font-bold uppercase tracking-wider text-white opacity-85">Senkronize Önizleme Oynatıcısı</span>
              </div>
              <span className="text-[10px] text-gray-400 bg-editor-bg px-2 py-0.5 rounded border border-border-dark font-mono uppercase">
                {customFileName ? `${customFileName}` : "Demo Sesi Aktif"}
              </span>
            </div>

            {/* WAVEFORM VISUALIZATION TRACK */}
            <div className="bg-editor-bg rounded p-4 border border-border-dark relative overflow-hidden mb-4">
              <div className="flex items-end justify-center h-16 gap-0.5 opacity-80 select-none">
                {Array.from({ length: 48 }).map((_, i) => {
                  const baseHeight = Math.abs(Math.sin(i / 3) * 60) + 10;
                  const isActive = (currentTime / (stats.totalDuration || 1)) >= (i / 48);
                  return (
                    <div
                      key={i}
                      style={{ height: `${baseHeight}%` }}
                      className={`w-1.5 rounded-sm transition-all duration-300 ${
                        isActive 
                          ? isPlaying 
                            ? "bg-accent-blue animate-pulse" 
                            : "bg-accent-blue" 
                          : "bg-[#333333]"
                      }`}
                    />
                  );
                })}
              </div>

              {/* FLOATING SUBTITLE WATERMARK LIVE OVERLAY */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-3 text-center pointer-events-none">
                <AnimatePresence mode="wait">
                  {activeSubtitle ? (
                    <motion.div
                      key={activeSubtitle.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      className="text-xs font-semibold text-white bg-black/85 px-4 py-2 rounded border border-accent-blue/30 max-w-full text-center inline-block"
                    >
                      {activeSubtitle.text}
                    </motion.div>
                  ) : (
                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">[ Sessiz Bölge ]</span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* PLAYBACK INTERACTIVE SCRUBBER */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-accent-blue w-12 text-left">
                  {currentTime.toFixed(2)}s
                </span>
                <input 
                  type="range" 
                  min="0" 
                  max={stats.totalDuration || 10} 
                  step="0.05"
                  value={currentTime} 
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-[#1E1E1E] rounded-lg appearance-none cursor-pointer accent-[#1473E6]"
                />
                <span className="text-xs font-mono text-gray-400 w-12 text-right">
                  {stats.totalDuration.toFixed(2)}s
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleSeek(0)}
                    className="p-2 rounded bg-editor-bg border border-border-dark hover:bg-item-hover transition"
                    title="Başa Dön"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                  </button>
                  <button 
                    onClick={togglePlayback}
                    className="flex items-center gap-2 px-4 py-1.5 rounded bg-accent-blue hover:bg-[#1e81ff] text-white font-bold text-xs transition active:scale-[0.98]"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? "DURAKLAT" : "OYNAT"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hız:</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="bg-editor-bg text-xs border border-border-dark rounded px-2 py-1 text-white cursor-pointer font-bold outline-none"
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* GLOBAL SEARCH AND REPLACE */}
          <div id="search-replace-card" className="bg-panel-bg border border-border-dark rounded p-4 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white opacity-85">
              <Search className="w-3.5 h-3.5 text-accent-blue" />
              <span>Bul ve Değiştir (İsim / Kelime Onar)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Aranan (Örn: ahmet)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-editor-bg text-xs border border-border-dark rounded px-2.5 py-1.5 text-white placeholder-gray-600 font-medium outline-none focus:border-accent-blue"
              />
              <input
                type="text"
                placeholder="Yeni (Örn: Ahmet)"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                className="bg-editor-bg text-xs border border-border-dark rounded px-2.5 py-1.5 text-white placeholder-gray-600 font-medium outline-none focus:border-accent-blue"
              />
            </div>
            <button
              onClick={handleGlobalReplace}
              className="w-full bg-[#333] hover:bg-[#3d3d3d] border border-border-dark text-[#EEE] text-xs font-bold uppercase tracking-wider py-2 rounded transition active:scale-[0.98]"
            >
              Tüm Altyazılarda Değiştir
            </button>
          </div>

          {/* ACTIVE SUBTITLE LIST */}
          <div className="bg-panel-bg border border-border-dark rounded p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-white opacity-85">Altyazı Satırları & Düzenleyici</h2>
                <p className="text-[10px] text-gray-400 mt-1">Canlı düzenlemek veya zamanlamasını değiştirmek için satırlara tıklayın.</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-editor-bg border border-[#444] hover:bg-[#333] transition text-[10px] font-bold uppercase tracking-wider text-accent-blue"
                >
                  <Plus className="w-3 h-3" />
                  <span>Satır Ekle</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-editor-bg border border-border-dark text-red-500 hover:bg-red-950/20 transition text-[10px] font-bold uppercase tracking-wider"
                  title="Temizle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sıfırla</span>
                </button>
              </div>
            </div>

            {/* Subtile Filter Search Input */}
            <div className="relative mb-3.5">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Altyazı metinlerinde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-editor-bg border border-border-dark rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-accent-blue"
              />
            </div>

            {/* List Container */}
            <div 
              ref={listContainerRef}
              className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto space-y-2 pr-1 text-left"
            >
              <AnimatePresence initial={false}>
                {displayFilteredSubtitles.map((sub, index) => {
                  const isHighlighted = currentTime >= sub.start && currentTime <= sub.end;
                  const wordCount = sub.text.trim().split(/\s+/).length;
                  const charCount = sub.text.length;

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleSeek(sub.start)}
                      className={`p-3 rounded border transition cursor-pointer relative ${
                        isHighlighted 
                          ? "bg-[#1473E6]/10 border-accent-blue" 
                          : "bg-item-bg hover:bg-item-hover border-transparent hover:border-[#333]"
                      }`}
                    >
                      {/* Subtitle Index Pin */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-gray-500">#{index + 1}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-editor-bg border border-border-dark px-2 py-0.5 rounded text-[#D1D1D1]">
                            <Clock className="w-3 h-3 text-accent-blue" />
                            <span>{sub.start.toFixed(2)}s - {sub.end.toFixed(2)}s</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-[#1E1E1E] border border-border-dark px-1.5 py-0.5 rounded font-mono text-gray-400 font-bold">
                            {wordCount} KELİME
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 border rounded font-mono font-bold ${
                            charCount > params.maxChars 
                              ? "bg-orange-950/20 text-orange-400 border-orange-500/20" 
                              : "bg-[#1E1E1E] text-gray-400 border-border-dark"
                          }`}>
                            {charCount} KARAKTER
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSub(sub.id); }}
                            className="p-1 rounded hover:bg-[#333] text-gray-500 hover:text-red-400 transition"
                            title="Satırı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive timing editors */}
                      {activeEditingId === sub.id ? (
                        <div className="grid grid-cols-2 gap-2 mb-2 bg-[#1E1E1E] p-2 rounded border border-border-dark" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[9px] text-[#A0A0A0] block mb-0.5 font-bold uppercase tracking-wide">Giriş Zamanı (s)</label>
                            <input 
                              type="number" 
                              step="0.05"
                              value={sub.start} 
                              onChange={(e) => handleEditTimestamps(sub.id, "start", e.target.value)}
                              className="bg-panel-bg border border-border-dark px-2 py-1 text-xs text-white rounded w-full font-mono outline-none focus:border-accent-blue"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#A0A0A0] block mb-0.5 font-bold uppercase tracking-wide">Çıkış Zamanı (s)</label>
                            <input 
                              type="number" 
                              step="0.05"
                              value={sub.end} 
                              onChange={(e) => handleEditTimestamps(sub.id, "end", e.target.value)}
                              className="bg-panel-bg border border-border-dark px-2 py-1 text-xs text-white rounded w-full font-mono outline-none focus:border-accent-blue"
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* Subtitle text editor textarea */}
                      <textarea
                        value={sub.text}
                        onChange={(e) => handleEditSubtitleText(sub.id, e.target.value)}
                        onClick={(e) => { e.stopPropagation(); setActiveEditingId(sub.id); }}
                        onBlur={() => setTimeout(() => setActiveEditingId(null), 300)}
                        className="w-full bg-transparent text-xs text-[#EEE] outline-none resize-none font-semibold leading-relaxed max-h-16 border-t border-transparent focus:border-accent-blue/30 pt-1 focus:text-white"
                        placeholder="Altyazı metni..."
                        rows={2}
                      />
                    </motion.div>
                  );
                })}

                {displayFilteredSubtitles.length === 0 && (
                  <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                    <Trash2 className="w-10 h-10 text-gray-700" />
                    <span className="text-xs uppercase font-bold tracking-wider">Hiçbir altyazı bulunamadı.</span>
                    <button 
                      onClick={() => {
                        const original = archive.find(p => p.id === activeArchiveId);
                        if (original) {
                          setRawSubtitles(original.subtitles);
                        } else {
                          setRawSubtitles(DEMO_INTERVIEWS[0].subtitles);
                        }
                      }} 
                      className="text-accent-blue hover:underline text-xs mt-2 font-bold uppercase tracking-wide"
                    >
                      Bulunan Projeyi Geri Yükle
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: PREMIERE PRO EXPORT & LINGUISTIC ENGINE (lg:col-span-12 xl:col-span-3 lg:col-span-3) */}
        <section id="sidebar-right" className="lg:col-span-3 flex flex-col gap-5">
          
          {/* EXPORT OPTIONS */}
          <div id="export-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white opacity-85">
              <Download className="w-4 h-4 text-accent-blue" />
              <span>Premiere Pro Al / Dışa Aktar</span>
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* Premiere Pro Direct Import button */}
              {isCEP && (
                <button
                  onClick={handleImportToPremiere}
                  disabled={formattedSubtitles.length === 0}
                  className="w-full flex items-center justify-between p-3 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold transition text-xs text-left cursor-pointer active:scale-[0.98] border border-green-700 shadow-md mb-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[9px] text-white">PPRO</span>
                    <div>
                      <span className="block uppercase tracking-wider">Premiere Pro'ya Aktar</span>
                      <span className="block text-[8px] opacity-90 font-normal">Doğrudan Project Panel'e</span>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-orange-300 animate-pulse animate-duration-1000" />
                </button>
              )}

              {/* Gold standard SRT button */}
              <button
                onClick={handleDownloadSRT}
                disabled={formattedSubtitles.length === 0}
                className="w-full flex items-center justify-between p-3 rounded bg-accent-blue hover:bg-[#1e81ff] disabled:opacity-40 text-white font-bold transition text-xs text-left cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[9px] text-white">SRT</span>
                  <div>
                    <span className="block uppercase tracking-wider">Premiere SRT İndir</span>
                    <span className="block text-[8px] opacity-75 font-normal">TDK & İmla Uyumlu Çıktı</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Advanced XML Marker Button (editors love this) */}
              <button
                onClick={handleDownloadXMLMarkers}
                disabled={formattedSubtitles.length === 0}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-editor-bg border border-border-dark hover:border-[#444] disabled:opacity-45 text-[#D1D1D1] transition text-xs text-left rounded cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-[#111] text-accent-blue font-mono text-[9px] font-bold">XML</span>
                  <div>
                    <span className="block font-bold uppercase tracking-wide">Timeline Marker İndir</span>
                    <span className="block text-[8px] text-gray-500">Seçim noktası markerları</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {/* Copy / VTT triggers */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  disabled={formattedSubtitles.length === 0}
                  className="bg-editor-bg border border-border-dark text-[#D1D1D1] text-[10px] py-2 rounded font-bold uppercase tracking-wider hover:border-[#444] transition active:scale-[0.98] cursor-pointer"
                >
                  Panoya Kopyala
                </button>
                <button
                  onClick={handleDownloadVTT}
                  disabled={formattedSubtitles.length === 0}
                  className="bg-editor-bg border border-border-dark text-[#D1D1D1] text-[10px] py-2 rounded font-bold uppercase tracking-wider hover:border-[#444] transition active:scale-[0.98] cursor-pointer"
                >
                  Web VTT İndir
                </button>
              </div>
            </div>

            {/* Step-by-Step workflow explanation */}
            <div className="p-3 bg-editor-bg text-gray-400 border border-border-dark rounded">
              <span className="text-[10px] font-bold text-white mb-1.5 block uppercase tracking-wider">
                Premiere Pro SRT Import Metodu:
              </span>
              <ul className="text-[9px] space-y-1.5 list-decimal pl-3.5 text-gray-400 leading-relaxed font-semibold">
                <li>Uygulamadan indirdiğiniz <code className="bg-[#111] px-1 rounded text-accent-blue font-mono">_premiere.srt</code> dosyasını Premiere Pro projenize sürükleyin.</li>
                <li>Import aşamasında formatı <span className="text-white">SubRip</span> ve stilini <span className="text-white">Caption (Subtitle)</span> seçin.</li>
                <li>Altyazıları timeline'da seçerek <span className="text-accent-blue">Essential Graphics</span> panelinden font, gölge, dolguyu tek adımda özelleştirin!</li>
              </ul>
            </div>
          </div>

          {/* TURKISH QUALITY TDK COMPLIANCE ENGINE */}
          <div id="linguistic-checker-card" className="bg-panel-bg border border-border-dark rounded p-5 shadow-inner flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-blue" />
                <span className="text-xs font-bold uppercase tracking-wider text-white opacity-85">TDK Dil ve Denetim Raporu</span>
              </div>
              <span className="text-[9px] font-mono text-accent-blue bg-[#1473E6]/10 px-2 py-0.5 rounded font-bold border border-accent-blue/20">
                {linguisticIssues.length} UYARI
              </span>
            </div>

            {/* Big automated repair button */}
            {linguisticIssues.length > 0 && (
              <button
                onClick={handleAutoFixAllGrammar}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue transition text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent-blue animate-bounce" />
                <span>Hataları Otomatik Onar</span>
              </button>
            )}

            {/* List of issues */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 text-left pr-1">
              {linguisticIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className={`p-3 rounded border text-xs flex flex-col gap-1.5 ${
                    issue.severity === "error" 
                      ? "bg-red-950/10 border-red-500/20 text-[#FFD1D1]" 
                      : issue.severity === "warning" 
                        ? "bg-amber-950/10 border-amber-500/20 text-[#FFE4C4]" 
                        : "bg-editor-bg border-border-dark text-[#D1D1D1]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      issue.severity === "error" 
                        ? "bg-red-500/10 text-red-400" 
                        : issue.severity === "warning" 
                          ? "bg-amber-500/10 text-amber-400" 
                          : "bg-editor-bg text-gray-400"
                    }`}>
                      {issue.message}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-gray-500">SATIR #{issue.subtitleIndex}</span>
                  </div>
                  
                  <p className="text-[10px] text-gray-300 leading-relaxed font-medium">{issue.details}</p>

                  {issue.fixable && issue.suggestedFix && (
                    <button
                      onClick={() => handleFixIndividual(issue)}
                      className="self-end flex items-center gap-1 px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] bg-accent-blue/10 text-accent-blue hover:bg-accent-blue hover:text-white rounded transition cursor-pointer"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Hızlı Düzelt</span>
                    </button>
                  )}
                </div>
              ))}

              {linguisticIssues.length === 0 && (
                <div className="py-6 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-1 bg-editor-bg/50 rounded border border-border-dark/50 font-medium">
                  <CheckCircle2 className="w-8 h-8 text-semibold text-gray-700" />
                  <span>Türkçe deşifre kalitesi standartlara uygun.</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Adobe Style Bottom Status Bar */}
      <footer className="h-8 bg-[#222222] border-t border-border-dark px-4 flex items-center justify-between shrink-0 font-sans mt-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-white opacity-80">HAZIR</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono italic select-none">AI Engine v4.0.1 (Turkish Optimized & TDK Checked)</span>
        </div>
        <div className="hidden sm:block w-48 h-1.5 bg-[#111] rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-accent-blue"></div>
        </div>
      </footer>

      {/* Non-blocking Custom Confirm Dialog Modals (React-safe in sandboxed iframes) */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#1e1e1e] border border-border-dark max-w-sm w-full rounded-lg p-5 shadow-2xl flex flex-col gap-4 font-sans text-left"
            >
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-border-dark text-white font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{confirmModal.title}</span>
              </div>
              
              <p className="text-[11px] text-gray-300 leading-relaxed font-semibold">
                {confirmModal.message}
              </p>
              
              <div className="flex items-center justify-end gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3.5 py-1.5 rounded bg-[#2e2e2e] hover:bg-[#383838] border border-border-dark/60 text-[10px] text-gray-300 font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-[10px] text-white font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
