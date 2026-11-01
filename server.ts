import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI client lazily or safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("⚠️ Warning: GEMINI_API_KEY is not defined in the environment. AI features will require configuration.");
}

// -------------------------------------------------------------
// Consigne Fondamentale de Fidélité Biblique (Imposée à tous les prompts)
// -------------------------------------------------------------
const BIBLICAL_FIDELITY_DIRECTIVE = "Reste strictement fidèle au texte biblique fourni. Distingue clairement ce que dit le texte de ce qui est interprétation. N'ajoute aucun fait qui ne figure pas dans le passage. Cite les versets (références précises) à l'appui de chaque affirmation. Quand plusieurs lectures existent dans la tradition chrétienne, présente-les sans trancher entre confessions. Si tu n'es pas certain, dis-le.";

// Wrapper résilient et vérifié pour l'API Gemini
async function generateGeminiContent(params: {
  contents: any;
  config?: any;
  model?: string;
  isShortTask?: boolean;
}) {
  if (!ai) {
    throw new Error("L'API Gemini n'est pas configurée.");
  }
  
  const originalConfig = params.config || {};
  let systemInstruction = originalConfig.systemInstruction || "";
  
  // Ne plus ajouter automatiquement « Écris de manière très concise ».
  // Garder cette consigne seulement pour les petites tâches (définitions courtes).
  if (params.isShortTask) {
    if (systemInstruction) {
      systemInstruction = `${systemInstruction} Écris de manière synthétique et directe, sans préambule superflu.`;
    }
  }

  // Température fixée à 0.3 pour limiter les inventions et garantir la fidélité textuelle
  const temperature = originalConfig.temperature !== undefined ? originalConfig.temperature : 0.3;

  const optimizedConfig = {
    ...originalConfig,
    temperature,
    ...(systemInstruction ? { systemInstruction } : {})
  };

  // Liste ordonnée de modèles Gemini officiels, vérifiés et supportés
  const primaryModel = params.model || "gemini-3.8-flash";
  const candidateModels = Array.from(new Set([
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ]));

  let lastError: any = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      if (i > 0) {
        // Un modèle de secours est utilisé : consigner explicitement dans les logs du serveur
        console.warn(`[Gemini Fallback] Le modèle initial "${candidateModels[0]}" a échoué (${lastError?.message || lastError}). Basculement vers le modèle de secours : "${modelName}"`);
      }

      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: optimizedConfig
      });
    } catch (error: any) {
      lastError = error;
      const errorStr = String(error?.message || error || "");
      const isTransientOrAvailable = 
        errorStr.includes("503") || 
        errorStr.includes("UNAVAILABLE") || 
        errorStr.includes("demand") || 
        errorStr.includes("Resource has been exhausted") ||
        errorStr.includes("429") ||
        errorStr.includes("not found") ||
        errorStr.includes("404");

      if (isTransientOrAvailable) {
        console.warn(`[Gemini Retry] Modèle "${modelName}" indisponible (${errorStr}), basculement vers le modèle suivant...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Tous les modèles d'IA sont temporairement occupés.");
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    aiConfigured: !!ai,
    time: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// Firebase Admin SDK & Security Configuration
// -------------------------------------------------------------
const FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "auspicious-parity-nlkqp";
const FIRESTORE_DB_ID = process.env.FIRESTORE_DB_ID || process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-1f341b39-c896-4f00-8ba3-4f9bbd271637";
const FIRESTORE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";

if (!getAdminApps().length) {
  try {
    initAdminApp({
      projectId: FIREBASE_ADMIN_PROJECT_ID
    });
  } catch (adminInitErr) {
    console.warn("Firebase Admin SDK init warning:", adminInitErr);
  }
}
const adminAuth = getAdminAuth();

// Per-user Rate Limiting Cache
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const userRateLimits = new Map<string, RateLimitEntry>();

function createPerUserRateLimiter(maxRequests: number, windowSeconds: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const key = user?.uid || req.ip || "unknown";
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let entry = userRateLimits.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      userRateLimits.set(key, entry);
      return next();
    }

    if (entry.count >= maxRequests) {
      const waitSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
      res.status(429).json({
        error: `Limite de requêtes atteinte (${maxRequests} requêtes/${windowSeconds}s). Veuillez patienter ${waitSeconds} seconde(s).`,
        retryAfter: waitSeconds
      });
      return;
    }

    entry.count++;
    next();
  };
}

// Middleware: Authenticate requests using Firebase ID token (Bearer <token> or query ?token=)
async function verifyFirebaseTokenMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer "))
    ? authHeader.substring(7).trim()
    : (req.query.token as string || null);

  if (!token) {
    res.status(401).json({ 
      error: "Authentification requise. Veuillez vous connecter pour accéder à cette fonctionnalité." 
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (tokenErr: any) {
    console.warn("Échec de vérification du jeton Firebase:", tokenErr?.message || tokenErr);
    res.status(401).json({ 
      error: "Jeton de session invalide ou expiré. Veuillez vous reconnecter." 
    });
  }
}

// Apply authentication & per-user rate limiting to all /api/gemini and /api/audio routes
app.use("/api/gemini", verifyFirebaseTokenMiddleware, createPerUserRateLimiter(45, 60));
app.use("/api/audio", verifyFirebaseTokenMiddleware, createPerUserRateLimiter(60, 60));

// Audio validation & transcode helpers
const AUDIO_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;
function isValidAudioId(audioId: unknown): audioId is string {
  return typeof audioId === "string" && AUDIO_ID_REGEX.test(audioId);
}

const AUDIO_CACHE_DIR = "/tmp/audio_cache";
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  try {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  } catch (_) {}
}

function findCachedAudioFile(audioId: string): string | null {
  const possibleFiles = [
    path.join(AUDIO_CACHE_DIR, `${audioId}.mp3`),
    path.join(AUDIO_CACHE_DIR, `${audioId}.mp4`),
    path.join(AUDIO_CACHE_DIR, `${audioId}.webm`),
    path.join(AUDIO_CACHE_DIR, audioId)
  ];
  return possibleFiles.find(f => fs.existsSync(f)) || null;
}

// -------------------------------------------------------------
// Audio Transcoding & Streaming Endpoints (Secured & Token-Verified)
// -------------------------------------------------------------
// Transcode Audio using spawn with array arguments (never execSync with string)
app.post("/api/audio/upload", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioId, mimeType, base64Data, filename } = req.body;
    if (!isValidAudioId(audioId)) {
      res.status(400).json({ error: "audioId invalide (format requis : ^[a-zA-Z0-9_-]{1,100}$)" });
      return;
    }

    if (!base64Data) {
      res.status(400).json({ error: "base64Data requis" });
      return;
    }

    const rawBuffer = Buffer.from(base64Data, 'base64');
    let finalBuffer = rawBuffer;
    let finalMimeType = mimeType || 'audio/webm';
    let ext = 'mp3';

    // Transcode using ffmpeg via spawn with argument array to MP3 (48kbps mono, 44.1kHz)
    const needsTranscode = finalMimeType.includes('webm') || finalMimeType.includes('ogg') || (!finalMimeType.includes('mp4') && !finalMimeType.includes('aac') && !finalMimeType.includes('mpeg') && !finalMimeType.includes('mp3'));
    if (needsTranscode) {
      const tempInput = path.join(AUDIO_CACHE_DIR, `${audioId}_temp.webm`);
      const tempOutput = path.join(AUDIO_CACHE_DIR, `${audioId}.mp3`);
      try {
        fs.writeFileSync(tempInput, rawBuffer);
        await new Promise<void>((resolve, reject) => {
          const ffmpegProcess = spawn("ffmpeg", [
            "-y",
            "-i", tempInput,
            "-vn",
            "-acodec", "libmp3lame",
            "-b:a", "48k",
            "-ac", "1",
            "-ar", "44100",
            tempOutput
          ], { stdio: "ignore" });

          ffmpegProcess.on("error", (err) => reject(err));
          ffmpegProcess.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });
        });

        if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
          finalBuffer = fs.readFileSync(tempOutput);
          finalMimeType = 'audio/mpeg';
          ext = 'mp3';
        }
      } catch (transcodeErr) {
        console.warn("FFmpeg transcode fallback to raw:", transcodeErr);
      } finally {
        if (fs.existsSync(tempInput)) {
          try { fs.unlinkSync(tempInput); } catch (_) {}
        }
      }
    } else if (finalMimeType.includes('mp4') || finalMimeType.includes('aac') || finalMimeType.includes('m4a')) {
      finalMimeType = 'audio/mp4';
      ext = 'mp4';
    } else if (finalMimeType.includes('mpeg') || finalMimeType.includes('mp3')) {
      finalMimeType = 'audio/mpeg';
      ext = 'mp3';
    }

    // Save strictly to ephemeral cache /tmp/audio_cache (never to public/ or data/)
    const targetFile = path.join(AUDIO_CACHE_DIR, `${audioId}.${ext}`);
    try { fs.writeFileSync(targetFile, finalBuffer); } catch (_) {}

    const finalBase64 = finalBuffer.toString('base64');

    res.json({
      success: true,
      audioId,
      audioUrl: `/api/audio/${audioId}`,
      mimeType: finalMimeType,
      base64Data: finalBase64,
      sizeBytes: finalBuffer.length
    });
  } catch (err: any) {
    console.error("Audio upload error:", err);
    res.status(500).json({ error: err.message || "Erreur upload audio" });
  }
});

// Check if audio exists in ephemeral cache
app.get("/api/audio/:audioId/info", (req: Request, res: Response): void => {
  const { audioId } = req.params;
  if (!isValidAudioId(audioId)) {
    res.status(400).json({ error: "audioId invalide (format requis : ^[a-zA-Z0-9_-]{1,100}$)" });
    return;
  }

  const targetFile = findCachedAudioFile(audioId);
  if (!targetFile) {
    res.status(404).json({ exists: false, error: "Fichier manquant, ré-importer", missing: true, audioId });
    return;
  }
  const stat = fs.statSync(targetFile);
  res.json({
    exists: true,
    audioId,
    sizeBytes: stat.size,
    ext: path.extname(targetFile),
    audioUrl: `/api/audio/${audioId}`
  });
});

// Stream Audio from ephemeral cache with HTTP 206 Partial Content Range support
app.get("/api/audio/:audioId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioId } = req.params;
    if (!isValidAudioId(audioId)) {
      res.status(400).json({ error: "audioId invalide (format requis : ^[a-zA-Z0-9_-]{1,100}$)" });
      return;
    }

    const targetFile = findCachedAudioFile(audioId);
    if (!targetFile) {
      res.status(404).json({ 
        error: "Fichier manquant dans le cache, lecture directe depuis Cloud Storage requise",
        missing: true,
        audioId
      });
      return;
    }

    const stat = fs.statSync(targetFile);
    const fileSize = stat.size;
    const ext = path.extname(targetFile).toLowerCase();
    let mimeType = 'audio/mpeg';
    if (ext === '.mp4' || ext === '.m4a') mimeType = 'audio/mp4';
    if (ext === '.webm') mimeType = 'audio/webm';

    const range = req.headers.range;
    const isDownload = req.query.download === 'true';
    const dlFilename = (req.query.filename as string) || `${audioId}${ext}`;
    const cleanFilename = dlFilename.endsWith(ext) ? dlFilename : `${dlFilename}${ext}`;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start)) {
        start = Math.max(0, fileSize - end);
        end = fileSize - 1;
      }

      if (start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Accept-Ranges': 'bytes'
        });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(targetFile, { start, end });
      const headers: Record<string, any> = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      };
      if (isDownload) {
        headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(cleanFilename)}"`;
      }
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      const headers: Record<string, any> = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      };
      if (isDownload) {
        headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(cleanFilename)}"`;
      }
      res.writeHead(200, headers);
      fs.createReadStream(targetFile).pipe(res);
    }
  } catch (err: any) {
    console.error("Audio stream error:", err);
    res.status(500).json({ error: err.message || "Erreur streaming audio" });
  }
});

