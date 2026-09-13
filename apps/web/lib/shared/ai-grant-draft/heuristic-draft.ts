/**
 * The offline drafter (HAS-16).
 *
 * HAS-16 requires that an unavailable provider still produces a usable
 * result, and that the provider is never required for the baseline demo. This
 * is that result: a deterministic, rule-based reading of the request that
 * picks the closest catalog preset and adjusts its numbers. It runs when no
 * provider is configured, when the provider fails, and in every test — which
 * is why it is pure and takes its presets as an argument.
 *
 * It also carries the localization for free. The copy comes from the already
 * localized catalog, so an offline draft speaks English, 简体中文 and Español
 * without this module holding a single string of product prose.
 */

import type {
  GrantPreset,
  GrantPresetMilestone,
} from "../grant-presets/presets";
import {
  normalizeAiDraft,
  type AiAdjustment,
  type NormalizedAiDraft,
} from "./normalize";
import { scanRequest } from "./request-scan";
import {
  AI_MAX_MILESTONES,
  type AiGrantDraft,
  type AiScheduleUnit,
} from "./schema";

/** Number words the wizard's own demo scripts use, in the three product locales. */
const NUMBER_WORDS = new Map<string, number>([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["twelve", 12],
  ["uno", 1],
  ["una", 1],
  ["dos", 2],
  ["tres", 3],
  ["cuatro", 4],
  ["cinco", 5],
  ["seis", 6],
  ["siete", 7],
  ["ocho", 8],
  ["nueve", 9],
  ["diez", 10],
  ["doce", 12],
  ["一", 1],
  ["两", 2],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10],
]);

const NUMBER_WORD_SOURCE = [...NUMBER_WORDS.keys()].join("|");

/**
 * Time words mapped to the wizard's schedule choice.
 *
 * The wizard offers minutes, hours and days, so weeks, months and years are
 * converted into days rather than substituted: "two months" is 60 days, not
 * two of anything else.
 *
 * The hand-written presets compress a year into a demo minute, and say so in
 * their own `realWorldNote`. A draft does not inherit that trade. A preset is
 * a demo script the reader chose knowing what it is; a duration the reader
 * typed is a statement of intent, and answering "two months" with "2 minutes"
 * changes what they asked for.
 */
const TIME_WORDS: {
  pattern: RegExp;
  unit: AiScheduleUnit;
  /** Multiplier onto `unit`, so a week is seven days. */
  scale: number;
  /** Whether the reader's own word had to be converted to reach `unit`. */
  converted: boolean;
}[] = [
  {
    pattern: /^(minutes?|mins?|minutos?|分钟)$/i,
    unit: "60",
    scale: 1,
    converted: false,
  },
  {
    pattern: /^(hours?|hrs?|horas?|小时)$/i,
    unit: "3600",
    scale: 1,
    converted: false,
  },
  {
    pattern: /^(days?|d[ií]as?|天)$/i,
    unit: "86400",
    scale: 1,
    converted: false,
  },
  {
    pattern: /^(weeks?|semanas?|周)$/i,
    unit: "86400",
    scale: 7,
    converted: true,
  },
  {
    pattern: /^(months?|mes|meses|个月|月)$/i,
    unit: "86400",
    scale: 30,
    converted: true,
  },
  {
    pattern: /^(years?|a[ñn]os?|年)$/i,
    unit: "86400",
    scale: 365,
    converted: true,
  },
];

const TIME_UNIT_SOURCE =
  "minutes?|mins?|minutos?|分钟|hours?|hrs?|horas?|días?|dias?|days?|天|weeks?|semanas?|周|months?|meses|mes|个月|月|years?|años?|anos?|年";

const DURATION_PATTERN = new RegExp(
  `(\\d+|${NUMBER_WORD_SOURCE})\\s*[-\\s]?\\s*(${TIME_UNIT_SOURCE})`,
  "gi",
);

const CLIFF_WORDS = /(cliff|acantilado|carencia|锁定期|悬崖)/i;
const MILESTONE_WORDS =
  /(milestones?|deliverables?|hitos?|entregables?|里程碑|交付)/i;
const MILESTONE_COUNT_PATTERN = new RegExp(
  `(\\d+|${NUMBER_WORD_SOURCE})\\s*(milestones?|hitos?|里程碑)`,
  "i",
);
const AMOUNT_PATTERN =
  /(\d[\d.,]*)\s*(tokens?|hvusd|hv-usd|fichas?|代币|个代币)/i;
const ANY_NUMBER_PATTERN = /\d[\d.,]*/g;

