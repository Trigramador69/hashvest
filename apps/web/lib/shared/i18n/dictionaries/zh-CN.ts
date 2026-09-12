import type { TranslationDictionary } from "./en";

/**
 * Simplified Chinese. Typed as a subset of English: any key omitted here falls
 * back to English at runtime, and any key that no longer exists in English
 * fails typecheck.
 *
 * Brand ("HashVest", "HashKey Chain"), token symbols, chain ids and the
 * `min(...)` formula stay untranslated — they are technical literals.
 */
export const zhCN: TranslationDictionary = {
  "shell.home": "HashVest 首页",
  "shell.nav.label": "主导航",
  "shell.nav.organizations": "组织 / 资助",
  "shell.nav.createGrant": "创建资助",
  "shell.workspace.label": "工作区",
  "shell.workspace.choose": "选择工作区",
  "shell.workspace.yours": "您的组织",
  "shell.workspace.create": "+ 创建组织",
  "shell.footer.tagline": "HashKey Chain 上的可编程资助",
  "shell.footer.disclaimer": "黑客松 MVP · 未经审计 · 仅限测试网资产",

  "locale.label": "语言",
  "locale.choose": "选择语言",

  "session.enabled": "工作区访问已启用",
  "session.signOut": "退出工作区",
  "session.signingOut": "正在退出…",
  "session.signIn": "登录工作区",
  "session.signingIn": "正在登录…",
  "session.required": "钱包已连接，需要登录工作区。",
  "session.walletChanged": "钱包已更换，请重新登录以继续。",
  "session.switchNetwork": "请先切换到 {network}。",
  "session.switchNetworkChain": "请先将钱包切换到 {network}（链 {chainId}）。",
  "session.notConfigured": "此服务器尚未配置工作区认证。",

  "wallet.notConnected": "未连接",
  "wallet.label": "钱包",
  "wallet.selectedChain": "已选网络",
  "wallet.unknownChain": "链 {chainId}",

  "home.eyebrow": "可编程资助 · HashKey Chain",
  "home.headline.line1": "为工作提供资金。",
  "home.headline.line2": "定义解锁方式。",
  "home.lede":
    "HashVest 将代币分配转化为全额注资的资助，按时间、里程碑或两者共同解锁。",
  "home.cta.openApp": "打开应用",
  "home.cta.createGrant": "创建资助",
  "home.note":
    "已在 {network} 上线 · ERC20 代币 · 可选发行方撤销 · 已获得价值受保护",

  "home.steps.title": "一次分配，条件清晰。",
  "home.steps.fund.title": "国库为金库注资",
  "home.steps.fund.body": "全额分配在创建时即存入。",
  "home.steps.unlock.title": "条件解锁代币",
  "home.steps.unlock.body": "固定的时间表、审核人批准，或两者兼具。",
  "home.steps.claim.title": "受益人领取",
  "home.steps.claim.body": "只有接收方可以提取已解锁的代币。",

  "home.strategies.title": "适用于各类贡献。",
  "home.strategies.audience": "生态建设者 · 团队 · 顾问 · 贡献者",
  "home.strategies.time.title": "时间归属",
  "home.strategies.time.subtitle": "奖励持续的投入。",
  "home.strategies.time.body":
    "代币自起始时间线性归属。可选的悬崖期会延迟解锁，但不会重置归属曲线。",
  "home.strategies.milestone.title": "里程碑资助",
  "home.strategies.milestone.subtitle": "为可衡量的进展提供资金。",
  "home.strategies.milestone.body":
    "由指定审核人批准固定的里程碑。每次批准都会解锁其对应的确切金额。",
  "home.strategies.hybrid.title": "混合资助",
  "home.strategies.hybrid.subtitle": "让时间与交付保持一致。",
  "home.strategies.hybrid.body":
    "已解锁 = min(按时间归属的数量, 已批准的里程碑金额)。两个条件共同约束每一次领取。",

  "meta.title": "HashVest — 可编程资助",
  "meta.description":
    "在 HashKey Chain 上以时间、里程碑和混合方式解锁的全额注资代币资助。",
};