// Delete audio from ephemeral cache
app.delete("/api/audio/:audioId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioId } = req.params;
    if (!isValidAudioId(audioId)) {
      res.status(400).json({ error: "audioId invalide (format requis : ^[a-zA-Z0-9_-]{1,100}$)" });
      return;
    }

    const possibleFiles = [
      path.join(AUDIO_CACHE_DIR, `${audioId}.mp3`),
      path.join(AUDIO_CACHE_DIR, `${audioId}.mp4`),
      path.join(AUDIO_CACHE_DIR, `${audioId}.webm`),
      path.join(AUDIO_CACHE_DIR, audioId)
    ];

    possibleFiles.forEach(f => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    });

    res.json({ success: true, audioId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erreur suppression audio" });
  }
});

// Helper server-side markdown cleaner to sanitize AI responses
function cleanMarkdownServer(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^#+\s*(.*?)\s*$/gm, '$1')
    .replace(/^[\*\-]\s*\*\*(.*?)\*\*/gm, '• $1')
    .replace(/^[\*\-]\s+/gm, '• ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(^|[^\*])\*(?!\*)(.*?)\*(?!\*)/g, '$1$2')
    .replace(/(^|[^_])_(?!_)(.*?)(?!_)_/g, '$1$2')
    .replace(/[\*#_]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Explain a verse
app.post("/api/gemini/explain", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée. Veuillez ajouter GEMINI_API_KEY dans vos secrets." });
      return;
    }
    const { verseText, reference, bookName } = req.body;
    if (!verseText) {
      res.status(400).json({ error: "Paramètres manquants: verseText requis." });
      return;
    }

    const prompt = `Voici le verset "${verseText}" correspondant à la référence "${reference || 'Inconnue'}" dans le livre "${bookName || 'Inconnu'}".
Explique ce verset de manière complète, approfondie mais claire selon le plan suivant :
1. Contexte historique et littéraire du passage.
2. Sens et explication théologique des termes clés ou des concepts du texte original.
3. Application concrète et leçon pratique pour notre vie quotidienne aujourd'hui.

CONSIGNES STRICTES :
- ${BIBLICAL_FIDELITY_DIRECTIVE}
- N'utilise aucun symbole Markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Écris les titres de section sur une ligne seule, suivie de phrases ou de lignes simples.
- Fournis une réponse complète mais claire, sans précipitation ni coupure.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        systemInstruction: `Tu es un assistant biblique érudit, sage et bienveillant. Tu aides à comprendre la Bible Louis Segond en français. ${BIBLICAL_FIDELITY_DIRECTIVE} Fournis une réponse complète mais claire. N'utilise aucun symbole Markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Écris les titres de section sur une ligne seule, suivie de phrases ou de lignes simples.`,
      }
    });

    res.json({ explanation: cleanMarkdownServer(response.text) });
  } catch (error: any) {
    console.error("Error in explain endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur de communication avec l'assistant biblique." });
  }
});