/** Keyword weights per catalog key. Keys are technical and never localized. */
const PRESET_KEYWORDS: Record<string, RegExp[]> = {
  "builder-grant": [
    /\b(builder|hackathon|bounty|contributor|open[- ]?source|scope[d]?|deliverable)/i,
    /\b(constructor|contribuyente|c[oó]digo abierto|entregable)/i,
    /(黑客松|构建者|贡献者|开源)/,
  ],
  "employee-vesting": [
    /\b(employee|staff|hire|salary|full[- ]?time|team member|payroll)/i,
    /\b(empleado|personal|contrataci[oó]n|salario|tiempo completo|n[oó]mina)/i,
    /(员工|全职|薪资|团队成员)/,
  ],
  "advisor-vesting": [
    /\b(advisor|adviser|mentor|consultant|part[- ]?time)/i,
    /\b(asesor|consultor|mentor|medio tiempo)/i,
    /(顾问|导师|兼职)/,
  ],
  "ecosystem-grant": [
    /\b(ecosystem|partner|partnership|integration|long[- ]?term|hybrid)/i,
    /\b(ecosistema|socio|alianza|integraci[oó]n|largo plazo|h[ií]brido)/i,
    /(生态|合作伙伴|集成|长期|混合)/,
  ],
};

function toNumber(token: string): number | undefined {
  const word = NUMBER_WORDS.get(token.toLowerCase());
  if (word !== undefined) return word;
  const digits = normalizeDigits(token);
  return digits === undefined ? undefined : Math.trunc(digits);
}

/**
 * Reads a written amount.
 *
 * Group separators are only removed when they are unambiguous: "20,000" and
 * "20.000" are thousands, "1.5" is a fraction. An ambiguous value is left as
 * written so the wizard's own `parseAllocation` is the one to complain.
 */
function normalizeDigits(token: string): number | undefined {
  let text = token.trim();
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, "");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  else if (/^\d+,\d+$/.test(text)) text = text.replace(",", ".");
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

type ScheduleMatch = {
  unit: AiScheduleUnit;
  amount: number;
  converted: boolean;
  index: number;
  source: string;
};

function findSchedules(prompt: string): ScheduleMatch[] {
  const matches: ScheduleMatch[] = [];
  for (const match of prompt.matchAll(DURATION_PATTERN)) {
    const amount = toNumber(match[1]);
    const word = TIME_WORDS.find((entry) => entry.pattern.test(match[2]));
    if (amount === undefined || amount <= 0 || !word) continue;
    matches.push({
      unit: word.unit,
      amount: amount * word.scale,
      converted: word.converted,
      index: match.index ?? 0,
      source: match[0].trim(),
    });
  }
  return matches;
}

/** A cliff is the duration phrase written closest to the word "cliff". */
function pickCliff(
  prompt: string,
  schedules: ScheduleMatch[],
): ScheduleMatch | undefined {
  const marker = prompt.search(CLIFF_WORDS);
  if (marker < 0) return undefined;
  return schedules
    .filter((schedule) => Math.abs(schedule.index - marker) <= 40)
    .sort(
      (left, right) =>
        Math.abs(left.index - marker) - Math.abs(right.index - marker),
    )[0];
}

function findAllocation(
  prompt: string,
  schedules: ScheduleMatch[],
): string | undefined {
  const explicit = AMOUNT_PATTERN.exec(prompt);
  if (explicit) {
    const amount = normalizeDigits(explicit[1]);
    if (amount !== undefined && amount > 0) return String(amount);
  }

  // Otherwise the largest number that is not part of a duration phrase.
  const used = new Set(schedules.map((schedule) => schedule.source));
  let best: number | undefined;
  for (const match of prompt.matchAll(ANY_NUMBER_PATTERN)) {
    if ([...used].some((source) => source.includes(match[0]))) continue;
    const amount = normalizeDigits(match[0]);
    if (amount === undefined || amount <= 0) continue;
    if (best === undefined || amount > best) best = amount;
  }
  return best === undefined ? undefined : String(best);
}

function scorePreset(prompt: string, preset: GrantPreset): number {
  const patterns = PRESET_KEYWORDS[preset.key] ?? [];
  return patterns.reduce(
    (score, pattern) => score + (pattern.test(prompt) ? 1 : 0),
    0,
  );
}

/**
 * The closest preset.
 *
 * When the request settled the strategy, a preset that already uses it wins:
 * its copy and its split will not have to be rewritten. When the request said
 * nothing about a schedule or deliverables, only the keywords decide — biasing
 * an ambiguous request towards one strategy would silently answer a question
 * the user never asked.
 */
