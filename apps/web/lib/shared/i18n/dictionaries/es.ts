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
  "shell.footer.tagline": "Subvenciones programables en HashKey Chain",
  "shell.footer.disclaimer":
    "MVP de hackathon · Sin auditar · Solo activos de testnet",
  "shell.nav.overview": "Resumen",
  "shell.nav.grants": "Subvenciones",
  "shell.nav.settings": "Configuración",
  "shell.navigation.open": "Abrir navegación",
  "shell.navigation.close": "Cerrar navegación",
  "shell.appTagline": "HashVest · HSK Testnet",
  "shell.appDisclaimer": "Sin auditar · Solo activos de testnet",

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

  "home.eyebrow": "Subvenciones programables · HashKey Chain",
  "home.headline.line1": "Financia el trabajo.",
  "home.headline.line2": "Define el desbloqueo.",
  "home.lede":
    "HashVest convierte asignaciones de tokens en subvenciones totalmente financiadas que se desbloquean por tiempo, por hitos o por ambos.",
  "home.cta.openApp": "Abrir aplicación",
  "home.cta.createGrant": "Crear una subvención",
  "home.note":
    "En vivo en {network} · Tokens ERC20 · Revocación opcional del emisor · Valor ganado protegido",

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

  // Revocación (HAS-26), estados de transacción y validación de lib/protocol.
  "ui.lifecycle.revoked": "Revocada",
  "party.terms": "Términos",
  "tx.stage.confirm": "{label}: confirma en tu wallet",
  "tx.stage.waiting": "{label}: esperando confirmación",
  "tx.stage.confirmed":
    "Transacción confirmada. El estado onchain está al día.",
  "tx.stage.reverted":
    "{label} revirtió onchain. No se aplicó ningún cambio de esta transacción.",
  "tx.error.notConnected": "Conecta tu wallet para continuar.",
  "tx.error.wrongNetwork":
    "Cambia tu wallet a {network} (chain {chainId}) para continuar.",
  "tx.error.walletChanged":
    "Tu wallet cambió. Revisa de nuevo la subvención antes de continuar.",
  "tx.error.rpcUnavailable": "El RPC de {network} no está disponible.",
  "ui.error.requestFailed": "La solicitud falló. Inténtalo de nuevo.",
  "tx.error.tokenAddressRequired": "La dirección del token es obligatoria.",
  "grants.error.decimals":
    "Este token admite como máximo {decimals} decimales.",
  "wizard.error.amountFormat":
    "Introduce una cantidad de tokens decimal y positiva.",
  "wizard.error.amountRange":
    "La cantidad de tokens está fuera del rango admitido.",
  "wizard.error.milestoneTitle": "El hito {index} necesita un título.",
  "wizard.error.insufficientBalance":
    "No hay suficiente {symbol}. La asignación completa debe financiarse al crearla.",
  "wizard.error.memberMismatch.beneficiary":
    "Elige un beneficiario del directorio de la organización o usa una wallet externa.",
  "wizard.error.memberMismatch.reviewer":
    "Elige un revisor del directorio de la organización o usa una wallet externa.",
  "wizard.field.revocable.label": "Subvención revocable",
  "wizard.field.revocable.hint":
    "Permite al emisor recuperar los tokens no ganados. Los tokens ya ganados o reclamados por el beneficiario quedan estrictamente preservados y protegidos.",
  "wizard.review.revocable.title": "Términos de subvención revocable",
  "wizard.review.revocable.body":
    "Esta subvención es revocable por el emisor. La revocación devuelve a tu wallet los fondos no ganados, preservando estrictamente todo el valor que el beneficiario ya haya ganado o reclamado.",
  "detail.terms.revocable": "Revocable",
  "detail.terms.revocableRevoked": "Revocable (revocada)",
  "detail.terms.nonRevocable": "No revocable (inmutable)",
  "detail.terms.revocableNote":
    "El emisor puede revocar esta subvención sobre los tokens no ganados.",
  "detail.terms.revokedNote":
    "Subvención revocable: revocada el {date}. El derecho ganado por el beneficiario se preserva estrictamente.",
  "detail.badge.revocable": "Revocable",
  "detail.badge.nonRevocable": "No revocable",
  "detail.claimReason.revokedAllClaimed":
    "La subvención fue revocada. Todos los tokens ganados ya se han reclamado.",
  "detail.claimReason.revokedClaimable":
    "El emisor revocó la subvención. Puedes reclamar todos los tokens ganados que queden.",
  "detail.milestone.lockedByRevocation":
    "Subvención revocada; hitos bloqueados.",
  "detail.revoked.title": "Subvención revocada el {date}",
  "detail.revoked.body.before":
    "El emisor revocó esta subvención. El derecho ganado por el beneficiario quedó fijado en ",
  "detail.revoked.body.middle":
    " en el momento de la revocación. Los tokens no ganados ({recovered}) fueron recuperados por el emisor.",
  "detail.revoked.body.claimable":
    " El beneficiario conserva los {amount} restantes de valor ganado y puede reclamarlos abajo.",
  "detail.revoked.body.allClaimed":
    " Todos los tokens ganados ya se han reclamado.",
  "detail.revoke.action": "Revocar subvención",
  "detail.revoke.tx": "Revocar la subvención y recuperar los tokens no ganados",
  "detail.revoke.modal.title": "Confirmar la revocación",
  "detail.revoke.modal.lede":
    "Revisa lo que se recupera y lo que se preserva antes de confirmar.",
  "detail.revoke.modal.totalAllocation": "Asignación total:",
  "detail.revoke.modal.alreadyClaimed": "Ya reclamado por el beneficiario:",
  "detail.revoke.modal.earnedEntitlement":
    "Derecho ganado por el beneficiario:",
  "detail.revoke.modal.earnedUnclaimed": "Ganado pero sin reclamar:",
  "detail.revoke.modal.clawback": "Recuperación para la tesorería del emisor:",
  "detail.revoke.modal.warningLabel": "Acción irreversible:",
  "detail.revoke.modal.warningBody":
    "Revocar detiene permanentemente todo el vesting y las aprobaciones de hitos futuras. Los tokens ya ganados o reclamados por el beneficiario siguen estrictamente en su custodia o disponibles para reclamar. Los tokens no ganados ({recovered}) volverán de inmediato a tu wallet conectada.",
  "detail.revoke.modal.cancel": "Cancelar",
  "detail.revoke.modal.confirm": "Confirmar recuperación",
  "detail.revoke.modal.pending": "Recuperando…",
  "card.revocable": "Revocable",
  "card.nonRevocable": "No revocable",

  // Resumen de organización: métricas en vivo, colas de revisión y reclamo, vinculación.
  "overview.loading.title": "Cargando el resumen de la organización",
  "overview.loading.body":
    "Leyendo los datos del espacio de trabajo y el estado en vivo de las subvenciones en HSK…",
  "overview.error.title": "El resumen de la organización no está disponible",
  "overview.error.body": "Reintenta o revisa la configuración de Supabase.",
  "overview.metric.members": "Miembros",
  "overview.metric.activeGrants": "Subvenciones activas",
  "overview.metric.pendingReviews": "Revisiones pendientes para ti",
  "overview.metric.claimableGrants": "Subvenciones reclamables por ti",
  "overview.metricsUnavailable":
    "Las métricas en vivo no están disponibles temporalmente; los metadatos del espacio de trabajo sí lo están.",
  "overview.recent.title": "Subvenciones recientes",
  "overview.recent.lede":
    "Términos onchain y estado en vivo, enriquecidos con el contexto del espacio de trabajo.",
  "overview.recent.viewAll": "Ver todas",
  "overview.recent.empty":
    "Todavía no hay subvenciones en este espacio de trabajo.",
  "overview.recent.createFirst": "Crear la primera subvención",
  "overview.review.title": "Cola de revisión",
  "overview.review.lede":
    "Aquí solo aparecen los hitos pendientes de tu wallet revisora onchain real.",
  "overview.review.loading": "Leyendo las asignaciones de revisor en vivo…",
  "overview.review.unavailable":
    "Las asignaciones de revisor en vivo no están disponibles temporalmente.",
  "overview.review.empty": "No hay subvenciones asociadas que revisar.",
  "overview.review.item.loading": "Leyendo la cola de revisión…",
  "overview.review.item.stale":
    "El estado de revisión en vivo no está disponible para esta subvención. Reinténtalo desde su página de detalle.",
  "overview.review.item.pending.one": "{count} hito pendiente",
  "overview.review.item.pending.other": "{count} hitos pendientes",
  "overview.review.item.reviewer": "{name} es el revisor",
  "overview.review.item.next": "Siguiente:",
  "overview.review.item.action": "Revisar subvención",
  "overview.review.evidence.title": "Evidencia del hito pendiente",
  "overview.claim.title": "Reclamable por ti",
  "overview.claim.lede":
    "Los importes reclamables vienen de cada GrantVault, nunca de Supabase.",
  "overview.claim.loading":
    "Leyendo la reclamabilidad del beneficiario en vivo…",
  "overview.claim.unavailable":
    "Los importes reclamables en vivo no están disponibles temporalmente.",
  "overview.claim.empty": "No hay subvenciones reclamables para esta wallet.",
  "overview.claim.item.loading": "Leyendo la subvención reclamable…",
  "overview.claim.item.stale":
    "El estado de beneficiario en vivo no está disponible para esta subvención. Reinténtalo desde su página de detalle.",
  "overview.claim.item.fallbackDescription": "Subvención de la organización",
  "overview.claim.item.amount": "{amount} reclamables",
  "overview.claim.item.action": "Abrir subvención",
  "overview.sponsorship.title": "Primeros reclamos patrocinados",
  "overview.sponsorship.lede":
    "Las subvenciones de la organización pueden pagar la comisión HSK de un primer reclamo autorizado por el beneficiario.",
  "overview.sponsorship.loading": "Leyendo la política de patrocinio…",
  "overview.sponsorship.error":
    "La política de patrocinio no está disponible temporalmente.",
  "overview.sponsorship.enabled": "Activar primeros reclamos patrocinados",
  "overview.sponsorship.enabledHint":
    "El beneficiario sigue firmando el reclamo exacto del vault; la organización solo paga la comisión del relayer.",
  "overview.sponsorship.maxClaims": "Límite de reclamos de la organización",
  "overview.sponsorship.maxClaimsHint":
    "Los reclamos reservados cuentan para este límite. Máximo: {max}.",
  "overview.sponsorship.usage": "Reservados",
  "overview.sponsorship.remaining": "Restantes",
  "overview.sponsorship.relayer": "Relayer",
  "overview.sponsorship.relayerReady": "Configurado",
  "overview.sponsorship.relayerMissing": "No configurado",
  "overview.sponsorship.manualFallback":
    "El beneficiario siempre puede usar el reclamo normal pagado por su wallet si el patrocinio no está disponible.",
  "overview.sponsorship.save": "Guardar política",
  "overview.sponsorship.saving": "Guardando política…",
  "overview.sponsorship.saved": "Política de patrocinio guardada.",
  "overview.sponsorship.updateError":
    "No se pudo guardar la política. Reintenta sin reducir el límite de reservas existentes.",
  "overview.members.title": "Miembros",
  "overview.members.manage": "Gestionar",
  "overview.link.summary": "Vincular un GrantVault existente",
  "overview.link.lede":
    "Úsalo para una subvención creada antes de los metadatos del espacio de trabajo, o para reintentar una sincronización fallida. El servidor comprueba el emisor onchain.",
  "overview.link.address.placeholder": "Dirección del GrantVault",
  "overview.link.address.label": "Dirección del GrantVault existente",
  "overview.link.description.placeholder": "Descripción (opcional)",
  "overview.link.action": "Vincular subvención",
  "overview.link.pending": "Comprobando en HSK…",
  "overview.link.success":
    "Metadatos vinculados. La lista del espacio de trabajo está al día.",
  "orggrants.loading.title": "Cargando las subvenciones del espacio de trabajo",
  "orggrants.loading.body": "Leyendo los GrantVaults asociados…",
  "orggrants.error.title":
    "Las subvenciones del espacio de trabajo no están disponibles",
  "orggrants.error.body":
    "Reintenta después de revisar la conexión del espacio de trabajo.",
  "orggrants.title": "Subvenciones de la organización",
  "orggrants.count.one": "{count} GrantVault asociado.",
  "orggrants.count.other": "{count} GrantVaults asociados.",
  "orggrants.create": "Crear subvención",
  "orggrants.empty.title": "Todavía no se ha asociado ninguna subvención.",
  "orggrants.empty.body":
    "Crea una subvención desde este espacio de trabajo o vincula un GrantVault existente desde el resumen.",

  // Directorio de miembros, creación de organización y página pública de subvención.
  "members.loading.title": "Cargando miembros",
  "members.loading.body": "Leyendo el directorio de la organización…",
  "members.error.title": "No se pudieron cargar los miembros",
  "members.error.body":
    "Revisa la configuración del espacio de trabajo y reinténtalo.",
  "members.add.title": "Añadir un miembro",
  "members.add.lede":
    "Añade una wallet al directorio de la organización. Las etiquetas de rol son solo metadatos de presentación; los permisos de emisor, beneficiario y revisor del GrantVault siguen onchain.",
  "members.field.wallet": "Dirección de la wallet",
  "members.field.displayName": "Nombre visible",
  "members.field.displayName.placeholder": "María Rodríguez",
  "members.field.role": "Rol o cargo",
  "members.field.optional": "(opcional)",
  "members.field.role.placeholder": "Revisora de tesorería",
  "members.add.action": "Añadir miembro",
  "members.add.pending": "Añadiendo miembro…",
  "members.directory.title": "Directorio de miembros",
  "members.directory.count.one": "{count} wallet en este espacio de trabajo.",
  "members.directory.count.other":
    "{count} wallets en este espacio de trabajo.",
  "members.directory.empty": "Todavía no hay miembros.",
  "members.edit.save": "Guardar",
  "members.edit.saving": "Guardando…",
  "members.edit.cancel": "Cancelar",
  "members.owner": "Propietario",
  "members.edit": "Editar",
  "members.remove": "Eliminar",
  "members.removeConfirm": "¿Eliminar a este miembro de la organización?",
  "neworg.eyebrow": "Nueva organización",
  "neworg.title": "Crea un espacio de trabajo.",
  "neworg.lede":
    "Monta un sitio tranquilo para tu ecosistema, tu startup, tu DAO, tu fundación o tu equipo de tesorería.",
  "neworg.profile.title": "El perfil de tu organización",
  "neworg.profile.lede":
    "Se te añadirá automáticamente como propietario único. Las etiquetas de rol de la organización describen a las personas; no cambian los permisos del GrantVault.",
  "neworg.field.name": "Nombre de la organización",
  "neworg.field.name.placeholder": "Ecosistema HashKey LATAM",
  "neworg.field.displayName": "Tu nombre visible",
  "neworg.field.displayName.placeholder": "Alejandro Castro",
  "neworg.field.role": "Tu rol o cargo",
  "neworg.field.role.placeholder": "Responsable de ecosistema",
  "neworg.ownerWallet": "Wallet propietaria conectada:",
  "neworg.action": "Crear organización",
  "neworg.pending": "Creando el espacio de trabajo…",
  "neworg.locked.title": "La creación de organizaciones está bloqueada",
  "neworg.locked.body":
    "Conéctate e inicia sesión con la wallet que deba ser propietaria de esta organización.",
  "grantpage.invalid.title": "Dirección de subvención no válida",
  "grantpage.invalid.body":
    "Abre una dirección de GrantVault válida en {network}.",
  "grantpage.back": "Volver a mis subvenciones",

  // Espacio de trabajo: panel, navegación de organización, acceso y faucet de demo.
  "dashboard.eyebrow": "Tu espacio de trabajo",
  "dashboard.title": "Subvenciones con propósito.",
  "dashboard.lede":
    "Gestiona asignaciones, sigue los desbloqueos y haz avanzar el buen trabajo.",
  "grants.eyebrow": "Operaciones de subvenciones",
  "grants.title": "Tus subvenciones.",
  "grants.lede":
    "Consulta las subvenciones en vivo según el rol de esta wallet.",
  "grants.create": "Crear subvención",
  "dashboard.noDeployment.title":
    "El despliegue de testnet no está configurado",
  "dashboard.noDeployment.body":
    "La aplicación necesita el despliegue de HashVest en testnet para poder cargar o crear subvenciones reales.",
  "dashboard.tablist": "Rol en la subvención",
  "dashboard.tab.0": "Emitidas",
  "dashboard.tab.1": "Recibidas",
  "dashboard.tab.2": "Por revisar",
  "dashboard.grants.loading.title": "Cargando tus subvenciones",
  "dashboard.grants.loading.body": "Leyendo la factory en {network}…",
  "dashboard.grants.error.title": "No se pudieron cargar las subvenciones",
  "dashboard.retry": "Reintentar",
  "dashboard.empty.0.title": "Tu primera subvención empieza aquí.",
  "dashboard.empty.0.body":
    "Crea una asignación totalmente financiada con condiciones claras para tu beneficiario.",
  "dashboard.empty.1.title": "Todavía no has recibido subvenciones.",
  "dashboard.empty.1.body":
    "Las subvenciones asignadas a esta wallet aparecerán aquí automáticamente.",
  "dashboard.empty.2.title": "Todavía no hay hitos que revisar.",
  "dashboard.empty.2.body":
    "Las subvenciones que nombren a esta wallet como revisora aparecerán aquí.",
  "settings.eyebrow": "Configuración del espacio",
  "settings.title": "Organizaciones.",
  "settings.lede":
    "Gestiona las organizaciones que aportan contexto a tus subvenciones.",
  "settings.create": "Crear organización",
  "settings.loading.title": "Cargando organizaciones",
  "settings.loading.body": "Leyendo tus membresías del espacio…",
  "settings.error.title": "No se pudieron cargar las organizaciones",
  "settings.error.body":
    "Actualiza la página y revisa la conexión del espacio.",
  "settings.retry": "Reintentar",
  "settings.list.title": "Tus organizaciones",
  "settings.organization.open": "Abrir",
  "settings.organization.counts": "{members} miembros · {grants} subvenciones",
  "settings.empty.title": "Crea tu primera organización",
  "settings.empty.body":
    "Monta un espacio de trabajo para tu equipo, tu ecosistema o tu tesorería. Te conviertes en propietario automáticamente.",
  "dashboard.connect.eyebrow": "Resumen del espacio",
  "dashboard.connect.title": "Conecta para ver tu trabajo.",
  "dashboard.connect.body":
    "Tus subvenciones, cola de revisión y actividad onchain aparecerán al conectar una wallet.",
  "dashboard.analytics.loading": "Leyendo actividad HSK en vivo…",
  "dashboard.analytics.error":
    "Los datos del panel no están disponibles. Actualiza la página e inténtalo de nuevo.",
  "dashboard.analytics.partial":
    "No se pudo leer parte del historial. El estado actual sigue en vivo; reintenta para completar la línea de tiempo.",
  "dashboard.metric.active": "Subvenciones activas",
  "dashboard.metric.organizations": "Organizaciones",
  "dashboard.metric.pendingReviews": "Revisiones pendientes",
  "dashboard.metric.claimable": "Subvenciones reclamables",
  "dashboard.metric.live": "En vivo",
  "dashboard.metric.synced": "Sincronizado",
  "dashboard.metric.action": "Acción",
  "dashboard.metric.clear": "Al día",
  "dashboard.metric.ready": "Listo",
  "dashboard.metric.none": "Ninguna",
  "dashboard.metric.onchain": "onchain",
  "dashboard.metric.context": "contexto",
  "dashboard.metric.forYou": "para ti",
  "dashboard.chart.activity.title": "Actividad de subvenciones",
  "dashboard.chart.activity.lede":
    "Eventos onchain de tus subvenciones durante los últimos seis meses.",
  "dashboard.chart.activity.aria":
    "Actividad de subvenciones de los últimos seis meses",
  "dashboard.chart.activity.sr":
    "Cada punto representa un evento onchain del panel.",
  "dashboard.chart.series.created": "Creadas",
  "dashboard.chart.series.approved": "Aprobadas",
  "dashboard.chart.series.claimed": "Reclamadas",
  "dashboard.chart.series.revoked": "Revocadas",
  "dashboard.event.created": "Subvención creada",
  "dashboard.event.approved": "Hito aprobado",
  "dashboard.event.claimed": "Tokens reclamados",
  "dashboard.event.revoked": "Subvención revocada",
  "dashboard.chart.strategy.title": "Estrategias",
  "dashboard.chart.strategy.lede": "Distribución por tipo de subvención.",
  "dashboard.chart.strategy.aria": "Distribución de estrategias de subvención",
  "dashboard.chart.strategy.grants": "subvenciones",
  "dashboard.chart.top.title": "Subvenciones principales",
  "dashboard.chart.top.lede":
    "Tus asignaciones onchain más activas en este periodo.",
  "dashboard.chart.top.viewAll": "Ver todas",
  "dashboard.chart.progress.title": "Progreso de reclamos",
  "dashboard.chart.progress.lede": "Asignación reclamada por subvención.",
  "dashboard.chart.progress.empty": "Aún no hay progreso de reclamos.",
  "dashboard.chart.recent.title": "Actividad reciente",
  "dashboard.chart.recent.live": "En vivo",
  "dashboard.table.caption": "Subvenciones principales",
  "dashboard.table.grant": "Subvención",
  "dashboard.table.role": "Rol",
  "dashboard.table.status": "Estado",
  "dashboard.table.claimed": "Reclamado",
  "dashboard.table.updated": "Actualizado",
  "dashboard.table.empty": "No hay subvenciones para esta wallet.",
  "dashboard.activity.empty": "La actividad onchain aparecerá aquí.",
  "dashboard.status.revoked": "Revocada",
  "dashboard.status.completed": "Completada",
  "dashboard.status.active": "Activa",
  "dashboard.time.now": "ahora",
  "dashboard.time.minutes": "hace {count} min",
  "dashboard.time.hours": "hace {count} h",
  "dashboard.time.days": "hace {count} d",
  "dashboard.role.issuer": "Emisor",
  "dashboard.role.beneficiary": "Beneficiario",
  "dashboard.role.reviewer": "Revisor",
  "member.defaultRole": "Miembro",
  "picker.noMembers": "No hay miembros disponibles",
  "picker.chooseBeneficiary": "Elige un beneficiario",
  "picker.chooseReviewer": "Elige un revisor",
  "picker.useExternal": "Usar una wallet externa",
  "picker.useMembers": "Elegir entre los miembros de la organización",
  "workspace.nav.label": "Navegación de la organización",
  "workspace.tab.overview": "Resumen",
  "workspace.tab.grants": "Subvenciones",
  "workspace.tab.members": "Miembros",
  "workspace.tab.templates": "Plantillas",

  // Gestión de plantillas de organización (HAS-13).
  "templates.title": "Plantillas",
  "templates.lede.owner":
    "Puntos de partida reutilizables para el asistente de subvenciones. Una plantilla solo rellena campos editables: nunca firma, financia ni otorga permisos.",
  "templates.lede.member":
    "Puntos de partida reutilizables para el asistente de subvenciones, guardados por el propietario de la organización. Puedes aplicar una al crear una subvención; solo el propietario puede modificarlas.",
  "templates.loading.title": "Cargando plantillas",
  "templates.loading.body": "Leyendo las plantillas de esta organización.",
  "templates.error.title": "Plantillas no disponibles",
  "templates.error.body":
    "No se pudieron cargar las plantillas de esta organización. Crear una subvención sin plantilla sigue funcionando.",
  "templates.retry": "Reintentar",
  "templates.empty": "Aún no hay plantillas.",
  "templates.new": "Nueva plantilla",
  "templates.edit": "Editar",
  "templates.delete": "Eliminar",
  "templates.deleteConfirm":
    "¿Eliminar la plantilla «{name}»? Las subvenciones ya creadas a partir de ella mantienen sus condiciones y siguen mostrando su nombre.",
  "templates.save": "Guardar plantilla",
  "templates.saving": "Guardando…",
  "templates.cancel": "Cancelar",
  "templates.form.lede":
    "Todo lo de aquí es una sugerencia que el asistente rellena. Quien cree la subvención edita cada valor y elige a la persona beneficiaria.",
  "templates.field.name": "Nombre",
  "templates.field.name.placeholder": "Subvención para builders",
  "templates.field.description": "Descripción",
  "templates.field.description.placeholder":
    "Cuándo debería tu equipo usar esta plantilla.",
  "templates.field.strategy": "Estrategia de desbloqueo",
  "templates.field.milestones": "Hitos",
  "templates.field.milestones.hint":
    "Partes de la asignación, en porcentajes enteros que sumen 100. Los importes se calculan en el asistente a partir de la asignación indicada allí.",
  "templates.field.milestone.title": "Hito {index}",
  "templates.field.milestone.percent": "Parte (%)",
  "templates.field.reviewer": "Persona revisora por defecto",
  "templates.field.reviewer.none": "Sin valor por defecto",
  "templates.field.reviewer.hint":
    "Preselecciona a este miembro en el asistente. Es una sugerencia, no un permiso: la persona revisora que queda en la cadena es aquella con la que se crea la subvención.",
  "templates.field.allocation": "Asignación sugerida",
  "templates.field.allocation.hint":
    "Opcional. Un importe inicial que el asistente rellena; nunca se lee ni se concilia con una bóveda.",
  "templates.milestone.add": "Añadir hito",
  "templates.milestone.remove": "Quitar",
  "templates.milestone.total": "Total: {total}%",
  "templates.meta.milestones": "{count} hitos",
  "templates.meta.reviewer": "revisión: {member}",
  "templates.meta.formerMember": "miembro anterior",
  "templates.meta.version": "v{version}",
  "templates.error.name":
    "Ponle a la plantilla un nombre de como máximo {max} caracteres.",
  "templates.error.description":
    "La descripción debe tener como máximo {max} caracteres.",
  "templates.error.duration": "La duración debe ser un número entero positivo.",
  "templates.error.cliff":
    "El periodo de espera debe ser un número entero, cero o más.",
  "templates.error.cliffTooLong":
    "El periodo de espera no puede superar la duración total.",
  "templates.error.milestoneCount":
    "Esta estrategia necesita entre 1 y {max} hitos.",
  "templates.error.milestoneTitle":
    "El hito {index} necesita un título de como máximo {max} caracteres.",
  "templates.error.percent":
    "El hito {index} necesita una parte entera y positiva.",
  "templates.error.percentSum":
    "Las partes de los hitos deben sumar 100 %. Ahora suman {total} %.",
  "templates.error.allocation":
    "La asignación sugerida debe ser un importe positivo.",
  "workspace.loading.title": "Cargando el espacio de trabajo",
  "workspace.loading.body": "Leyendo el contexto de la organización…",
  "workspace.error.title": "No se pudo cargar el espacio de trabajo",
  "workspace.retry": "Reintentar",
  "workspace.backToOrganizations": "Organizaciones",
  "workspace.eyebrow": "Organización de HashVest",
  "workspace.createGrant": "Crear subvención",
  "workspace.counts.member": "{count} miembro",
  "workspace.counts.members": "{count} miembros",
  "workspace.counts.grant": "{count} subvención",
  "workspace.counts.grants": "{count} subvenciones",
  "workspace.members.loading": "Cargando miembros…",
  "workspace.members.error": "No se pudieron cargar los miembros.",
  "workspace.members.empty": "Todavía no hay miembros.",
  "workspace.members.more": "+{count} miembros más",
  "access.connect.title": "Conecta una wallet para abrir un espacio de trabajo",
  "access.connect.body":
    "El acceso al espacio usa una firma de wallet de un solo uso. No hace falta ninguna cuenta de correo.",
  "access.network.title": "Cambia a {network} antes de iniciar sesión",
  "access.network.body":
    "Las sesiones de espacio de trabajo de HashVest están ligadas a la chain {chainId}.",
  "access.notConfigured.title":
    "La autenticación del espacio de trabajo no está configurada",
  "access.notConfigured.body":
    "Configura el secreto de autenticación del servidor y la service role key de Supabase, y reinicia la app.",
  "access.walletChanged.title": "La wallet cambió",
  "access.walletChanged.body":
    "Tu wallet actual no coincide con la sesión autenticada del espacio de trabajo. Inicia sesión de nuevo antes de gestionar datos de la organización.",
  "access.signIn.title": "Inicia sesión en tu espacio de HashVest",
  "access.signIn.body":
    "Una firma habilita el contexto de organización off-chain. No autoriza ninguna acción en la blockchain.",
  "faucet.title": "Token de demo · {symbol}",
  "faucet.lede":
    "Tokens de prueba para tu primera subvención. Sin valor monetario.",
  "faucet.balance": "Tu saldo:",
  "faucet.balanceError":
    "El saldo del token no está disponible. Revisa el RPC de testnet.",
  "faucet.action": "Conseguir {symbol} de demo",
  "faucet.minting": "Acuñando…",

  // Superficies de subvención: UI compartida, tarjetas y la página de detalle. Direcciones, hashes, números de bloque, símbolos y URLs de RPC llegan como valores.
  "role.Issuer": "Emisor",
  "role.Beneficiary": "Beneficiario",
  "role.Reviewer": "Revisor",
  "party.issuer": "Emisor",
  "party.beneficiary": "Beneficiario",
  "party.reviewer": "Revisor",
  "party.token": "Token",
  "ui.wallet.providerUnavailableRepair":
    "Tu proveedor de wallet no está disponible.",
  "ui.connect.title": "Conecta una wallet para empezar",
  "ui.connect.body":
    "Conecta tu wallet de emisor, beneficiario o revisor. Todas las subvenciones viven en {network}.",
  "ui.switch.title": "Cambia a {network}",
  "ui.switch.body":
    "Tu wallet está en otra red. Las transacciones solo funcionan en la chain {chainId}.",
  "ui.switch.switching": "Cambiando…",
  "ui.switch.action": "Cambiar a {network}",
  "ui.rpc.title": "El RPC de tu wallet en {network} no está disponible",
  "ui.rpc.body.before":
    "La wallet informa de la chain {chainId}, pero su RPC no puede leer el último bloque. HashVest usa el endpoint canónico de HSK en ",
  "ui.rpc.body.after":
    ". Un RPC de terceros desactualizado puede hacer que una aprobación de token válida parezca un revert del contrato.",
  "ui.rpc.updating": "Actualizando el RPC de la wallet…",
  "ui.rpc.action": "Usar el RPC canónico de HSK",
  "ui.rpc.manual.before":
    "Si tu wallet rechaza la actualización, edita {network} a mano: RPC URL ",
  "ui.rpc.manual.middle": ", chain ID ",
  "ui.rpc.manual.after": ".",
  "ui.address.copy": "Copiar {address}",
  "ui.address.copied": "Copiada",
  "ui.address.copyAction": "Copiar",
  "ui.address.copyUnavailable": "No se puede copiar; selecciona la dirección.",
  "ui.tx.confirmed": "confirmada",
  "ui.tx.submitted": "enviada",
  "ui.lifecycle.completed": "Completada",
  "ui.lifecycle.active": "Activa",
  "ui.funding.title": "Salud de la financiación",
  "ui.funding.percent": "{percent}% financiado",
  "ui.funding.healthy": "Saludable",
  "ui.funding.underfunded": "Infrafinanciada",
  "ui.funding.progressLabel": "Salud de la financiación de la subvención",
  "ui.funding.allocation": "Asignación",
  "ui.funding.vaultBalance": "Saldo del vault",
  "ui.funding.required": "Necesario tras los reclamos",
  "ui.funding.shortfall": "Déficit: {amount}",
  "ui.funding.surplus":
    "Saldo extra en el vault: {amount}. Queda fuera de la asignación fija.",
  "card.loading": "Cargando la subvención {address}…",
  "card.error.title": "No se pudo cargar la subvención",
  "card.stale.title": "El estado en vivo de la subvención no está disponible",
  "card.stale.body":
    "No se pudo refrescar la última lectura de HSK, así que los valores actuales están ocultos.",
  "card.retry": "Reintentar",
  "card.fromTemplate": "Desde la plantilla {template}",
  "card.totalAllocation": "Asignación total",
  "card.unlocked": "Desbloqueado",
  "card.unlockedProgress": "Desbloqueo de la subvención",
  "card.milestonesToReview.one": "{count} hito por revisar",
  "card.milestonesToReview.other": "{count} hitos por revisar",
  "card.availableToClaim": "Disponible para reclamar",
  "card.claimable": "Reclamable",
  "detail.loading.title": "Cargando la subvención",
  "detail.loading.body": "Leyendo el vault y el token en {network}…",
  "detail.back": "Mis subvenciones",
  "detail.error.title": "No se puede leer esta subvención",
  "detail.error.body":
    "Comprueba que sea un GrantVault de HashVest en {network}. El RPC también puede estar temporalmente caído.",
  "detail.stale.title": "El estado en vivo de la subvención no está disponible",
  "detail.stale.body":
    "No se pudo refrescar la última lectura de HSK, así que los valores actuales quedan ocultos hasta que el estado en vivo vuelva a estar disponible.",
  "detail.retry": "Reintentar",
  "detail.fromTemplate":
    "Desde la plantilla {template} · solo metadatos del espacio de trabajo",
  "detail.eyebrow": "Vault de subvención · {network}",
  "detail.youAre.Issuer": "Eres el emisor",
  "detail.youAre.Beneficiary": "Eres el beneficiario",
  "detail.youAre.Reviewer": "Eres el revisor",
  "detail.stat.totalAllocated": "Asignado en total",
  "detail.stat.unlocked": "Desbloqueado",
  "detail.stat.claimable": "Reclamable",
  "detail.stat.claimed": "Reclamado",
  "detail.schedule.title": "Calendario de vesting",
  "detail.schedule.lede":
    "Un desbloqueo inicial opcional se puede reclamar al inicio. El resto veste de forma lineal; el cliff retrasa ese resto sin reiniciar la curva.",
  "detail.schedule.vestedByTime": "{amount} liberado por tiempo",
  "detail.schedule.progressLabel": "Liberado por tiempo",
  "detail.schedule.start": "Inicio",
  "detail.schedule.cliffReached": "Cliff alcanzado",
  "detail.schedule.fullyVested": "Totalmente liberado",
  "detail.schedule.initialUnlock":
    "Desbloqueo inicial (TGE): {amount} ({percent}%)",
  "detail.schedule.initialUnlockHint":
    "Disponible de inmediato al inicio. Los {remaining} restantes siguen el calendario de abajo.",
  "detail.hybrid.formula":
    "Híbrida = min(liberado por tiempo, hitos aprobados)",
  "detail.hybrid.formulaWithInitial":
    "Híbrida = desbloqueo inicial + min(resto del vesting temporal, hitos aprobados)",
  "detail.hybrid.initialUnlock": "Desbloqueo inicial: {amount}",
  "detail.hybrid.timeVested": "Liberado por tiempo: {amount}",
  "detail.hybrid.milestonesApproved": "Hitos aprobados: {amount}",
  "detail.hybrid.unlocked": "Desbloqueado: {amount}",
  "detail.milestones.title": "Hitos",
  "detail.milestones.summary": "{approved} de {total} aprobados · {amount}",
  "detail.milestone.approved": "Aprobado",
  "detail.milestone.pending": "Pendiente",
  "detail.milestone.approveAction": "Aprobar hito",
  "detail.evidence.title": "Evidencia del hito",
  "detail.evidence.loading": "Cargando evidencia del workspace…",
  "detail.evidence.error":
    "La evidencia del workspace no está disponible temporalmente.",
  "detail.evidence.retry": "Reintentar",
  "detail.evidence.empty": "No hay evidencia enviada para este hito.",
  "detail.evidence.unsafeLink":
    "Este enlace de evidencia no es seguro para abrir.",
  "detail.evidence.status.submitted": "Enviada",
  "detail.evidence.submitter": "Enviada por",
  "detail.evidence.created": "Creada",
  "detail.evidence.updated": "Actualizada",
  "detail.evidence.note": "Nota",
  "detail.evidence.type.githubPr": "PR de GitHub",
  "detail.evidence.type.githubCommit": "Commit de GitHub",
  "detail.evidence.type.deployment": "Despliegue",
  "detail.evidence.type.document": "Documento",
  "detail.evidence.type.hskTransaction": "Transacción HSK",
  "detail.evidence.type.ipfs": "IPFS",
  "detail.terms.title": "Términos de la subvención",
  "detail.terms.fixed":
    "Los términos y la asignación son fijos. Esta subvención no se puede revocar.",
  "detail.claim.title": "Listo para reclamar",
  "detail.claim.pending": "Transacción en curso…",
  "detail.claim.action": "Reclamar {amount}",
  "detail.claim.beneficiaryBalance": "Saldo de tokens del beneficiario",
  "detail.sponsor.title": "Primer reclamo pagado por la organización",
  "detail.sponsor.lede":
    "Autorizas este vault, importe y relayer exactos con la firma de tu wallet. La organización paga la comisión HSK; nunca puede elegir otro beneficiario o importe.",
  "detail.sponsor.action": "Patrocinar mi primer reclamo",
  "detail.sponsor.confirmTitle": "Confirma el primer reclamo patrocinado",
  "detail.sponsor.confirmBody":
    "Tu firma autoriza un único reclamo de {amount} desde este vault. El relayer de la organización pagará la comisión de la transacción HSK.",
  "detail.sponsor.confirm": "Firmar y enviar",
  "detail.sponsor.cancel": "Cancelar",
  "detail.sponsor.signing": "Esperando la firma de tu wallet…",
  "detail.sponsor.submitting": "Enviando el reclamo patrocinado…",
  "detail.sponsor.retry": "Reintentar reclamo patrocinado",
  "detail.sponsor.gasPayer": "Pagador de gas",
  "detail.sponsor.transaction": "Transacción patrocinada",
  "detail.sponsor.status.requested": "Solicitud de patrocinio registrada",
  "detail.sponsor.status.processing":
    "El relayer está preparando la transacción…",
  "detail.sponsor.status.submitted": "Transacción patrocinada enviada",
  "detail.sponsor.status.confirmed": "Primer reclamo patrocinado confirmado",
  "detail.sponsor.status.failed": "El reclamo patrocinado falló",
  "detail.sponsor.statusUnavailable":
    "No se pudo actualizar el estado del reclamo patrocinado. La solicitud sigue registrada; el reclamo normal continúa disponible.",
  "detail.sponsor.expired":
    "Esta solicitud firmada expiró. Inicia un nuevo reclamo patrocinado o usa el reclamo normal.",
  "detail.sponsor.failedFallback":
    "El relayer no pudo completar esta solicitud. Usa el reclamo normal pagado por tu wallet o reintenta mientras la solicitud siga vigente.",
  "detail.sponsor.manualFallback":
    "El reclamo normal pagado por tu wallet siempre continúa disponible.",
  "detail.sponsor.error":
    "No se pudo completar el reclamo patrocinado. HashVest no cobró tu wallet; usa el reclamo normal o reintenta.",
  "detail.sponsor.unavailable":
    "Los reclamos patrocinados no están disponibles temporalmente. El reclamo normal continúa disponible.",
  "detail.sponsor.legacy":
    "Este GrantVault usa el contrato legacy de reclamo manual. Usa el reclamo normal de abajo.",
  "detail.sponsor.firstClaimOnly":
    "El patrocinio está limitado al primer reclamo. Usa el reclamo normal para esta subvención.",
  "detail.sponsor.noClaimable":
    "No hay un importe reclamable actualmente para patrocinar.",
  "detail.sponsor.checking":
    "Comprobando la política de patrocinio de la organización…",
  "detail.sponsor.policyDisabled":
    "La organización no activó los reclamos patrocinados. El reclamo normal continúa disponible.",
  "detail.sponsor.limitReached":
    "Se alcanzó el límite de patrocinio de la organización. El reclamo normal continúa disponible.",
  "detail.sponsor.relayerMissing":
    "El relayer de la organización aún no está configurado o financiado. Usa el reclamo normal.",
  "detail.eligibility.title": "Elegibilidad",
  "detail.eligibility.none":
    "No hay proveedor configurado. Los reclamos no requieren comprobación de elegibilidad.",
  "detail.eligibility.unavailable": "Proveedor no disponible",
  "detail.eligibility.eligible": "El beneficiario es elegible",
  "detail.eligibility.notEligible": "El beneficiario no es elegible",
  "detail.eligibility.note":
    "El proveedor controla la elegibilidad del beneficiario. El adaptador de demo no es KYC ni cumplimiento real.",
  "detail.footer.block": "Lecturas en vivo del contrato · Bloque {block}",
  "detail.footer.refresh":
    "Se refresca cada {seconds} segundos y después de cada transacción.",
  "detail.tx.claim": "Reclamar tokens",
  "detail.tx.approveMilestone": "Aprobar el hito {index}",
  "detail.rpcUnavailable": "El RPC de {network} no está disponible.",
  "detail.claimReason.connect":
    "Conecta la wallet del beneficiario para reclamar tokens.",
  "detail.claimReason.providerError":
    "No se pudo leer el proveedor de elegibilidad. Los reclamos seguirán bloqueados hasta que vuelva a estar disponible.",
  "detail.claimReason.notEligible":
    "El proveedor configurado no ha marcado al beneficiario como elegible.",
  "detail.claimReason.completed": "Ya se ha reclamado la asignación completa.",
  "detail.claimReason.awaitingMilestone":
    "Esperando a que el revisor apruebe un hito.",
  "detail.claimReason.awaitingCliff":
    "Los tokens esperan al inicio del vesting o al cliff.",
  "detail.claimReason.allClaimed":
    "Ya se han reclamado todos los tokens desbloqueados. Hace falta más tiempo o más avance en los hitos.",
  "detail.claimReason.ready":
    "Reclama la cantidad desbloqueada directamente a tu wallet de beneficiario.",

  // Asistente de subvención (/grants/new). Símbolos de token, decimales, chain ids, direcciones y la firma isEligible(address) son literales que llegan como valores.
  "wizard.eyebrow": "Nueva asignación",
  "wizard.title.create": "Crea una subvención.",
  "wizard.title.created": "Tu subvención está activa.",
  "wizard.lede.create":
    "Define los términos una vez. Financia la asignación completa. Deja que las condiciones hagan el resto.",
  "wizard.lede.created":
    "La asignación completa de tokens está en su propio vault en {network}.",
  "wizard.notice.organization.title": "Creando para {organization}",
  "wizard.notice.organization.body":
    "El título, la asignación, los participantes y los permisos onchain siguen en el GrantVault. La descripción opcional se guarda como metadatos del espacio de trabajo tras confirmarse la transacción.",
  "wizard.notice.noDeployment.title":
    "El despliegue de testnet no está configurado",
  "wizard.notice.noDeployment.body":
    "Podrás crear subvenciones cuando los contratos de HashVest estén desplegados y sincronizados.",
  "wizard.sync.pending.title": "Guardando metadatos del espacio de trabajo",
  "wizard.sync.pending.body":
    "La transacción en HSK está confirmada. Vinculando esta subvención al espacio de trabajo…",
  "wizard.sync.saved":
    "Metadatos guardados. La subvención ya es visible en esta organización.",
  "wizard.sync.failed.title": "La subvención se creó correctamente onchain",
  "wizard.sync.failed.body":
    "No se pudieron guardar los metadatos del espacio de trabajo. El GrantVault y sus fondos siguen activos; reintenta la sincronización sin crear otra subvención.",
  "wizard.sync.retrying": "Reintentando sincronización…",
  "wizard.sync.retry": "Reintentar sincronización",
  "wizard.openGrant": "Abrir subvención",
  "wizard.confirmed.before":
    "La transacción se confirmó. Encuentra tu nueva subvención en el ",
  "wizard.confirmed.link": "panel de emitidas",
  "wizard.confirmed.after": ".",
  "wizard.progress": "Progreso de creación",
  "wizard.step.0": "Plantilla",
  "wizard.step.1": "Subvención",
  "wizard.step.2": "Estrategia",
  "wizard.step.3": "Condiciones",
  "wizard.step.4": "Revisión",
  "wizard.stepTitle.0": "Empieza desde una plantilla",
  "wizard.stepTitle.1": "¿Para quién es esta subvención?",
  "wizard.stepTitle.2": "Elige cómo se desbloquean los tokens",
  "wizard.stepTitle.3": "Define las condiciones",
  "wizard.stepTitle.4": "Revisa antes de financiar",
  "wizard.field.title.label": "Título de la subvención",
  "wizard.field.title.hint":
    "Por ejemplo: Subvención para builder del ecosistema, o Asignación para colaborador.",
  "wizard.field.title.placeholder": "Subvención para builder del ecosistema",
  "wizard.field.beneficiary.label": "Beneficiario",
  "wizard.field.beneficiary.hint":
    "La wallet exacta del miembro seleccionado pasa a ser el beneficiario onchain. Solo esa wallet puede reclamar.",
  "wizard.field.beneficiaryWallet.label": "Wallet del beneficiario",
  "wizard.field.beneficiaryWallet.hint":
    "Solo esta dirección puede reclamar los tokens desbloqueados. Revísala bien.",
  "wizard.members.unavailable":
    "El directorio de miembros no está disponible. Puedes seguir usando una wallet externa mientras se recuperan los metadatos.",
  "wizard.field.description.label": "Descripción del espacio de trabajo",
  "wizard.field.description.hint":
    "Contexto de producto opcional. No sustituye al título onchain.",
  "wizard.field.description.placeholder":
    "Apoyo al ecosistema de desarrolladores de HSK.",
  "wizard.field.token.label": "Dirección del token ERC20",
  "wizard.field.token.hint":
    "Usa un ERC20 normal en {network}. No se admiten HSK nativo ni tokens con comisión por transferencia.",
  "wizard.token.useDemo": "Usar {symbol} de demo",
  "wizard.token.reading": "Leyendo metadatos del token en {network}…",
  "wizard.token.error":
    "No se pudo leer este token. Confirma la dirección y la red.",
  "wizard.token.decimals": "{symbol} · {decimals} decimales",
  "wizard.field.allocation.label": "Asignación total",
  "wizard.field.allocation.hint":
    "Introduce unidades de token, no unidades base. El importe completo se transfiere al vault.",
  "wizard.schedule.title": "Calendario de vesting",
  "wizard.schedule.lede":
    "Un desbloqueo inicial opcional se puede reclamar al inicio. El resto veste de forma lineal desde el inicio; el cliff retiene ese resto hasta que se alcanza.",
  "wizard.schedule.demoTip":
    "Consejo para la demo: usa una duración de 5 minutos y un cliff de 0 minutos.",
  "wizard.field.start.label": "Fecha de inicio (opcional)",
  "wizard.field.start.hint":
    "Tu zona horaria local. Déjalo vacío para empezar en el timestamp de la transacción de creación. Un inicio en el pasado libera de inmediato la parte transcurrida.",
  "wizard.field.unit.label": "Unidad del calendario",
  "wizard.unit.minutes": "Minutos",
  "wizard.unit.hours": "Horas",
  "wizard.unit.days": "Días",
  "wizard.field.cliff.label": "Cliff",
  "wizard.field.duration.label": "Duración total",
  "wizard.field.initialUnlock.label": "Desbloqueo inicial / TGE (opcional)",
  "wizard.field.initialUnlock.hint":
    "Cantidad de tokens desbloqueada de inmediato al inicio, antes del cliff. El resto veste de forma lineal. Déjalo vacío o en 0 para un vesting clásico con cliff.",
  "wizard.field.reviewer.label": "Revisor",
  "wizard.field.reviewer.hint":
    "La wallet exacta del miembro seleccionado pasa a ser el revisor onchain para aprobar hitos.",
  "wizard.field.reviewerWallet.label": "Wallet del revisor",
  "wizard.field.reviewerWallet.hint":
    "Esta wallet puede aprobar hitos. Los importes y los términos no se pueden editar.",
  "wizard.milestones.title": "Hitos",
  "wizard.milestones.lede":
    "Los importes deben sumar exactamente {amount} {symbol}. Hasta {max} hitos.",
  "wizard.milestones.theAllocation": "la asignación",
  "wizard.milestones.add": "Añadir hito +",
  "wizard.milestone.index": "Hito {index}",
  "wizard.milestone.remove": "Eliminar",
  "wizard.field.milestoneTitle.label": "Título",
  "wizard.field.milestoneTitle.placeholder": "Entregar un prototipo funcional",
  "wizard.field.milestoneAmount.label": "Importe ({symbol})",
  "wizard.field.milestoneAmount.fallbackSymbol": "tokens",
  "wizard.advanced.summary": "Avanzado · proveedor de elegibilidad opcional",
  "wizard.field.eligibility.label": "Dirección del proveedor de elegibilidad",
  "wizard.field.eligibility.hint":
    "Déjalo vacío para no comprobar elegibilidad. El proveedor debe implementar isEligible(address). Este adaptador de demo no es KYC ni cumplimiento normativo.",
  "wizard.field.eligibility.placeholder": "Ninguno",
  "wizard.review.fromPreset":
    "Partiste del preset {preset}. Eso son solo metadatos del espacio de trabajo — los términos de abajo son lo que va onchain.",
  "wizard.review.issuer": "Emisor",
  "wizard.review.beneficiary": "Beneficiario",
  "wizard.review.token": "Token",
  "wizard.review.reviewer": "Revisor",
  "wizard.review.start": "Inicio",
  "wizard.review.startCreation": "Timestamp de creación",
  "wizard.review.cliffDuration": "Cliff / duración total",
  "wizard.review.initialUnlock": "Desbloqueo inicial (TGE)",
  "wizard.review.initialUnlockValue": "{amount} {symbol} ({percent}%)",
  "wizard.review.initialUnlockNone": "Ninguno (0%)",
  "wizard.review.schedulePreview": "Vista previa del calendario:",
  "wizard.review.scheduleAtStart":
    "Al inicio: {amount} {symbol} desbloqueados de inmediato",
  "wizard.review.scheduleAtCliff":
    "Al final del cliff: {amount} {symbol} acumulados por tiempo",
  "wizard.review.scheduleAtCompletion":
    "Al completar: {amount} {symbol} (100%)",
  "wizard.review.eligibility": "Proveedor de elegibilidad",
  "wizard.review.eligibilityNone": "Ninguno — desactivado",
  "wizard.review.permanent.title": "Estos términos son permanentes",
  "wizard.review.permanent.body":
    "Sin revocación, sin retiradas por parte del emisor y sin cambios en la economía de la subvención. Si hace falta, autorizarás el gasto del token y después crearás y financiarás el vault por completo en una sola transacción.",
  "wizard.nav.back": "Atrás",
  "wizard.nav.continue": "Continuar",
  "wizard.nav.pending": "Transacción en curso…",
  "wizard.nav.submit": "Autorizar y crear subvención",
  "wizard.walletChanged":
    "La wallet cambió. Vuelve atrás y revisa con el emisor actual.",
  "wizard.tx.resetAllowance": "Restablecer el allowance del token",
  "wizard.tx.approve": "Autorizar el gasto del token",
  "wizard.tx.create": "Crear y financiar la subvención",
  "wizard.error.title": "Ponle un título a tu subvención.",
  "wizard.error.beneficiaryMember":
    "Elige un miembro beneficiario o usa una wallet externa.",
  "wizard.error.beneficiaryAddress":
    "Introduce una dirección de beneficiario válida y distinta de cero.",
  "wizard.error.token":
    "Introduce una dirección de contrato ERC20 válida. HSK nativo no está soportado.",
  "wizard.error.tokenMetadata":
    "Espera a que carguen el símbolo y los decimales del ERC20. Comprueba que el token esté desplegado en {network}.",
  "wizard.error.issuerWallet": "Conecta la wallet emisora antes de revisar.",
  "wizard.error.duration": "La duración debe ser un número entero positivo.",
  "wizard.error.cliff": "El cliff debe ser un número entero no negativo.",
  "wizard.error.cliffTooLong":
    "El cliff no puede ser más largo que la duración total.",
  "wizard.error.durationTooLarge": "La duración es demasiado grande.",
  "wizard.error.startDate": "Introduce una fecha de inicio válida.",
  "wizard.error.eligibility":
    "Introduce una dirección de proveedor de elegibilidad válida o déjala vacía.",
  "wizard.error.reviewerMember":
    "Elige un miembro revisor o usa una wallet externa.",
  "wizard.error.reviewerRequired":
    "Las subvenciones por hitos e híbridas necesitan una dirección de revisor.",
  "wizard.error.milestoneCount": "Añade entre 1 y {max} hitos.",
  "wizard.error.milestoneSum":
    "Los importes de los hitos deben sumar exactamente la asignación total.",
  "wizard.error.milestoneSumRemaining":
    "Los importes de los hitos deben sumar exactamente la asignación restante (asignación total menos el desbloqueo inicial).",
  "wizard.error.initialUnlockExceeds":
    "El desbloqueo inicial no puede superar la asignación total de la subvención.",
  "wizard.error.initialUnlockMilestone":
    "Las subvenciones solo por hitos no pueden tener un desbloqueo inicial. Usa la estrategia de tiempo o híbrida.",
  "wizard.error.hybridInitialUnlockFull":
    "En subvenciones híbridas, el desbloqueo inicial no puede ser la asignación completa porque los hitos deben cubrir el resto.",
  "wizard.error.reviewFirst":
    "Revisa la subvención y comprueba el despliegue de testnet antes de continuar.",
  "wizard.error.eligibilityNoCode":
    "El proveedor de elegibilidad no tiene código de contrato en {network}.",
  "wizard.error.reviewAgain":
    "Revisa la subvención otra vez antes de sincronizar los metadatos del espacio de trabajo.",
  "wizard.error.walletChangedSync":
    "La wallet cambió. Inicia sesión de nuevo con la wallet emisora antes de sincronizar los metadatos.",

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
    "Desbloquea cualquier importe inicial al inicio y, después, la menor entre el resto liberado por tiempo y los hitos aprobados. Ambas condiciones se aplican al resto.",

  // Selector de presets en el asistente de subvención.
  "wizard.preset.title": "Empieza desde un preset",
  "wizard.preset.lede":
    "Opcional. Un preset rellena una estrategia, un calendario y un reparto de hitos que puedes editar o borrar. Nunca cambia lo que guarda el vault.",
  "wizard.preset.custom.name": "Personalizado / en blanco",
  "wizard.preset.custom.tagline":
    "Configura cada valor tú mismo, exactamente como antes.",
  "wizard.preset.custom.meta": "Borra los campos que rellenó un preset",
  "wizard.preset.needsReviewer": "necesita revisor",
  "wizard.preset.allocationShare": "{percent}% de la asignación",

  // Plantillas de organización en el paso Plantilla del asistente (HAS-13).
  "wizard.orgTemplates.title": "Plantillas de tu organización",
  "wizard.orgTemplates.lede":
    "Opcional. Una plantilla guardada por el propietario de una organización rellena los mismos campos editables que un preajuste incorporado. Tú sigues eligiendo la persona beneficiaria y revisas cada valor antes de firmar.",
  "wizard.orgTemplates.organization": "Organización",
  "wizard.orgTemplates.chooseOrganization": "Elige una organización",
  "wizard.orgTemplates.loading": "Cargando plantillas…",
  "wizard.orgTemplates.error":
    "Las plantillas no están disponibles ahora mismo. Los preajustes de abajo siguen funcionando.",
  "wizard.orgTemplates.empty": "Esta organización aún no tiene plantillas.",
  "wizard.orgTemplates.noDescription": "Sin descripción.",
  "wizard.orgTemplates.suggestsReviewer": "sugiere una persona revisora",
  "wizard.orgTemplates.manage": "Gestionar plantillas",
  "wizard.orgTemplates.invalid":
    "Esta plantilla ya no se puede aplicar. Pide al propietario de la organización que la actualice.",

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

  "ai.launcher.label": "Redactar una subvención a partir de una descripción",
  "ai.launcher.short": "IA",
  "ai.panel.title": "Describe la subvención",
  "ai.panel.lede":
    "Opcional. Escribe qué debe hacer la subvención y esto rellenará el asistente con un borrador editable.",
  "ai.panel.close": "Cerrar el panel de borrador",
  "ai.field.prompt.label": "¿Qué debe hacer esta subvención?",
  "ai.field.prompt.placeholder":
    "Una subvención de seis meses para una persona desarrolladora, 500 tokens, liberados contra tres hitos.",
  "ai.field.prompt.counter": "{count} de {max} caracteres",
  "ai.action.draft": "Redactar",
  "ai.action.drafting": "Redactando",
  "ai.action.apply": "Aplicar al asistente",
  "ai.action.discard": "Descartar",
  "ai.action.retry": "Reintentar",

  "ai.progress.0": "Leyendo la petición",
  "ai.progress.1": "Quitando todo lo privado",
  "ai.progress.2": "Eligiendo una estrategia de desbloqueo",
  "ai.progress.3": "Repartiendo la asignación",
  "ai.progress.4": "Comprobándolo contra las reglas del protocolo",

  "ai.draft.name": "Borrador de IA",
  "ai.draft.tagline": "Un punto de partida. Todo valor sigue siendo editable.",
  "ai.draft.sourceModel": "Redactado por el proveedor configurado",
  "ai.draft.sourceFallback": "Redactado sin conexión, sin proveedor",
  "ai.draft.strategy": "Estrategia",
  "ai.draft.allocation": "Asignación",
  "ai.draft.schedule": "Calendario",
  "ai.draft.milestones": "Hitos",
  "ai.preset.applied": "De un borrador de IA",

  "ai.section.assumptions": "Supuestos",
  "ai.section.adjustments": "Ajustado por ti",
  "ai.section.unsupported": "No admitido",
  "ai.section.confirm": "Tú sigues eligiendo",
  "ai.confirm.beneficiary": "La wallet beneficiaria",
  "ai.confirm.reviewer": "La wallet revisora",
  "ai.confirm.token": "El token a conceder",

  "ai.adjustment.allocationClamped":
    "Se redujo la asignación de {requested} a {maximum}: el faucet de demo no puede financiar más.",
  "ai.adjustment.cliffClamped":
    "Se acortó el cliff de {cliff} a {duration}: un cliff no puede durar más que su propio calendario.",
  "ai.adjustment.durationDefaulted":
    "Se fijó la duración en {duration}, porque el borrador no pedía ninguna.",
  "ai.adjustment.durationClamped":
    "Se acortó la duración de {requested} a {maximum}: el borrador pedía un calendario de más de diez años.",
  "ai.adjustment.timingDefaulted":
    "Se añadió un calendario por defecto, porque esta estrategia necesita uno.",
  "ai.adjustment.timingDropped":
    "Se quitó el calendario: una subvención por hitos no tiene ninguno.",
  "ai.adjustment.milestonesDefaulted":
    "Se añadió un único hito que cubre toda la asignación.",
  "ai.adjustment.milestonesDropped":
    "Se quitaron los hitos: la liberación por tiempo no tiene ninguno.",
  "ai.adjustment.milestonesTruncated":
    "Se conservaron los primeros {maximum} hitos, que es todo lo que acepta un vault.",
  "ai.adjustment.milestoneTitlesFilled":
    "Se nombraron los hitos que el borrador dejó en blanco.",
  "ai.adjustment.percentagesRescaled":
    "Se reescaló el reparto de hitos para que sume 100%.",
  "ai.adjustment.fieldsDropped":
    "Se ignoraron {count} campo(s) que una plantilla de subvención no contempla: {fields}.",
  "ai.adjustment.proseRedacted":
    "Se quitó algo privado que el borrador había escrito en su propio texto.",
  "ai.adjustment.offlineDraft":
    "Redactado sin conexión solo con tus palabras. No se usó ningún proveedor.",
  "ai.adjustment.scheduleCompressed":
    "Se comprimió {requested} en {duration} unidades de demo para que el ciclo entero se pueda ver.",
  "ai.adjustment.requestAddressIgnored":
    "Se ignoró la dirección de wallet de tu petición. Cada wallet la eliges tú.",
  "ai.adjustment.requestSecretIgnored":
    "Se quitó algo que parecía una clave o una frase semilla. Nunca pegues una aquí.",
  "ai.adjustment.requestActionIgnored":
    "Esto solo redacta una plantilla. No puede firmar, enviar, aprobar, reclamar ni revocar.",

  "ai.error.unauthenticated": "Inicia sesión para redactar una subvención.",
  "ai.error.rateLimited":
    "Demasiados borradores. Reinténtalo en {seconds} segundos.",
  "ai.error.invalidPrompt":
    "Describe la subvención en entre {min} y {max} caracteres.",
  "ai.error.failed":
    "No se pudo producir el borrador. El asistente de abajo sigue funcionando.",
  "ai.disclaimer":
    "Un borrador solo sugiere. Tú confirmas cada valor, y las comprobaciones del propio protocolo se siguen ejecutando antes de firmar nada.",

  "meta.title": "HashVest — Subvenciones programables",
  "meta.description":
    "Subvenciones de tokens totalmente financiadas con desbloqueos por tiempo, por hitos e híbridos en HashKey Chain.",
};