// Summarize a chapter
app.post("/api/gemini/summarize", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée." });
      return;
    }
    const { bookName, chapterNum, verses } = req.body;
    if (!bookName || !chapterNum) {
      res.status(400).json({ error: "Paramètres manquants: bookName et chapterNum requis." });
      return;
    }

    const versesContent = Array.isArray(verses) 
      ? verses.map(v => `${v.verse}. ${v.text}`).join("\n")
      : "Aucun texte complet fourni localement.";

    const prompt = `Résume le chapitre ${chapterNum} du livre de ${bookName}.
Voici le texte ou le contexte de ce chapitre :
${versesContent}

Explique de manière complète mais claire les thèmes majeurs abordés dans ce chapitre, les personnages ou événements clés, et comment ce chapitre s'insère fidèlement dans le reste du plan biblique.

CONSIGNES STRICTES :
- ${BIBLICAL_FIDELITY_DIRECTIVE}
- N'utilise aucun symbole Markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Écris les titres de section sur une ligne seule, suivie de phrases ou de lignes simples.
- Fournis une réponse complète mais claire.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        systemInstruction: `Tu es un théologien spécialiste de la Bible en français. Tu synthétises des chapitres de manière fidèle, complète mais claire. ${BIBLICAL_FIDELITY_DIRECTIVE} N'utilise aucun symbole Markdown.`,
      }
    });

    res.json({ summary: cleanMarkdownServer(response.text) });
  } catch (error: any) {
    console.error("Error in summarize endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors du résumé du chapitre." });
  }
});

// Analyze multiple notes/journal entries
app.post("/api/gemini/analyze-notes", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée." });
      return;
    }
    const { notes } = req.body;
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      res.status(400).json({ error: "Aucune note fournie pour l'analyse." });
      return;
    }

    const notesSummaryText = notes.map((n, i) => {
      const ref = n.book_id > 0 ? `${n.book_name} ${n.chapter}:${n.verse}` : n.book_name;
      return `Note ${i + 1} (${ref}): "${n.note}"`;
    }).join("\n\n");

    const prompt = `Voici une liste de notes d'étude spirituelle, de méditations personnelles, ou d'exégèses sauvegardées par un utilisateur dans son journal d'étude biblique:
    
${notesSummaryText}

Effectue une analyse spirituelle, théologique et pastorale de ces notes sous la forme d'un rapport bienveillant (en français) comportant :
1. Synthèse et thèmes dominants : Identifie les principaux thèmes spirituels qui émergent de ces notes.
2. Encouragement pastoral : Offre une parole d'édification fraternelle pour encourager l'étudiant dans ses recherches.
3. Versets d'approfondissement recommandés : Suggère 2 ou 3 autres passages bibliques Louis Segond pertinents en rapport direct avec sa réflexion.

CONSIGNES STRICTES :
- ${BIBLICAL_FIDELITY_DIRECTIVE}
- N'utilise aucun symbole Markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Écris les titres de section sur une ligne seule, suivie de phrases ou de lignes simples.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        systemInstruction: `Tu es un guide spirituel, mentor de théologie et pasteur bienveillant. ${BIBLICAL_FIDELITY_DIRECTIVE} N'utilise aucun symbole Markdown.`,
      }
    });

    res.json({ analysis: cleanMarkdownServer(response.text) });
  } catch (error: any) {
    console.error("Error in analyze-notes endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la génération de la synthèse spirituelle." });
  }
});

