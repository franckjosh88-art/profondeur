/**
 * Utilitaires pour nettoyer et formater les textes générés par l'IA ou saisis par l'utilisateur.
 * Supprime proprement les symboles Markdown (*, **, #, ##, _) tout en préservant
 * la structure (titres, puces, sauts de ligne) et prépare le texte pour l'affichage,
 * la copie, la sauvegarde et la synthèse vocale (TTS).
 */

/**
 * Nettoie le texte Markdown pour obtenir un texte propre et lisible sans symboles bruts.
 * Transforme les listes en puces nettes (•), supprime les dièses (#) et astérisques (*),
 * tout en conservant les titres et la structure de paragraphes.
 */
export function cleanMarkdownText(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // 1. Supprimer les lignes séparatrices de type "---", "___" ou "***"
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 2. Transformer les titres Markdown (#, ##, ###) en titres sans symbole
    .replace(/^#+\s*(.*?)\s*$/gm, '$1')
    // 3. Traiter les puces avec gras au début : "* **Titre :**" -> "• Titre :"
    .replace(/^[\*\-]\s*\*\*(.*?)\*\*/gm, '• $1')
    // 4. Transformer les puces Markdown (* ou -) en puces élégantes (•)
    .replace(/^[\*\-]\s+/gm, '• ')
    // 5. Supprimer le gras restant **texte** -> texte
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // 6. Supprimer l'italique restant *texte* ou _texte_ -> texte
    .replace(/(^|[^\*])\*(?!\*)(.*?)\*(?!\*)/g, '$1$2')
    .replace(/(^|[^_])_(?!_)(.*?)(?!_)_/g, '$1$2')
    // 7. Supprimer tous les symboles Markdown résiduels isolés (*, #, _)
    .replace(/[\*#_]/g, '')
    // 8. Nettoyer les espaces superflus en début de ligne
    .replace(/^[ \t]+/gm, (match) => match.includes('•') ? match : '')
    // 9. Réduire les sauts de ligne multiples consécutifs à 2 maximum
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Alias de compatibilité pour l'ensemble du projet
 */
export function cleanBibleMarkdown(text: string | null | undefined): string {
  return cleanMarkdownText(text);
}

/**
 * Nettoie spécifiquement le texte destiné à la synthèse vocale (lecture vocale / haut-parleur).
 * Supprime absolument tous les symboles Markdown, les puces, les codes Strong et les caractères
 * spéciaux afin que la voix ne prononce jamais « astérisque », « dièse », « puce », etc.
 */
export function cleanTextForSpeech(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // 1. Supprimer les balises Strong [H1234] ou [G5678]
    .replace(/\[[HG]\d+\]/gi, '')
    // 2. Supprimer les titres Markdown
    .replace(/^#+\s*/gm, '')
    // 3. Supprimer les symboles de puces au début des lignes
    .replace(/^[\s\*\-•–—\d\.]+\s*/gm, '')
    // 4. Supprimer tous les caractères de balisage (*, **, #, ##, _, ~, `, >, |, etc.)
    .replace(/[\*#_~`>\|]/g, '')
    // 5. Remplacer les deux-points ou sauts de ligne par une pause douce (point)
    .replace(/[:;\n]+/g, '. ')
    // 6. Réduire les points consécutifs et les espaces
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Nettoie une chaîne de texte inline (retire * et # résiduels)
 */
export function cleanInlineText(text: string): string {
  return text.replace(/[\*#_]/g, '').trim();
}

