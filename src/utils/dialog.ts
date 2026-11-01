/**
 * Gestionnaire universel de boîtes de dialogue accessibles (Alert & Confirm).
 * Remplace window.alert() et window.confirm() par des fenêtres stylisées dorées/sombres,
 * avec piégeage du focus, touche Échap, contrastes élevés et boutons clairs "Confirmer" / "Annuler".
 */

export interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  message: string;
  title: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'info';
  resolve: (value: boolean) => void;
}

type DialogListener = (state: DialogState | null) => void;
let activeListener: DialogListener | null = null;

export function registerDialogListener(listener: DialogListener) {
  activeListener = listener;
  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
  };
}

/**
 * Affiche une fenêtre de confirmation personnalisée dans le style de l'application.
 * Remplace window.confirm().
 */
export function appConfirm(message: string, options?: DialogOptions | string): Promise<boolean> {
  const opts: DialogOptions = typeof options === 'string' ? { title: options } : options || {};
  return new Promise<boolean>((resolve) => {
    if (!activeListener) {
      // Fallback sécurisé si le composant n'est pas encore monté
      const res = window.confirm(message);
      resolve(res);
      return;
    }

    activeListener({
      isOpen: true,
      type: 'confirm',
      message,
      title: opts.title || 'Confirmation',
      confirmText: opts.confirmText || 'Confirmer',
      cancelText: opts.cancelText || 'Annuler',
      variant: opts.variant || 'warning',
      resolve,
    });
  });
}

/**
 * Affiche une fenêtre d'information personnalisée dans le style de l'application.
 * Remplace window.alert().
 */
export function appAlert(message: string, options?: DialogOptions | string): Promise<boolean> {
  const opts: DialogOptions = typeof options === 'string' ? { title: options } : options || {};
  return new Promise<boolean>((resolve) => {
    if (!activeListener) {
      window.alert(message);
      resolve(true);
      return;
    }

    activeListener({
      isOpen: true,
      type: 'alert',
      message,
      title: opts.title || 'Information',
      confirmText: opts.confirmText || 'Compris',
      cancelText: '',
      variant: opts.variant || 'info',
      resolve,
    });
  });
}