function pickBasePreset(
  prompt: string,
  presets: readonly GrantPreset[],
  strategy: 0 | 1 | 2 | undefined,
): GrantPreset {
  const ranked = [...presets].sort((left, right) => {
    if (strategy !== undefined) {
      const byStrategy =
        Number(right.strategy === strategy) -
        Number(left.strategy === strategy);
      if (byStrategy !== 0) return byStrategy;
    }
    return scorePreset(prompt, right) - scorePreset(prompt, left);
  });
  return ranked[0] ?? presets[0];
}

function evenMilestones(
  count: number,
  base: GrantPreset,
): GrantPresetMilestone[] {
  const share = Math.floor(100 / count);
  return Array.from({ length: count }, (_, index) => ({
    title:
      base.milestones?.[index]?.title ?? `${base.titleSuggestion} ${index + 1}`,
    // normalizeAiDraft rescales to exactly 100; an even split is only a seed.
    percentOfAllocation: share || 1,
  }));
}

/**
 * Drafts a grant template from the request without calling a provider.
 *
 * `presets` must be the *localized* catalog, because its copy becomes the
 * draft's copy. Deterministic: the same prompt and catalog always produce the
 * same draft.
 */
export function heuristicDraft(
  prompt: string,
  presets: readonly GrantPreset[],
): NormalizedAiDraft {
  const schedules = findSchedules(prompt);
  const cliff = pickCliff(prompt, schedules);
  const duration =
    schedules.find((schedule) => schedule !== cliff) ?? schedules[0];

  const countMatch = MILESTONE_COUNT_PATTERN.exec(prompt);
  const milestoneCount = countMatch ? toNumber(countMatch[1]) : undefined;
  const wantsMilestones =
    MILESTONE_WORDS.test(prompt) || milestoneCount !== undefined;
  const wantsSchedule = duration !== undefined;

  // A request that names both a schedule and deliverables is asking for the
  // hybrid semantics; one that names neither leaves the choice to the closest
  // preset rather than inventing one.
  const requested: 0 | 1 | 2 | undefined =
    wantsSchedule && wantsMilestones
      ? 2
      : wantsMilestones
        ? 1
        : wantsSchedule
          ? 0
          : undefined;
  const base = pickBasePreset(prompt, presets, requested);
  const resolvedStrategy: 0 | 1 | 2 = requested ?? base.strategy;

  const requestedAllocation = findAllocation(prompt, schedules);
  const unit = duration?.unit ?? base.timing?.unit ?? "60";
  const draft: AiGrantDraft = {
    strategy: resolvedStrategy,
    title: base.titleSuggestion,
    description: base.descriptionSuggestion ?? base.description,
    allocation: requestedAllocation ?? base.allocationSuggestion,
    timing:
      resolvedStrategy === 1
        ? null
        : {
            unit,
            // A cliff written in another unit is rescaled by the wizard's own
            // vocabulary, not converted: mixing units in one schedule is not
            // something the form can express.
            cliff: String(
              cliff?.unit === unit ? cliff.amount : (base.timing?.cliff ?? 0),
            ),
            duration: String(duration?.amount ?? base.timing?.duration ?? 5),
            // The preset's note explains *its* compressed schedule. Once the
            // request supplies a duration, that note describes something else.
            realWorldNote: duration ? "" : (base.timing?.realWorldNote ?? ""),
          },
    milestones:
      resolvedStrategy === 0
        ? null
        : milestoneCount !== undefined && milestoneCount > 0
          ? evenMilestones(Math.min(milestoneCount, AI_MAX_MILESTONES), base)
          : (base.milestones ?? [
              { title: base.titleSuggestion, percentOfAllocation: 100 },
            ]),
    assumptions: [...base.assumptions],
    unsupported: [],
  };

  const normalized = normalizeAiDraft({
    draft,
    droppedFields: [],
    redactions: [],
  });

  const adjustments: AiAdjustment[] = [{ code: "offlineDraft" }];
  if (duration?.converted)
    adjustments.push({
      code: "scheduleConverted",
      values: { requested: duration.source, duration: duration.amount },
    });
  if (requestedAllocation === undefined)
    adjustments.push({
      code: "allocationAssumed",
      values: { allocation: normalized.preset.allocationSuggestion },
    });
  adjustments.push(...normalized.adjustments);
  for (const code of scanRequest(prompt)) adjustments.push({ code });

  return { ...normalized, adjustments };
}