// Deepen/Elaborate on a single note
app.post("/api/gemini/deepen-note", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée." });
      return;
    }
    const { note, bookName, chapter, verse } = req.body;
    if (!note) {
      res.status(400).json({ error: "Texte de la note manquant." });
      return;
    }

    const reference = bookName ? `du passage ${bookName} ${chapter}:${verse}` : "de sa méditation";
    const prompt = `Voici une note personnelle rédigée ou enregistrée par un étudiant de la Bible à propos ${reference} :
    
"${note}"

Fournis un approfondissement théologique et philologique complet en français basé sur cette note :
1. Éclairage théologique et exégèse : Apporte d'autres vérités bibliques ou doctrinaires qui complètent sa réflexion avec citations précises.
2. Étude linguistique (grec/hébreu) : Si applicable, mentionne une ou deux racines d'origine significatives en hébreu ou en grec qui s'y rapportent.
3. Piste de prière ou de méditation : Donne une prière courte d'inspiration ou une question d'introspection spirituelle liée à sa note.

CONSIGNES STRICTES :
- ${BIBLICAL_FIDELITY_DIRECTIVE}
- N'utilise aucun symbole Markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Écris les titres de section sur une ligne seule, suivie de phrases ou de lignes simples.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        systemInstruction: `Tu es un assistant universitaire en théologie et langues bibliques. ${BIBLICAL_FIDELITY_DIRECTIVE} N'utilise aucun symbole Markdown.`,
      }
    });

    res.json({ deepenedContent: cleanMarkdownServer(response.text) });
  } catch (error: any) {
    console.error("Error in deepen-note endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de l'approfondissement de la note." });
  }
});

