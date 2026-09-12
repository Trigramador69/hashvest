import type { TranslationDictionary } from "./en";

/**
 * Spanish. Typed as a subset of English: any key omitted here falls back to
 * English at runtime, and any key that no longer exists in English fails
 * typecheck.
 *
 * Brand ("HashVest", "HashKey Chain"), token symbols, chain ids and the
 * `min(...)` formula stay untranslated — they are technical literals.
 */
export const es: TranslationDictionary = {
  "shell.home": "Inicio de HashVest",
  "shell.nav.label": "Navegación principal",
  "shell.nav.organizations": "Organizaciones / subvenciones",
  "shell.nav.createGrant": "Crear subvención",
  "shell.workspace.label": "Espacio de trabajo",
  "shell.workspace.choose": "Elegir espacio de trabajo",
  "shell.workspace.yours": "Tus organizaciones",
  "shell.workspace.create": "+ Crear organización",
  "shell.footer.tagline": "Subvenciones programables en HashKey Chain",
  "shell.footer.disclaimer":
    "MVP de hackathon · Sin auditar · Solo activos de testnet",

  "locale.label": "Idioma",
  "locale.choose": "Elegir idioma",

  "session.enabled": "Acceso al espacio de trabajo activado",
  "session.signOut": "Cerrar sesión del espacio",
  "session.signingOut": "Cerrando sesión…",
  "session.signIn": "Iniciar sesión en el espacio",
  "session.signingIn": "Iniciando sesión…",
  "session.required": "Wallet conectada; falta iniciar sesión en el espacio.",
  "session.walletChanged":
    "La wallet cambió. Inicia sesión de nuevo para continuar.",
  "session.switchNetwork": "Cambia primero a {network}.",
  "session.switchNetworkChain":
    "Cambia tu wallet a {network} (chain {chainId}) primero.",
  "session.notConfigured":
    "La autenticación del espacio aún no está configurada en este servidor.",

  "wallet.notConnected": "Sin conectar",
  "wallet.label": "Wallet",
  "wallet.selectedChain": "Red seleccionada",
  "wallet.unknownChain": "Red {chainId}",

  "home.eyebrow": "Subvenciones programables · HashKey Chain",
  "home.headline.line1": "Financia el trabajo.",
  "home.headline.line2": "Define el desbloqueo.",
  "home.lede":
    "HashVest convierte asignaciones de tokens en subvenciones totalmente financiadas que se desbloquean por tiempo, por hitos o por ambos.",
  "home.cta.openApp": "Abrir aplicación",
  "home.cta.createGrant": "Crear una subvención",
  "home.note": "En vivo en {network} · Tokens ERC20 · Sin revocación",

  "home.steps.title": "Una asignación. Condiciones claras.",
  "home.steps.fund.title": "La tesorería financia un vault",
  "home.steps.fund.body": "La asignación completa se deposita al crearla.",
  "home.steps.unlock.title": "Las condiciones desbloquean tokens",
  "home.steps.unlock.body":
    "Un calendario fijo, la aprobación de un revisor, o ambos.",
  "home.steps.claim.title": "El beneficiario reclama",
  "home.steps.claim.body":
    "Solo el receptor puede retirar los tokens desbloqueados.",

  "home.strategies.title": "Pensado para cada tipo de contribución.",
  "home.strategies.audience":
    "Builders del ecosistema · Equipos · Asesores · Colaboradores",
  "home.strategies.time.title": "Vesting por tiempo",
  "home.strategies.time.subtitle": "Recompensa el compromiso sostenido.",
  "home.strategies.time.body":
    "Los tokens se liberan de forma lineal desde el inicio. Un cliff opcional retrasa el acceso sin reiniciar la curva.",
  "home.strategies.milestone.title": "Subvenciones por hitos",
  "home.strategies.milestone.subtitle": "Financia progreso medible.",
  "home.strategies.milestone.body":
    "Un revisor designado aprueba hitos fijos. Cada aprobación desbloquea su asignación exacta.",
  "home.strategies.hybrid.title": "Subvenciones híbridas",
  "home.strategies.hybrid.subtitle": "Mantén tiempo y entrega alineados.",
  "home.strategies.hybrid.body":
    "Desbloqueado = min(liberado por tiempo, monto de hitos aprobados). Ambas condiciones limitan cada reclamo.",

  "meta.title": "HashVest — Subvenciones programables",
  "meta.description":
    "Subvenciones de tokens totalmente financiadas con desbloqueos por tiempo, por hitos e híbridos en HashKey Chain.",
};
