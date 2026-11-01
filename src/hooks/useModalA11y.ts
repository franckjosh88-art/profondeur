import { useEffect, useRef } from 'react';

/**
 * Hook d'accessibilité pour fenêtres modales :
 * 1. Piège le focus clavier à l'intérieur de la modale (Tab / Shift+Tab).
 * 2. Ferme la modale lors de la pression sur la touche Échap (Escape).
 * 3. Place le focus initial sur le premier élément interactif ou le conteneur.
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Enregistrer l'élément actif précédent pour restaurer le focus à la fermeture
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Fermeture avec la touche Échap
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. Piégeage du focus avec Tab
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus automatique à l'ouverture
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const firstFocusable = containerRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 60);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}
