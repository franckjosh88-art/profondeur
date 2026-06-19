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

// Resilient wrapper to handle model rate limits or transient load issues (503)
async function generateGeminiContent(params: {
  contents: any;
  config?: any;
}) {
  if (!ai) {
    throw new Error("L'API Gemini n'est pas configurée.");
  }
  
  const originalConfig = params.config || {};
  let systemInstruction = originalConfig.systemInstruction || "";
  
  if (systemInstruction) {
    // Inject conciseness instruction to reduce tokens and speed up generation
    systemInstruction = `${systemInstruction} Écris de manière très concise, synthétique et directe, sans phrase introductive ni conclusion facultative, pour assurer un temps de réponse ultra-rapide.`;
  } else {
    systemInstruction = "Écris de manière claire, concise et structurée en français pour un temps de réponse rapide.";
  }

  const optimizedConfig = {
    ...originalConfig,
    systemInstruction
  };
  
  try {
    // Attempt the fast lite model (gemini-3.1-flash-lite) for ultra-low latency which is highly responsive
    return await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: params.contents,
      config: optimizedConfig
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error || "");
    const isTransientError = 
      errorStr.includes("503") || 
      errorStr.includes("UNAVAILABLE") || 
      errorStr.includes("demand") || 
      errorStr.includes("Resource has been exhausted") ||
      errorStr.includes("429");

    if (isTransientError) {
      console.warn("⚠️ model gemini-3.1-flash-lite busy or unavailable (503), falling back to robust gemini-flash-latest...");
      try {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: params.contents,
          config: optimizedConfig
        });
      } catch (fallbackError: any) {
        console.error("❌ Fallback model also failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
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

    const response = await generateGeminiContent({
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

    const response = await generateGeminiContent({
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

Effectue une analyse spirituelle, théologique et pastorale de ces notes sous la forme d'un magnifique rapport bienveillant (en français) comportant :
1. **Synthèse et Thèmes Dominants** : Identifie les principaux thèmes spirituels qui émergent de ces notes (p.ex. la grâce, la persévérance, l'écoute, les doutes, etc.).
2. **Encouragement Floral Pastoral** : Offre une parole d'édification chaleureuse et fraternelle pour encourager l'étudiant dans ses recherches.
3. **Versets d'Approfondissement Recommandés** : Suggère 2 ou 3 autres passages bibliques Louis Segond pertinents en rapport avec sa réflexion actuelle pour nourrir sa foi.

Sois inspirant, érudit et profondément réconfortant.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction: "Tu es un guide spirituel, mentor de théologie et pasteur bienveillant. Tu aides à synthétiser et encourager les croyants dans leur étude approfondie des écritures.",
      }
    });

    res.json({ analysis: response.text });
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

Fournis un approfondissement théologique et philologique approfondi en français basé sur cette note :
1. **Éclairage Théologique & Exégèse** : Apporte d'autres vérités bibliques ou doctrinaires qui complètent sa réflexion. Offre des pistes sémantiques ou historiques.
2. **Étude linguistique (greg/hébreu)** : Si applicable, mentionne une ou deux racines d'origine significatives en hébreu ou en grec qui s'y rapportent.
3. **Piste de Prière ou de Méditation** : Donne une prière courte d'inspiration ou une question d'introspection spirituelle liée à sa note.

Reste rigoureux, érudit et encourageant.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction: "Tu es un assistant universitaire en théologie et langues bibliques. Tu aides à enrichir et approfondir les pensées des étudiants.",
      }
    });

    res.json({ deepenedContent: response.text });
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
Tu dois renvoyer STRICTEMENT un objet JSON structuré en français contenant :
1. "detectedEmotion" : Un titre court décrivant l'ambiance émotionnelle repérée (p.ex. "Frustration & Doute", "Gratitude & Joie pure", "Recherche de paix & Inquiétude", "Sérénité & Contemplation").
2. "emotionalSummary" : Un résumé de 1 à 2 phrases compatissantes sur ce qui touche l'utilisateur dans sa réflexion.
3. "pastoralEncouragement" : Un paragraphe d'accompagnement spirituel fraternel, pastoral et inspirant pour fortifier et élever l'esprit de l'utilisateur.
4. "suggestedVerses" : Un tableau d'exactement 2 ou 3 passages bibliques (de préférence des PSAUMES pour l'expression de l'âme, ou d'autres versets d'encouragement clairs), contenant pour chacun :
   - reference : la référence biblique (ex : "Psaumes 34:18")
   - text : le verset ou la citation clé en français Louis Segond
   - reason : une phrase expliquant pourquoi cette parole guérit, console ou répond précisément à sa situation d'âme.

Assure-toi de l'authenticité des écritures de la Bible Segond sans aucune invention.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
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
        systemInstruction: "Tu es un directeur d'âme, conseiller pastoral et bibliste doté d'une profonde empathie chrétienne. Tu analyses les écrits intimes pour réconforter par la Parole sainte.",
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

    const response = await generateGeminiContent({
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

    const response = await generateGeminiContent({
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

Tu dois renvoyer STRICTEMENT un objet JSON contenant:
- reference: "${reference}"
- translations: un tableau d'objets. Chaque objet contient:
  * code: le code de la version (ex: "LSG", "KJV", "DARBY", "SEMEUR", "ORIGINAL")
  * name: le nom de la version (ex: "Louis Segond (1910)", "King James (KJV)", "Darby", "Semeur", "Original & Translittéré")
  * text: le texte exact de ce verset dans cette traduction. Pour ORIGINAL, si c'est de l'Ancien Testament fournis le texte hébreu avec voyelles (s'il s'agit des livres de l'AT) suivi de sa translittération phonétique simplifiée entre parenthèses. Si c'est du Nouveau Testament, fournis le texte grec suivi de sa translittération.
  * language: "fr", "en", ou "he/gr"
  * description: une explication concise (1 à 2 phrases en français) sur l'intérêt théologique ou exégétique de cette version.

Génère des traductions très exactes caractéristiques des écritures sacrées sans approximation.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
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
        systemInstruction: "Tu es un serveur théologique fournissant des données de comparaison de textes bibliques d'une fidélité académique absolue sous forme JSON.",
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
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Le terme recherché est vide." });
      return;
    }

    const prompt = `Génère une définition théologique et une fiche encyclopédique de haute précision pour le terme biblique: "${query}".
Il peut s'agir d'un personnage (ex: Moïse, Paul de Tarse), d'un lieu (ex: Jérusalem, Sodome), ou d'un événement / concept théologique (ex: L'Exode, La Pâque, La Transfiguration).

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
      config: {
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
        systemInstruction: "Tu es un bibliste expert et directeur de thèse de théologie sacrée fournissant des descriptions encyclopédiques académiques sous forme JSON.",
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
