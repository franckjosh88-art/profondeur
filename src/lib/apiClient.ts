import { auth } from './firebase';

/**
 * Wrapper autour de fetch qui injecte automatiquement le jeton d'authentification Firebase (ID Token)
 * dans le header `Authorization: Bearer <token>` pour toutes les requêtes d'API.
 * Si le serveur renvoie une erreur 401 (non authentifié), émet un événement 'require-auth' pour inviter
 * l'utilisateur à se connecter.
 */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (err) {
      console.warn("Impossible d'obtenir le jeton Firebase ID:", err);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('require-auth'));
  }

  return response;
}
