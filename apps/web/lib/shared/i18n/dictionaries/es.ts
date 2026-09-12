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

  // Espacio de trabajo: panel, navegación de organización, acceso y faucet de demo.
  "dashboard.eyebrow": "Tu espacio de trabajo",
  "dashboard.title": "Subvenciones con propósito.",
  "dashboard.lede":
    "Gestiona asignaciones, sigue los desbloqueos y haz avanzar el buen trabajo.",
  "dashboard.createGrant": "Crear subvención",
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
  "dashboard.empty.createGrant": "Crear una subvención",
  "orgs.notConfigured.title":
    "El contexto de espacio de trabajo no está configurado",
  "orgs.notConfigured.body":
    "Las subvenciones onchain directas siguen disponibles. Configura las variables de auth y Supabase del servidor para habilitar las organizaciones.",
  "orgs.signIn.title": "Inicia sesión para gestionar organizaciones",
  "orgs.signIn.body":
    "El contexto de organización es independiente de la conexión de la wallet y necesita una firma explícita.",
  "orgs.loading.title": "Cargando tus organizaciones",
  "orgs.loading.body": "Leyendo las membresías del espacio de trabajo…",
  "orgs.error.title": "No se pudieron cargar las organizaciones",
  "orgs.eyebrow": "Tus espacios de trabajo",
  "orgs.heading": "Las organizaciones aportan contexto.",
  "orgs.create": "+ Crear organización",
  "orgs.empty.title": "Crea tu primera organización",
  "orgs.empty.body":
    "Monta un espacio de trabajo para tu equipo, tu ecosistema o tu tesorería. Te conviertes en propietario automáticamente.",
  "orgs.empty.action": "Montar espacio de trabajo",
  "orgs.counts": "{members} miembros · {grants} subvenciones",
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
    "Lineal desde el inicio. El cliff retrasa el reclamo sin reiniciar la curva.",
  "detail.schedule.vestedByTime": "{amount} liberado por tiempo",
  "detail.schedule.progressLabel": "Liberado por tiempo",
  "detail.schedule.start": "Inicio",
  "detail.schedule.cliffReached": "Cliff alcanzado",
  "detail.schedule.fullyVested": "Totalmente liberado",
  "detail.hybrid.formula":
    "Híbrida = min(liberado por tiempo, hitos aprobados)",
  "detail.hybrid.timeVested": "Liberado por tiempo: {amount}",
  "detail.hybrid.milestonesApproved": "Hitos aprobados: {amount}",
  "detail.hybrid.unlocked": "Desbloqueado: {amount}",
  "detail.milestones.title": "Hitos",
  "detail.milestones.summary": "{approved} de {total} aprobados · {amount}",
  "detail.milestone.approved": "Aprobado",
  "detail.milestone.pending": "Pendiente",
  "detail.milestone.approveAction": "Aprobar hito",
  "detail.terms.title": "Términos de la subvención",
  "detail.terms.fixed":
    "Los términos y la asignación son fijos. Esta subvención no se puede revocar.",
  "detail.claim.title": "Listo para reclamar",
  "detail.claim.pending": "Transacción en curso…",
  "detail.claim.action": "Reclamar {amount}",
  "detail.claim.beneficiaryBalance": "Saldo de tokens del beneficiario",
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
  "wizard.step.0": "Subvención",
  "wizard.step.1": "Estrategia",
  "wizard.step.2": "Condiciones",
  "wizard.step.3": "Revisión",
  "wizard.stepTitle.0": "¿Para quién es esta subvención?",
  "wizard.stepTitle.1": "Elige cómo se desbloquean los tokens",
  "wizard.stepTitle.2": "Define las condiciones",
  "wizard.stepTitle.3": "Revisa antes de financiar",
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
    "El vesting es lineal desde el inicio. Al llegar al cliff, la parte transcurrida queda disponible.",
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