// Analyze emotional tone of oral or written spiritual note and suggest custom verses/Psalms
app.post("/api/gemini/analyze-emotion", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée pour l'analyse émotionnelle." });
      return;
    }
    const { noteText, verseReference } = req.body;
    if (!noteText || !noteText.trim()) {
      res.status(400).json({ error: "Texte de la note ou de la transcription vocale requis." });
      return;
    }

    const referenceContext = verseReference ? `associée au verset "${verseReference}"` : "";
    const prompt = `Voici une note ou réflexion spirituelle (écrite ou transcrite par dictée vocale) d'un utilisateur ${referenceContext} :
    
"${noteText}"

Analyse avec sensibilité, empathie et profondeur spirituelle le ton émotionnel qui s'en dégage.
${BIBLICAL_FIDELITY_DIRECTIVE}

Tu dois renvoyer STRICTEMENT un objet JSON structuré en français contenant :
1. "detectedEmotion" : Un titre court décrivant l'ambiance émotionnelle repérée (p.ex. "Frustration & Doute", "Gratitude & Joie pure", "Recherche de paix & Inquiétude", "Sérénité & Contemplation").
2. "emotionalSummary" : Un résumé de 1 à 2 phrases compatissantes sur ce qui touche l'utilisateur dans sa réflexion.
3. "pastoralEncouragement" : Un paragraphe d'accompagnement spirituel fraternel, pastoral et inspirant pour fortifier et élever l'esprit de l'utilisateur.
4. "suggestedVerses" : Un tableau d'exactement 2 ou 3 passages bibliques (de préférence des PSAUMES pour l'expression de l'âme, ou d'autres versets d'encouragement clairs), contenant pour chacun :
   - reference : la référence biblique exacte (ex : "Psaumes 34:18")
   - text : le verset ou la citation clé en français Louis Segond
   - reason : une phrase expliquant pourquoi cette parole guérit, console ou répond précisément à sa situation d'âme.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedEmotion: { type: Type.STRING },
            emotionalSummary: { type: Type.STRING },
            pastoralEncouragement: { type: Type.STRING },
            suggestedVerses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  reference: { type: Type.STRING },
                  text: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["reference", "text", "reason"]
              }
            }
          },
          required: ["detectedEmotion", "emotionalSummary", "pastoralEncouragement", "suggestedVerses"]
        },
        systemInstruction: `Tu es un directeur d'âme, conseiller pastoral et bibliste doté d'une profonde empathie chrétienne. ${BIBLICAL_FIDELITY_DIRECTIVE}`,
      }
    });

    const outputText = response.text || "{}";
    res.json(JSON.parse(outputText));
  } catch (error: any) {
    console.error("Error in analyze-emotion endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de l'analyse émotionnelle de votre réflexion." });
  }
});

// AI Chatbot Companion
app.post("/api/gemini/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée. Configurez votre clé d'API." });
      return;
    }
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message vide." });
      return;
    }

    const systemInstruction = 
      "Tu es un conseiller biblique bienveillant, érudit et profondément pastoral. " +
      "Tu aides les utilisateurs de l'application 'Bible Mobile' à comprendre les saintes écritures de la Bible Louis Segond en français. " +
      BIBLICAL_FIDELITY_DIRECTIVE;

    // Map history to contents
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        });
      }
    }
    
    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await generateGeminiContent({
      contents: contents,
      config: {
        temperature: 0.3,
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur de l'assistant IA." });
  }
});

// Generate a 30-day personalized biblical reading plan based on spiritual interests/themes using Gemini API
app.post("/api/gemini/generate-reading-plan", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée. Veuillez vérifier GEMINI_API_KEY dans vos secrets." });
      return;
    }
    const { theme, userContext } = req.body;
    if (!theme || typeof theme !== "string" || !theme.trim()) {
      res.status(400).json({ error: "Le thème ou centre d'intérêt spirituel est requis (ex: 'Paix intérieure', 'Courage')." });
      return;
    }

    const cleanTheme = theme.trim();
    const contextNote = userContext && typeof userContext === "string" && userContext.trim() 
      ? `Intention personnelle / situation de l'utilisateur : "${userContext.trim()}".` 
      : "";

    // Load official 66 books from bible-classic.json for accurate validation and mapping
    const biblePath = path.join(process.cwd(), "src/data/bible-classic.json");
    let officialBooks: Array<{ id: number; name: string; chapters_count: number }> = [];
    if (fs.existsSync(biblePath)) {
      try {
        const parsedData = JSON.parse(fs.readFileSync(biblePath, "utf8"));
        officialBooks = parsedData.books || [];
      } catch (e) {
        console.warn("Could not load bible-classic.json for book validation:", e);
      }
    }

    const prompt = `Génère un plan de lecture biblique personnalisé sur 30 jours axé sur le centre d'intérêt spirituel suivant : "${cleanTheme}".
${contextNote}

DIRECTIVES THÉOLOGIQUES ET SPIRITUELLES :
1. Le plan doit comporter EXACTEMENT 30 jours (du Jour 1 au Jour 30) avec une véritable progression spirituelle :
   - Jours 1 à 7 : Fondations, accueil de la grâce, promesses divines et dépose des fardeaux.
   - Jours 8 à 15 : Écoute profonde, affermissement de la foi et transformation du cœur.
   - Jours 16 à 23 : Mise en pratique concrète, courage dans l'épreuve et renouvellement intérieur.
   - Jours 24 à 30 : Persévérance, sérénité durable, louange et témoignage.
2. Pour chaque jour, sélectionne un passage spécifique, authentique et pertinent de la Bible Louis Segond 1910 (Psaumes, Évangiles, Épîtres, Proverbes, Prophètes).
3. Remplis fidèlement pour chacun des 30 jours :
   - "day" : numéro du jour (1 à 30)
   - "title" : titre inspirant du jour (ex: "Le refuge dans la tempête", "Ne vous inquiétez de rien")
   - "bookName" : nom du livre biblique officiel en français (ex: "Psaumes", "Jean", "Philippiens", "Matthieu", "Romains", "Ésaïe", "Proverbes")
   - "chapter" : numéro du chapitre
   - "verseRange" : indication des versets recommandés pour la méditation (ex: "v. 1-8", "v. 4-7", ou "Chapitre entier")
   - "keyVerse" : le verset clé du passage textuellement cité en français Louis Segond
   - "meditationPrompt" : une courte pensée ou question méditative pour guider la prière personnelle.
4. "title" global du plan : un titre édifiant et poétique (ex: "Sentier de Paix Intérieure : 30 jours avec la Parole").
5. "description" : une introduction spirituelle chaleureuse et pastorale (2-3 phrases) sur le parcours proposé.
6. "theme" : le nom du thème spirituel.`;

    const response = await generateGeminiContent({
      contents: prompt,
      model: "gemini-3.8-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            theme: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  bookName: { type: Type.STRING },
                  chapter: { type: Type.INTEGER },
                  verseRange: { type: Type.STRING },
                  keyVerse: { type: Type.STRING },
                  meditationPrompt: { type: Type.STRING }
                },
                required: ["day", "title", "bookName", "chapter", "verseRange", "keyVerse", "meditationPrompt"]
              }
            }
          },
          required: ["title", "description", "theme", "days"]
        },
        systemInstruction: "Tu es un directeur de lecture biblique érudit et pasteur bienveillant. Tu aides les croyants à méditer les Saintes Écritures selon la version Louis Segond 1910."
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("Format de réponse de l'IA invalide.");
    }

    const cleanStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Validate and enrich each day with the canonical book ID and safety checks
    const validatedDays = parsed.days.map((item: any, idx: number) => {
      const dayNum = Number(item.day) || (idx + 1);
      const rawBookName = String(item.bookName || "Psaumes").trim();
      const rawClean = cleanStr(rawBookName);

      let matchedBook = officialBooks.find(b => cleanStr(b.name) === rawClean);
      if (!matchedBook) {
        matchedBook = officialBooks.find(b => rawClean.includes(cleanStr(b.name)) || cleanStr(b.name).includes(rawClean));
      }

      const bookId = matchedBook ? matchedBook.id : 19;
      const bookName = matchedBook ? matchedBook.name : "Psaumes";
      const maxCh = matchedBook ? matchedBook.chapters_count : 150;
      const chapter = Math.min(Math.max(Number(item.chapter) || 1, 1), maxCh);

      return {
        day: dayNum,
        title: item.title || `Jour ${dayNum}`,
        bookId,
        bookName,
        chapter,
        verseRange: item.verseRange || "Chapitre entier",
        keyVerse: item.keyVerse || "",
        meditationPrompt: item.meditationPrompt || "Prenez un moment de recueillement et de prière pour confier cette parole à Dieu."
      };
    });

    validatedDays.sort((a: any, b: any) => a.day - b.day);

    const generatedPlan = {
      id: `ai-plan-30d-${Date.now()}`,
      title: parsed.title || `Plan 30 Jours : ${cleanTheme}`,
      description: parsed.description || `Immersion biblique guidée de 30 jours sur le thème : ${cleanTheme}.`,
      theme: cleanTheme,
      durationDays: 30,
      category: "ai_generated",
      targetCategoryName: `Plan IA 30 Jours (${cleanTheme})`,
      isCustom: true,
      bookIds: Array.from(new Set(validatedDays.map((d: any) => d.bookId))),
      days: validatedDays,
      createdAt: new Date().toISOString()
    };

    res.json(generatedPlan);
  } catch (error: any) {
    console.error("Error in generate-reading-plan endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la génération du plan personnalisé." });
  }
});

