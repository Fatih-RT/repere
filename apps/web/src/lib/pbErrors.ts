import { ClientResponseError } from "pocketbase";

// PocketBase's own messages are English and mostly meant for API consumers,
// not end users. Codes/messages below were captured against a live 0.39.11
// instance (see PB step 2 notes), not guessed from docs.
const FIELD_CODE_MESSAGES: Record<string, string> = {
  validation_not_unique: "Cette valeur est déjà utilisée.",
  validation_is_email: "Adresse e-mail invalide.",
  validation_min_text_constraint: "Trop court.",
  validation_max_text_constraint: "Trop long.",
  validation_required: "Ce champ est requis.",
};

export function pbErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  if (!(err instanceof ClientResponseError)) return fallback;

  // status 0 = the request never reached the server (offline, DNS, CORS…).
  if (err.status === 0 || err.isAbort) {
    return "Impossible de contacter le serveur — vérifie ta connexion.";
  }

  if (err.response?.message === "Failed to authenticate.") {
    return "E-mail ou mot de passe incorrect.";
  }

  const fieldErrors = err.response?.data as Record<string, { code?: string; message?: string }> | undefined;
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const [field, info] = Object.entries(fieldErrors)[0];
    const mapped = info.code ? FIELD_CODE_MESSAGES[info.code] : undefined;
    if (mapped) {
      if (field === "email" && info.code === "validation_not_unique") {
        return "Un compte existe déjà avec cet e-mail.";
      }
      return `${field} : ${mapped}`;
    }
    if (info.message) return info.message;
  }

  return err.response?.message || fallback;
}
