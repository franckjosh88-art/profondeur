import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json());

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
Explique ce verset en détail avec le plan suivant:
1. Contexte historique et théologique de ce passage.
2. Sens et explication théologique des termes clés ou des concepts du texte original (grec/hébreu si approprié).
3. Application concrète et leçon pratique pour notre vie quotidienne aujourd'hui.

Reste toujours constructif, bienveillant et respectueux des différentes perspectives chrétiennes. Réponds en français de manière claire et bien structurée.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Tu es un assistant biblique érudit, sage et bienveillant. Tu aides à comprendre la Bible Louis Segond en français.",
      }
    });

    res.json({ explanation: response.text });
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
Voici le texte ou le contexte de ce chapitre:
${versesContent}

Explique les thèmes majeurs abordés dans ce chapitre, les personnages principaux et comment ce chapitre s'insère dans le reste du plan biblique. Rédige en français sous forme de points clés faciles à lire.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Tu es un théologien spécialiste de la Bible en français. Tu synthétises des chapitres de manière claire, concise et inspirante.",
      }
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error in summarize endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur lors du résumé du chapitre." });
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

    // Adapt chat structure or construct a combined chat prompt
    // For simplicity and maximum control, we can construct the contents chain:
    const systemInstruction = 
      "Tu es un conseiller biblique bienveillant, érudit et profondément pastoral. " +
      "Tu aides les utilisateurs de l'application 'Bible Mobile' à comprendre les saintes écritures, à trouver du réconfort, " +
      "et à explorer la Bible Louis Segond en français. Réponds de manière constructive, " +
      "cite toujours des passages ou références bibliques précis quand tu affirmes quelque chose, et reste fraternel.";

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: error.message || "Erreur de l'assistant IA." });
  }
});

// Dynamic verse fetcher for any of the 66 Books
app.post("/api/gemini/fetch-verses", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({ error: "L'API Gemini n'est pas configurée. Clé manquante." });
      return;
    }
    const { bookName, chapterNum } = req.body;
    if (!bookName || !chapterNum) {
      res.status(400).json({ error: "Livre et chapitre requis." });
      return;
    }

    const prompt = `Génère tous les versets du livre "${bookName}", chapitre ${chapterNum} en français dans la version Louis Segond.
Tu dois générer le texte intégral et fidèle, verset par verset, sans coupure ou omission, conformément aux écritures réelles du chapitre de la Bible chrétienne traditionnelle.
Tu DOIS retourner le résultat STRICTEMENT sous forme de tableau JSON d'objets, chaque objet ayant deux propriétés: "verse" (nombre représentant le numéro du verset) et "text" (chaîne de caractères représentant le texte exact).
Ne mets aucune explication avant ou après le JSON. Rends uniquement le JSON brut.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              verse: {
                type: Type.INTEGER,
                description: "Le numéro du verset biblique"
              },
              text: {
                type: Type.STRING,
                description: "Le texte authentique Louis Segond de ce verset"
              }
            },
            required: ["verse", "text"]
          }
        },
        systemInstruction: "Tu es un serveur de base de données d'écritures bibliques. Tu renvoies toujours fidèlement l'authenticité des versets sous format JSON structuré, en français Louis Segond d'origine.",
      }
    });

    const textOutput = response.text || "[]";
    const versesList = JSON.parse(textOutput);

    res.json({ 
      bookName,
      chapter: Number(chapterNum),
      verses: versesList 
    });
  } catch (error: any) {
    console.error("Error generating verses dynamically:", error);
    res.status(500).json({ error: `Impossible de récupérer le chapitre ${req.body.chapterNum} de ${req.body.bookName}: ` + (error.message || "") });
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Bible Mobile Server running and accessible at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