// Download the full Louis Segond 1910 Bible corpus in one request for offline IndexedDB storage
app.get("/api/bible/full-lsg1910", (req: Request, res: Response) => {
  try {
    const completePath = path.join(process.cwd(), "bible-lsg1910-complete.json");
    if (fs.existsSync(completePath)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(completePath);
      return;
    }
    const classicPath = path.join(process.cwd(), "src/data/bible-classic.json");
    if (fs.existsSync(classicPath)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(classicPath);
      return;
    }
    res.status(404).json({ error: "Corpus de la Bible introuvable." });
  } catch (err: any) {
    console.error("Error serving complete Bible:", err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération de la Bible complète." });
  }
});

// -------------------------------------------------------------
// Bible Corpus Caching & Verified Verse Resolver
// -------------------------------------------------------------
interface BibleBookRecord {
  id: number;
  name: string;
  chapters_count?: number;
}

let fullBibleVersesCache: Record<string, Array<{ verse: number; text: string }>> | null = null;
let bibleBooksCache: BibleBookRecord[] = [];
let bookAliasesMap: Record<string, BibleBookRecord> = {};

function normalizeStr(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getBibleCorpus() {
  if (fullBibleVersesCache && bibleBooksCache.length > 0) {
    return { verses: fullBibleVersesCache, books: bibleBooksCache, aliases: bookAliasesMap };
  }

  const classicPath = path.join(process.cwd(), "src/data/bible-classic.json");
  const completePath = path.join(process.cwd(), "bible-lsg1910-complete.json");

  let mergedVerses: Record<string, Array<{ verse: number; text: string }>> = {};
  let booksList: BibleBookRecord[] = [];

  if (fs.existsSync(classicPath)) {
    try {
      const classic = JSON.parse(fs.readFileSync(classicPath, "utf8"));
      booksList = classic.books || [];
      if (classic.verses) {
        mergedVerses = { ...classic.verses };
      }
    } catch (e) {
      console.warn("Could not read bible-classic.json:", e);
    }
  }

  if (fs.existsSync(completePath)) {
    try {
      const complete = JSON.parse(fs.readFileSync(completePath, "utf8"));
      if (complete.verses) {
        mergedVerses = { ...mergedVerses, ...complete.verses };
      }
    } catch (e) {
      console.warn("Could not read bible-lsg1910-complete.json:", e);
    }
  }

  fullBibleVersesCache = mergedVerses;
  bibleBooksCache = booksList;

  // Build comprehensive aliases map for French biblical books
  bookAliasesMap = {};
  for (const b of booksList) {
    const norm = normalizeStr(b.name);
    bookAliasesMap[norm] = b;
    if (b.name === "Psaumes") {
      bookAliasesMap["psaume"] = b;
      bookAliasesMap["ps"] = b;
      bookAliasesMap["psa"] = b;
    } else if (b.name === "Proverbes") {
      bookAliasesMap["proverbe"] = b;
      bookAliasesMap["pr"] = b;
      bookAliasesMap["prov"] = b;
    } else if (b.name === "Genèse") {
      bookAliasesMap["genese"] = b;
      bookAliasesMap["gen"] = b;
      bookAliasesMap["gn"] = b;
    } else if (b.name === "Ésaïe") {
      bookAliasesMap["esaie"] = b;
      bookAliasesMap["es"] = b;
      bookAliasesMap["is"] = b;
    } else if (b.name === "Ézéchiel") {
      bookAliasesMap["ezechiel"] = b;
      bookAliasesMap["ez"] = b;
    } else if (b.name === "Éphésiens") {
      bookAliasesMap["ephesiens"] = b;
      bookAliasesMap["ephesien"] = b;
      bookAliasesMap["eph"] = b;
    } else if (b.name === "Matthieu") {
      bookAliasesMap["mt"] = b;
      bookAliasesMap["matt"] = b;
    } else if (b.name === "Marc") {
      bookAliasesMap["mc"] = b;
      bookAliasesMap["mr"] = b;
    } else if (b.name === "Luc") {
      bookAliasesMap["lc"] = b;
      bookAliasesMap["lk"] = b;
    } else if (b.name === "Jean") {
      bookAliasesMap["jn"] = b;
    } else if (b.name === "Actes") {
      bookAliasesMap["act"] = b;
      bookAliasesMap["ac"] = b;
    } else if (b.name === "Romains") {
      bookAliasesMap["romain"] = b;
      bookAliasesMap["rm"] = b;
      bookAliasesMap["rom"] = b;
    } else if (b.name === "1 Corinthiens") {
      bookAliasesMap["1cor"] = b;
      bookAliasesMap["1co"] = b;
    } else if (b.name === "2 Corinthiens") {
      bookAliasesMap["2cor"] = b;
      bookAliasesMap["2co"] = b;
    } else if (b.name === "Philippiens") {
      bookAliasesMap["philippien"] = b;
      bookAliasesMap["phil"] = b;
      bookAliasesMap["php"] = b;
    } else if (b.name === "Colossiens") {
      bookAliasesMap["colossien"] = b;
      bookAliasesMap["col"] = b;
    } else if (b.name === "Hébreux") {
      bookAliasesMap["hebreux"] = b;
      bookAliasesMap["heb"] = b;
    } else if (b.name === "Apocalypse") {
      bookAliasesMap["apoc"] = b;
      bookAliasesMap["ap"] = b;
      bookAliasesMap["rev"] = b;
    } else if (b.name === "Cantique des Cantiques") {
      bookAliasesMap["cantique"] = b;
      bookAliasesMap["cantiquedescantiques"] = b;
      bookAliasesMap["ct"] = b;
    }
  }

  return { verses: fullBibleVersesCache, books: bibleBooksCache, aliases: bookAliasesMap };
}

function parseAndVerifySimilarVerses(
  candidates: Array<{ reference: string; type_lien?: string; explication?: string }>,
  source: { sourceBookId?: number; sourceBookName?: string; sourceChapter?: number; sourceVerse?: number }
) {
  const { verses, aliases } = getBibleCorpus();
  const results: any[] = [];
  const seenKeys = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate || typeof candidate.reference !== "string") continue;
    
    // Match e.g. "Psaume 33:6", "1 Jean 4:8", "Jean 1:1-3", "Éphésiens 2:8-10"
    const match = candidate.reference.trim().match(/^((?:[1-3]\s+)?[A-Za-zÀ-ÿ\s]+?)\s*(\d+)[\s:\.,]+(\d+)(?:\s*[-–]\s*(\d+))?$/i);
    if (!match) continue;

    const rawBook = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verseStart = parseInt(match[3], 10);
    const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;

    if (isNaN(chapter) || isNaN(verseStart)) continue;

    const normBook = normalizeStr(rawBook);
    let book = aliases[normBook];
    if (!book) {
      for (const [k, b] of Object.entries(aliases)) {
        if (normBook.startsWith(k) || k.startsWith(normBook)) {
          book = b;
          break;
        }
      }
    }
    if (!book) continue;

    // Filter out duplicate with the source verse
    if (
      (source.sourceBookId && book.id === source.sourceBookId && source.sourceChapter === chapter && verseStart <= (source.sourceVerse || -1) && verseEnd >= (source.sourceVerse || -1)) ||
      (source.sourceBookName && normalizeStr(source.sourceBookName) === normalizeStr(book.name) && source.sourceChapter === chapter && verseStart <= (source.sourceVerse || -1) && verseEnd >= (source.sourceVerse || -1))
    ) {
      continue;
    }

    const uniqueKey = `${book.id}_${chapter}_${verseStart}_${verseEnd}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    // Verify presence in the authentic Louis Segond database
    const chapterKey = `${book.id}_${chapter}`;
    const chapterVerses = verses[chapterKey];
    if (!chapterVerses || !Array.isArray(chapterVerses)) continue;

    const matchedVerses = chapterVerses.filter(v => v.verse >= verseStart && v.verse <= verseEnd);
    if (matchedVerses.length === 0) continue;

    const realText = matchedVerses
      .map(v => matchedVerses.length > 1 ? `(${v.verse}) ${v.text}` : v.text)
      .join(" ");

    const canonicalRef = verseStart === verseEnd 
      ? `${book.name} ${chapter}:${verseStart}` 
      : `${book.name} ${chapter}:${verseStart}-${verseEnd}`;

    // Normalize type_lien
    let linkType = candidate.type_lien || "Parallèle";
    const validTypes = ["Parallèle", "Accomplissement", "Éclairage", "Contraste", "Illustration"];
    const matchedType = validTypes.find(t => normalizeStr(t) === normalizeStr(linkType));
    if (matchedType) linkType = matchedType;

    results.push({
      reference: canonicalRef,
      book_id: book.id,
      book_name: book.name,
      chapter: chapter,
      verse: verseStart,
      verse_end: verseEnd,
      type_lien: linkType,
      explication: candidate.explication || "Verset apportant un éclairage spirituel profond.",
      text: realText
    });
  }

  return results;
}

// Dynamic verse fetcher for any of the 66 Books - Strictly from static verified Louis Segond 1910 corpus
app.post("/api/gemini/fetch-verses", async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookName, chapterNum } = req.body;
    if (!bookName || !chapterNum) {
      res.status(400).json({ error: "Livre et chapitre requis." });
      return;
    }

    const corpus = getBibleCorpus();
    const cleanReqBook = normalizeStr(String(bookName));
    const book = corpus.aliases[cleanReqBook] || corpus.books.find(b => normalizeStr(b.name) === cleanReqBook);
    
    if (!book) {
      res.status(404).json({ error: `Livre "${bookName}" introuvable dans le corpus.` });
      return;
    }

    const cacheKey = `${book.id}_${chapterNum}`;
    const versesList = corpus.verses?.[cacheKey];

    if (versesList && Array.isArray(versesList) && versesList.length > 0) {
      res.json({ 
        bookName: book.name,
        chapter: Number(chapterNum),
        verses: versesList 
      });
      return;
    }

    // If chapter is absent from local static corpus, return a clear error (no AI generation of Scripture)
    res.status(404).json({ error: `Le chapitre ${chapterNum} du livre "${book.name}" n'est pas disponible dans le fichier local de la Bible.` });
  } catch (error: any) {
    console.error("Error fetching verses from static corpus:", error);
    res.status(500).json({ error: `Impossible de récupérer le chapitre ${req.body.chapterNum} de ${req.body.bookName}: ` + (error.message || "") });
  }
});

