/**
 * Utility to clean raw markdown markings for a text-line-break reader interface.
 * Implements regex cleanups to strip raw Markdown annotations like headers, bolds, and rulers.
 */
export function cleanBibleMarkdown(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // 1. Remove any separator lines like "---" or "___"
    .replace(/^[-_|\*]{3,}\s*$/gm, '')
    // 2. Clear leading header hashes (e.g., #, ##, ###, ####, etc.) on any line
    .replace(/^#+\s*(.*)$/gm, '$1')
    // 3. Remove raw bold markers ** surrounding text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // 4. Transform bullet points starting with - or * into uniform high-end bullet points
    .replace(/^[-\*]\s+/gm, '• ')
    // 5. Clean consecutive blank lines down to maximum 2 line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
