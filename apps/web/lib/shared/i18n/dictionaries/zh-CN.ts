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
  "home.note": "已在 {network} 上线 · ERC20 代币 · 不可撤销",

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

  // 资助向导（/grants/new）。代币符号、小数位、链 ID、地址和 isEligible(address) 签名均为字面量，通过参数传入。
  "wizard.eyebrow": "新的分配",
  "wizard.title.create": "创建资助。",
  "wizard.title.created": "你的资助已上线。",
  "wizard.lede.create":
    "只需设定一次条款，注入全额分配，剩下的交给条件自动执行。",
  "wizard.lede.created": "全额代币分配已存入 {network} 上它自己的金库。",
  "wizard.notice.organization.title": "正在为 {organization} 创建",
  "wizard.notice.organization.body":
    "链上的标题、分配额度、参与方和权限都保存在 GrantVault 中。可选的描述会在交易确认后作为工作区元数据保存。",
  "wizard.notice.noDeployment.title": "尚未配置测试网部署",
  "wizard.notice.noDeployment.body":
    "在 HashVest 合约完成部署并同步之后，才能创建资助。",
  "wizard.sync.pending.title": "正在保存工作区元数据",
  "wizard.sync.pending.body": "HSK 交易已确认。正在将此资助关联到工作区…",
  "wizard.sync.saved": "工作区元数据已保存。该资助现在可在此组织中看到。",
  "wizard.sync.failed.title": "资助已在链上成功创建",
  "wizard.sync.failed.body":
    "工作区元数据保存失败。GrantVault 及其资金仍然有效；请重试工作区同步，不要重新创建资助。",
  "wizard.sync.retrying": "正在重试同步…",
  "wizard.sync.retry": "重试工作区同步",
  "wizard.openGrant": "打开资助",
  "wizard.confirmed.before": "交易已确认。你可以在",
  "wizard.confirmed.link": "已发行看板",
  "wizard.confirmed.after": "中找到新的资助。",
  "wizard.progress": "创建进度",
  "wizard.step.0": "资助",
  "wizard.step.1": "策略",
  "wizard.step.2": "条件",
  "wizard.step.3": "复核",
  "wizard.stepTitle.0": "这份资助是给谁的？",
  "wizard.stepTitle.1": "选择代币的解锁方式",
  "wizard.stepTitle.2": "设置条件",
  "wizard.stepTitle.3": "注资前复核",
  "wizard.field.title.label": "资助标题",
  "wizard.field.title.hint": "例如：生态建设者资助，或贡献者分配。",
  "wizard.field.title.placeholder": "生态建设者资助",
  "wizard.field.beneficiary.label": "受益人",
  "wizard.field.beneficiary.hint":
    "所选成员的确切钱包将成为链上受益人。只有该钱包可以领取。",
  "wizard.field.beneficiaryWallet.label": "受益人钱包",
  "wizard.field.beneficiaryWallet.hint":
    "只有此地址可以领取已解锁的代币。请仔细核对。",
  "wizard.members.unavailable":
    "成员目录当前不可用。在工作区元数据恢复期间，你仍然可以使用外部钱包。",
  "wizard.field.description.label": "工作区描述",
  "wizard.field.description.hint": "可选的产品背景说明。它不会取代链上标题。",
  "wizard.field.description.placeholder": "支持 HSK 开发者生态。",
  "wizard.field.token.label": "ERC20 代币地址",
  "wizard.field.token.hint":
    "请使用 {network} 上的标准 ERC20。不支持原生 HSK 和转账收费类代币。",
  "wizard.token.useDemo": "使用演示用 {symbol}",
  "wizard.token.reading": "正在 {network} 上读取代币元数据…",
  "wizard.token.error": "无法读取此代币。请确认地址和网络。",
  "wizard.token.decimals": "{symbol} · {decimals} 位小数",
  "wizard.field.allocation.label": "分配总额",
  "wizard.field.allocation.hint":
    "请输入代币单位，而非最小单位。全额将被转入金库。",
  "wizard.schedule.title": "归属计划",
  "wizard.schedule.lede":
    "归属自起始时间线性进行。到达悬崖期时，已过去的部分即可使用。",
  "wizard.schedule.demoTip": "演示建议：将时长设为 5 分钟，悬崖期设为 0 分钟。",
  "wizard.field.start.label": "起始日期（可选）",
  "wizard.field.start.hint":
    "使用你的本地时区。留空则以创建交易的时间戳为起点。若起点在过去，已过去的部分会立即释放。",
  "wizard.field.unit.label": "时间单位",
  "wizard.unit.minutes": "分钟",
  "wizard.unit.hours": "小时",
  "wizard.unit.days": "天",
  "wizard.field.cliff.label": "悬崖期",
  "wizard.field.duration.label": "总时长",
  "wizard.field.reviewer.label": "审核人",
  "wizard.field.reviewer.hint":
    "所选成员的确切钱包将成为链上审核人，用于批准里程碑。",
  "wizard.field.reviewerWallet.label": "审核人钱包",
  "wizard.field.reviewerWallet.hint":
    "此钱包可以批准里程碑。金额和条款均不可修改。",
  "wizard.milestones.title": "里程碑",
  "wizard.milestones.lede":
    "各项金额必须正好合计为 {amount} {symbol}。最多 {max} 个里程碑。",
  "wizard.milestones.theAllocation": "分配总额",
  "wizard.milestones.add": "添加里程碑 +",
  "wizard.milestone.index": "里程碑 {index}",
  "wizard.milestone.remove": "移除",
  "wizard.field.milestoneTitle.label": "标题",
  "wizard.field.milestoneTitle.placeholder": "交付可运行的原型",
  "wizard.field.milestoneAmount.label": "金额（{symbol}）",
  "wizard.field.milestoneAmount.fallbackSymbol": "代币",
  "wizard.advanced.summary": "高级 · 可选的资格校验合约",
  "wizard.field.eligibility.label": "资格校验合约地址",
  "wizard.field.eligibility.hint":
    "留空则不做资格校验。该合约必须实现 isEligible(address)。此演示适配器不是 KYC 或合规方案。",
  "wizard.field.eligibility.placeholder": "无",
  "wizard.review.fromPreset":
    "以「{preset}」预设为起点。那只是工作区元数据 — 下面的条款才是上链的内容。",
  "wizard.review.issuer": "发起方",
  "wizard.review.beneficiary": "受益人",
  "wizard.review.token": "代币",
  "wizard.review.reviewer": "审核人",
  "wizard.review.start": "起始",
  "wizard.review.startCreation": "创建时间戳",
  "wizard.review.cliffDuration": "悬崖期 / 总时长",
  "wizard.review.eligibility": "资格校验合约",
  "wizard.review.eligibilityNone": "无 — 未启用",
  "wizard.review.permanent.title": "这些条款是永久的",
  "wizard.review.permanent.body":
    "不支持撤销、发起方提取，也不能修改资助的经济参数。如有需要，你将先授权代币支出，然后在一笔交易中创建并全额注资金库。",
  "wizard.nav.back": "上一步",
  "wizard.nav.continue": "继续",
  "wizard.nav.pending": "交易进行中…",
  "wizard.nav.submit": "授权并创建资助",
  "wizard.walletChanged": "钱包已更换。请返回并使用当前的发起方钱包重新复核。",
  "wizard.tx.resetAllowance": "重置代币授权额度",
  "wizard.tx.approve": "授权代币支出",
  "wizard.tx.create": "创建并注资",
  "wizard.error.title": "请为你的资助填写标题。",
  "wizard.error.beneficiaryMember": "请选择一位受益人成员，或使用外部钱包。",
  "wizard.error.beneficiaryAddress": "请输入有效且非零的受益人地址。",
  "wizard.error.token": "请输入有效的 ERC20 合约地址。不支持原生 HSK。",
  "wizard.error.tokenMetadata":
    "请等待 ERC20 的符号和小数位加载完成。并确认该代币已部署在 {network} 上。",
  "wizard.error.issuerWallet": "请在复核前连接发起方钱包。",
  "wizard.error.duration": "时长必须是正整数。",
  "wizard.error.cliff": "悬崖期必须是非负整数。",
  "wizard.error.cliffTooLong": "悬崖期不能长于总时长。",
  "wizard.error.durationTooLarge": "时长过长。",
  "wizard.error.startDate": "请输入有效的起始日期。",
  "wizard.error.eligibility": "请输入有效的资格校验合约地址，或将其留空。",
  "wizard.error.reviewerMember": "请选择一位审核人成员，或使用外部钱包。",
  "wizard.error.reviewerRequired": "里程碑型和混合型资助需要一个审核人地址。",
  "wizard.error.milestoneCount": "请添加 1 到 {max} 个里程碑。",
  "wizard.error.milestoneSum": "各里程碑金额之和必须正好等于分配总额。",
  "wizard.error.reviewFirst": "请先复核资助并检查测试网部署，然后再继续。",
  "wizard.error.eligibilityNoCode":
    "该资格校验合约在 {network} 上没有合约代码。",
  "wizard.error.reviewAgain": "请重新复核资助，然后再同步工作区元数据。",
  "wizard.error.walletChangedSync":
    "钱包已更换。请使用发起方钱包重新登录，然后再同步工作区元数据。",

  // 资助策略。索引与 lib/protocol/grants.ts 对应：0=TIME，1=MILESTONE，2=HYBRID。
  "strategy.0.name": "时间归属",
  "strategy.1.name": "里程碑资助",
  "strategy.2.name": "混合",
  "strategy.0.description":
    "随时间线性解锁。悬崖期会延迟解锁，但不会重启计划。",
  "strategy.1.description": "在审核人批准每个里程碑时解锁固定额度。",
  "strategy.2.description":
    "解锁按时间归属与已批准里程碑两者中较小的数量。两个条件同时生效。",

  // 资助向导中的预设选择器。
  "wizard.preset.title": "从预设开始",
  "wizard.preset.lede":
    "可选。预设会填入一套策略、时间计划和里程碑拆分，你可以随时编辑或清除。它不会改变金库中存储的内容。",
  "wizard.preset.custom.name": "自定义 / 空白",
  "wizard.preset.custom.tagline": "所有数值都由你自己配置，和以前完全一样。",
  "wizard.preset.custom.meta": "清除预设填入的字段",
  "wizard.preset.needsReviewer": "需要审核人",

  // 资助预设（HAS-8）。百分比、额度、时间单位和策略索引属于数据而非文案，不做翻译。
  "preset.builder-grant.name": "建设者资助",
  "preset.builder-grant.tagline": "每一笔付款都是审核人的一次签名。",
  "preset.builder-grant.description":
    "面向外部贡献者或黑客松开发者的里程碑资助。只有在审核人批准每项交付物后资金才会解锁，没有签核就不会有任何流动。",
  "preset.builder-grant.bestFor.0": "开源贡献者",
  "preset.builder-grant.bestFor.1": "黑客松开发者",
  "preset.builder-grant.bestFor.2": "范围固定的交付物",
  "preset.builder-grant.titleSuggestion": "建设者资助",
  "preset.builder-grant.descriptionSuggestion":
    "面向限定范围开发的里程碑资助。",
  "preset.builder-grant.milestone.0.title": "启动与设计",
  "preset.builder-grant.milestone.1.title": "核心实现",
  "preset.builder-grant.milestone.2.title": "发布与交接",
  "preset.builder-grant.assumption.0":
    "策略：里程碑资助 — 在里程碑获批前不会解锁任何代币。",
  "preset.builder-grant.assumption.1":
    "三个里程碑（20% / 50% / 30%）只是初始拆分；可自由重命名、调整比例、增加或删除。",
  "preset.builder-grant.assumption.2":
    "需要一个审核人钱包来批准里程碑；请在注资前选定。",

  "preset.employee-vesting.name": "员工归属",
  "preset.employee-vesting.tagline": "带悬崖期的经典线性归属。",
  "preset.employee-vesting.description":
    "面向团队成员的时间归属：悬崖期之前无法领取，之后代币线性解锁直至计划结束。不涉及审核人或里程碑。",
  "preset.employee-vesting.bestFor.0": "核心团队成员",
  "preset.employee-vesting.bestFor.1": "全职贡献者",
  "preset.employee-vesting.titleSuggestion": "员工归属",
  "preset.employee-vesting.descriptionSuggestion": "标准的员工代币归属。",
  "preset.employee-vesting.timing.realWorldNote":
    "1 分钟悬崖期和 4 分钟归属期，代表 4 年计划中的 1 年悬崖期 — 演示中一分钟代表一年。实际使用时请将单位切换为「天」。",
  "preset.employee-vesting.assumption.0":
    "策略：时间归属 — 自起始时间戳线性解锁，并受悬崖期限制。",
  "preset.employee-vesting.assumption.1":
    "计划被压缩为一年一分钟，因此可以在演示中完整看到从悬崖期到领取的全过程。",
  "preset.employee-vesting.assumption.2":
    "时间归属不使用审核人；TIME 类型的资助从不带审核人语义。",

  "preset.advisor-vesting.name": "顾问归属",
  "preset.advisor-vesting.tagline": "更短的线性归属，无需悬崖期。",
  "preset.advisor-vesting.description":
    "面向顾问或兼职贡献者的时间归属：比员工归属更短的计划，通常没有悬崖期。",
  "preset.advisor-vesting.bestFor.0": "顾问",
  "preset.advisor-vesting.bestFor.1": "兼职贡献者",
  "preset.advisor-vesting.titleSuggestion": "顾问归属",
  "preset.advisor-vesting.descriptionSuggestion": "顾问代币归属。",
  "preset.advisor-vesting.timing.realWorldNote":
    "3 分钟归属期代表一份为期 3 年、没有悬崖期的顾问计划 — 演示中一分钟代表一年。实际使用时请将单位切换为「天」。",
  "preset.advisor-vesting.assumption.0":
    "策略：时间归属 — 自起始时间戳线性解锁，默认没有悬崖期限制。",
  "preset.advisor-vesting.assumption.1":
    "没有悬崖期时，几乎可以立即领取少量代币 — 适合在台上演示一次领取。",
  "preset.advisor-vesting.assumption.2":
    "时间归属不使用审核人；TIME 类型的资助从不带审核人语义。",

  "preset.ecosystem-grant.name": "生态资助",
  "preset.ecosystem-grant.tagline": "按时间解锁，并再次受里程碑签核限制。",
  "preset.ecosystem-grant.description":
    "面向较大的生态合作伙伴：代币既要随时间归属，每个里程碑也需经审核人批准。两个条件同时生效，因此停滞的审核人或走得再快的时钟都无法单独释放资金。",
  "preset.ecosystem-grant.bestFor.0": "生态合作伙伴",
  "preset.ecosystem-grant.bestFor.1": "长期集成",
  "preset.ecosystem-grant.titleSuggestion": "生态资助",
  "preset.ecosystem-grant.descriptionSuggestion":
    "同时受时间与里程碑限制的混合型生态资助。",
  "preset.ecosystem-grant.timing.realWorldNote":
    "1 分钟悬崖期和 6 分钟归属期，代表一段为期六年的合作 — 演示中一分钟代表一年。实际使用时请将单位切换为「天」。",
  "preset.ecosystem-grant.milestone.0.title": "接入与集成",
  "preset.ecosystem-grant.milestone.1.title": "持续贡献",
  "preset.ecosystem-grant.assumption.0":
    "策略：混合 — 可领取的是按时间归属与已批准里程碑两者中较小的数量。两个条件同时生效。",
  "preset.ecosystem-grant.assumption.1":
    "在悬崖期之前批准里程碑不会释放任何代币：时间这一条仍然限制着它。这正是混合型资助的意义所在。",
  "preset.ecosystem-grant.assumption.2":
    "两个里程碑（40% / 60%）只是初始拆分；可自由重命名、调整比例、增加或删除。",
  "preset.ecosystem-grant.assumption.3":
    "需要一个审核人钱包来批准里程碑；请在注资前选定。",

  "meta.title": "HashVest — 可编程资助",
  "meta.description":
    "在 HashKey Chain 上以时间、里程碑和混合方式解锁的全额注资代币资助。",
};