// "Méditer en profondeur" : Suggérer des versets similaires ou complémentaires via l'IA et la Bible LSG
app.post("/api/gemini/similar-verses", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée. Veuillez vérifier GEMINI_API_KEY dans vos secrets." });
      return;
    }

    const { verseText, reference, bookName, chapter, verse, bookId } = req.body;
    if (!reference && (!bookName || !chapter || !verse)) {
      res.status(400).json({ error: "Verset source requis (référence et texte)." });
      return;
    }

    const sourceRef = reference || `${bookName} ${chapter}:${verse}`;

    // System prompt and instructions strictly as specified by the user
    const systemInstruction = `Tu es un assistant d'étude biblique. À partir du verset donné, propose 5 versets bibliques réels qui traitent du même thème, le complètent ou l'éclairent. ${BIBLICAL_FIDELITY_DIRECTIVE} Réponds uniquement en JSON valide selon le format demandé, en français, sans texte supplémentaire. N'invente jamais de référence.`;

    const userPrompt = `Voici le verset source :
Référence : "${sourceRef}"
Texte : "${verseText || ''}"

${BIBLICAL_FIDELITY_DIRECTIVE}

Propose 5 versets bibliques réels complémentaires, parallèles, contrastes ou accomplissements.
Réponds STRICTEMENT sous ce format JSON :
{
  "verset_source": "${sourceRef}",
  "versets_similaires": [
    {
      "reference": "Psaume 33:6",
      "type_lien": "Parallèle",
      "explication": "Explication courte en une phrase"
    }
  ]
}
Chaque type_lien doit être l'un de : "Parallèle", "Accomplissement", "Éclairage", "Contraste". N'invente jamais de référence. Ne génère pas le texte du verset, seulement la référence et l'explication.`;

    const response = await generateGeminiContent({
      contents: userPrompt,
      model: "gemini-3.8-flash",
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verset_source: { type: Type.STRING },
            versets_similaires: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  reference: { type: Type.STRING },
                  type_lien: { 
                    type: Type.STRING,
                    description: "Type de lien : 'Parallèle', 'Accomplissement', 'Éclairage' ou 'Contraste'"
                  },
                  explication: { type: Type.STRING, description: "Une phrase courte expliquant le lien avec le verset médité." }
                },
                required: ["reference", "type_lien", "explication"]
              }
            }
          },
          required: ["verset_source", "versets_similaires"]
        },
        systemInstruction
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const rawCandidates = parsed.versets_similaires || [];

    // Retrieve authentic text from the local Louis Segond 1910 Bible database and verify reference existence
    const verifiedVerses = parseAndVerifySimilarVerses(rawCandidates, {
      sourceBookId: Number(bookId),
      sourceBookName: bookName,
      sourceChapter: Number(chapter),
      sourceVerse: Number(verse)
    });

    res.json({
      verset_source: sourceRef,
      versets_similaires: verifiedVerses
    });
  } catch (error: any) {
    console.error("Error in similar-verses endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la recherche des versets similaires." });
  }
});


