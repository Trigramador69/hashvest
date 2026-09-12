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

  // Estrategias de subvención. Los índices coinciden con lib/protocol/grants.ts:
  // 0=TIME, 1=MILESTONE, 2=HYBRID.
  "strategy.0.name": "Vesting por tiempo",
  "strategy.1.name": "Subvención por hitos",
  "strategy.2.name": "Híbrida",
  "strategy.0.description":
    "Se desbloquea linealmente con el tiempo. Un cliff retrasa el acceso sin reiniciar el calendario.",
  "strategy.1.description":
    "Desbloquea asignaciones fijas a medida que tu revisor aprueba cada hito.",
  "strategy.2.description":
    "Desbloquea la menor de las cantidades: la liberada por tiempo y la aprobada por hitos. Ambas condiciones se aplican.",

  // Selector de presets en el asistente de subvención.
  "wizard.preset.title": "Empieza desde un preset",
  "wizard.preset.lede":
    "Opcional. Un preset rellena una estrategia, un calendario y un reparto de hitos que puedes editar o borrar. Nunca cambia lo que guarda el vault.",
  "wizard.preset.custom.name": "Personalizado / en blanco",
  "wizard.preset.custom.tagline":
    "Configura cada valor tú mismo, exactamente como antes.",
  "wizard.preset.custom.meta": "Borra los campos que rellenó un preset",
  "wizard.preset.needsReviewer": "necesita revisor",

  // Presets de subvención (HAS-8). Porcentajes, asignaciones, unidades de
  // calendario e índices de estrategia son datos, no copy: nunca se traducen.
  "preset.builder-grant.name": "Subvención para builders",
  "preset.builder-grant.tagline": "Cada pago es la firma de un revisor.",
  "preset.builder-grant.description":
    "Una subvención por hitos para un colaborador externo o un builder de hackathon. Los fondos se desbloquean solo a medida que un revisor aprueba cada entregable, así que nada se mueve sin visto bueno.",
  "preset.builder-grant.bestFor.0": "Colaboradores de código abierto",
  "preset.builder-grant.bestFor.1": "Builders de hackathon",
  "preset.builder-grant.bestFor.2": "Entregables de alcance cerrado",
  "preset.builder-grant.titleSuggestion": "Subvención para builder",
  "preset.builder-grant.descriptionSuggestion":
    "Subvención por hitos para un desarrollo acotado.",
  "preset.builder-grant.milestone.0.title": "Arranque y diseño",
  "preset.builder-grant.milestone.1.title": "Implementación principal",
  "preset.builder-grant.milestone.2.title": "Lanzamiento y entrega",
  "preset.builder-grant.assumption.0":
    "Estrategia: subvención por hitos — no se desbloquea ningún token hasta que se aprueba un hito.",
  "preset.builder-grant.assumption.1":
    "Los tres hitos (20% / 50% / 30%) son un reparto inicial; renómbralos, redimensiónalos, añade o elimina los que quieras.",
  "preset.builder-grant.assumption.2":
    "Hace falta una wallet revisora para aprobar hitos; elígela antes de financiar.",

  "preset.employee-vesting.name": "Vesting de empleado",
  "preset.employee-vesting.tagline": "Vesting lineal clásico con cliff.",
  "preset.employee-vesting.description":
    "Vesting por tiempo para un miembro del equipo: nada es reclamable antes del cliff, y después los tokens se desbloquean linealmente hasta el final del calendario. No intervienen revisores ni hitos.",
  "preset.employee-vesting.bestFor.0": "Miembros del equipo core",
  "preset.employee-vesting.bestFor.1": "Colaboradores a tiempo completo",
  "preset.employee-vesting.titleSuggestion": "Vesting de empleado",
  "preset.employee-vesting.descriptionSuggestion":
    "Vesting estándar de tokens para empleados.",
  "preset.employee-vesting.timing.realWorldNote":
    "1 minuto de cliff y 4 minutos de vesting representan un cliff de 1 año sobre un calendario de 4 años — un minuto de demo por año. Cambia la unidad a Días para uso real.",
  "preset.employee-vesting.assumption.0":
    "Estrategia: vesting por tiempo — desbloqueo lineal desde el timestamp de inicio, limitado por el cliff.",
  "preset.employee-vesting.assumption.1":
    "El calendario se comprime a un minuto por año para que el ciclo completo de cliff a reclamo se pueda ver en una demo.",
  "preset.employee-vesting.assumption.2":
    "El vesting por tiempo no usa revisor; las subvenciones TIME nunca llevan semántica de revisor.",

  "preset.advisor-vesting.name": "Vesting de asesor",
  "preset.advisor-vesting.tagline":
    "Vesting lineal más corto, sin cliff obligatorio.",
  "preset.advisor-vesting.description":
    "Vesting por tiempo para un asesor o colaborador a tiempo parcial: un calendario más corto que el de empleado, normalmente sin cliff.",
  "preset.advisor-vesting.bestFor.0": "Asesores",
  "preset.advisor-vesting.bestFor.1": "Colaboradores a tiempo parcial",
  "preset.advisor-vesting.titleSuggestion": "Vesting de asesor",
  "preset.advisor-vesting.descriptionSuggestion":
    "Vesting de tokens para asesor.",
  "preset.advisor-vesting.timing.realWorldNote":
    "3 minutos de vesting representan un calendario de asesor de 3 años sin cliff — un minuto de demo por año. Cambia la unidad a Días para uso real.",
  "preset.advisor-vesting.assumption.0":
    "Estrategia: vesting por tiempo — desbloqueo lineal desde el timestamp de inicio, sin cliff por defecto.",
  "preset.advisor-vesting.assumption.1":
    "Sin cliff hay una cantidad pequeña reclamable casi de inmediato — útil para mostrar un reclamo en directo.",
  "preset.advisor-vesting.assumption.2":
    "El vesting por tiempo no usa revisor; las subvenciones TIME nunca llevan semántica de revisor.",

  "preset.ecosystem-grant.name": "Subvención de ecosistema",
  "preset.ecosystem-grant.tagline":
    "Desbloqueo por tiempo, limitado además por la aprobación de hitos.",
  "preset.ecosystem-grant.description":
    "Para un socio de ecosistema de mayor tamaño: los tokens deben liberarse con el tiempo y además tener cada hito aprobado por un revisor. Ambas condiciones se aplican, así que ni un revisor parado ni un reloj rápido pueden liberar fondos por sí solos.",
  "preset.ecosystem-grant.bestFor.0": "Socios del ecosistema",
  "preset.ecosystem-grant.bestFor.1": "Integraciones a largo plazo",
  "preset.ecosystem-grant.titleSuggestion": "Subvención de ecosistema",
  "preset.ecosystem-grant.descriptionSuggestion":
    "Subvención de ecosistema híbrida, limitada por tiempo y por hitos.",
  "preset.ecosystem-grant.timing.realWorldNote":
    "1 minuto de cliff y 6 minutos de vesting representan una alianza de seis años — un minuto de demo por año. Cambia la unidad a Días para uso real.",
  "preset.ecosystem-grant.milestone.0.title": "Incorporación e integración",
  "preset.ecosystem-grant.milestone.1.title": "Contribución sostenida",
  "preset.ecosystem-grant.assumption.0":
    "Estrategia: híbrida — es reclamable la menor de las dos cantidades: la liberada por tiempo y la aprobada por hitos. Ambas condiciones se aplican.",
  "preset.ecosystem-grant.assumption.1":
    "Aprobar un hito antes del cliff no libera nada: la parte temporal sigue limitándolo. En eso consiste una subvención híbrida.",
  "preset.ecosystem-grant.assumption.2":
    "Los dos hitos (40% / 60%) son un reparto inicial; renómbralos, redimensiónalos, añade o elimina los que quieras.",
  "preset.ecosystem-grant.assumption.3":
    "Hace falta una wallet revisora para aprobar hitos; elígela antes de financiar.",

  "meta.title": "HashVest — Subvenciones programables",
  "meta.description":
    "Subvenciones de tokens totalmente financiadas con desbloqueos por tiempo, por hitos e híbridos en HashKey Chain.",
};