// Compare a verse in multiple translations
app.post("/api/gemini/compare-verse", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée pour l'étude comparative." });
      return;
    }
    const { bookName, chapter, verse, originalText } = req.body;
    if (!bookName || !chapter || !verse) {
      res.status(400).json({ error: "Livre, chapitre et verset requis pour la comparaison." });
      return;
    }

    const reference = `${bookName} ${chapter}:${verse}`;
    const prompt = `Génère des traductions et versions comparables pour le verset biblique: "${reference}".
Le texte fourni pour la version Louis Segond 1910 est: "${originalText || ''}".

CONSIGNE STRICTE :
${BIBLICAL_FIDELITY_DIRECTIVE}

Tu dois renvoyer STRICTEMENT un objet JSON contenant:
- reference: "${reference}"
- translations: un tableau d'objets. Chaque objet contient:
  * code: le code de la version (ex: "LSG", "KJV", "DARBY", "SEMEUR", "ORIGINAL")
  * name: le nom de la version (ex: "Louis Segond (1910)", "King James (KJV)", "Darby", "Semeur", "Original & Translittéré")
  * text: le texte exact de ce verset dans cette traduction. Pour ORIGINAL, tu es STRICTEMENT INTERDIT de reproduire le texte hébreu ou grec original lettre par lettre dans son alphabet d'origine. À la place, fournis EXCLUSIVEMENT la translittération phonétique simplifiée française du verset (ex: 'Bereshit bara Elohim...'). Ajoute une mention indiquant à l'utilisateur de se référer aux annotations d'étude et codes Strong statiques déjà existants (comme H7225, G3056, etc.) pour consulter la définition originale vérifiée du lexique.
  * language: "fr", "en", ou "trans"
  * description: une explication concise (1 à 2 phrases en français) sur l'intérêt théologique ou exégétique de cette version.

Génère des traductions très exactes caractéristiques des écritures sacrées sans approximation.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reference: { type: Type.STRING },
            translations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  text: { type: Type.STRING },
                  language: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["code", "name", "text", "language", "description"]
              }
            }
          },
          required: ["reference", "translations"]
        },
        systemInstruction: `Tu es un serveur théologique fournissant des données de comparaison de textes bibliques d'une fidélité académique absolue sous forme JSON. ${BIBLICAL_FIDELITY_DIRECTIVE}`,
      }
    });

    const outputText = response.text || "{}";
    res.json(JSON.parse(outputText));
  } catch (error: any) {
    console.error("Error in compare-verse endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la comparaison des versions bibliques." });
  }
});


// Search or generate definition for a biblical name, location, or event
app.post("/api/gemini/dictionary", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée pour le dictionnaire théologique." });
      return;
    }
    const { query, bookName } = req.body;
    if (!query) {
      res.status(400).json({ error: "Le terme recherché est vide." });
      return;
    }

    const prompt = `Génère une définition théologique et une fiche encyclopédique de haute précision pour le terme biblique: "${query}"${bookName ? ` (dans le contexte du livre de ${bookName})` : ""}.
Il peut s'agir d'un personnage (ex: Moïse, Paul de Tarse), d'un lieu (ex: Jérusalem, Sodome), ou d'un événement / concept théologique (ex: L'Exode, La Pâque, La Transfiguration).

CONSIGNE STRICTE :
${BIBLICAL_FIDELITY_DIRECTIVE}

Tu dois renvoyer STRICTEMENT un objet JSON structuré contenant:
- term: le nom propre ou concept recherché (ex: "${query}")
- category: une chaîne de caractères parmi ["personne", "lieu", "evenement", "notion"]
- pronunciation: prononciation phonétique ou écriture originale hébreu/grec (ex: "Mōšeh (מֹשֶׁה)" ou "Hierousalēm (Ἱερουσαλήμ)")
- etymology: origine étymologique ou signification littérale du nom (ex: "Du mot hébreu signifiant 'sauve des eaux'...")
- shortDefinition: un résumé de 1 à 2 phrases précises et impactantes.
- detailedDescription: l'analyse théologique complète au format Markdown (2 à 3 paragraphes détaillés sur sa place dans l'histoire du salut, sa signification prophétique/thologique, et ses implications).
- scriptureReferences: une liste d'array (2 à 5 chaînes de caractères) de chapitres ou versets clés de la Bible (ex: ["Exode 2:10", "Deutéronome 34:10"]).
- relatedTerms: une liste d'array de 3 termes bibliques connexes d'intérêt.

Sois rigoureux intellectuellement et respectueux de la théologie chrétienne et de l'histoire du texte.`;

    const response = await generateGeminiContent({
      contents: prompt,
      isShortTask: true,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            category: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            etymology: { type: Type.STRING },
            shortDefinition: { type: Type.STRING },
            detailedDescription: { type: Type.STRING },
            scriptureReferences: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            relatedTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: [
            "term", "category", "pronunciation", "etymology",
            "shortDefinition", "detailedDescription", "scriptureReferences", "relatedTerms"
          ]
        },
        systemInstruction: `Tu es un bibliste expert et directeur de thèse de théologie sacrée fournissant des descriptions encyclopédiques académiques sous forme JSON. ${BIBLICAL_FIDELITY_DIRECTIVE}`,
      }
    });

    const outputText = response.text || "{}";
    res.json(JSON.parse(outputText));
  } catch (error: any) {
    console.error("Error in dictionary endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur de l'API lors de l'interrogation du dictionnaire." });
  }
});


// -------------------------------------------------------------
// Vite or Static Asset Integration
// -------------------------------------------------------------
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite hmr middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), "dist");
    const publicPath = path.join(process.cwd(), "public");

    app.use(express.static(distPath));
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }

    // Robust static fallback for any direct image requests (/src/assets/images/* and /assets/images/*)
    const handleImageRequest = (req: Request, res: Response) => {
      const fileName = req.params.file;
      const candidates = [
        path.join(publicPath, "assets/images", fileName),
        path.join(distPath, "assets/images", fileName),
        path.join(process.cwd(), "src/assets/images", fileName),
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("Content-Type", "image/jpeg");
          return res.sendFile(filePath);
        }
      }
      res.status(404).send("Image not found");
    };

    app.get("/src/assets/images/:file", handleImageRequest);
    app.get("/assets/images/:file", handleImageRequest);

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Bible Mobile Server running and accessible at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
