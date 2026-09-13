"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  zeroAddress,
  type Address,
} from "viem";
import {
  grantVaultAbi,
  hashVestFactoryAbi,
  hskTestnet,
  testnetDeployment,
} from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddressDisplay,
  NetworkNotice,
  Notice,
  PageHeading,
  TransactionStatus,
} from "@/components/grant-ui";
import { AiGrantBuilder } from "@/components/ai-grant-builder";
import { OrganizationTemplatePicker } from "@/components/organization-template-picker";
import { PresetOption } from "@/components/preset-option";
import { DemoFaucet } from "@/components/demo-faucet";
import { CohortCreator } from "@/components/cohort-creator";
import { MemberPicker } from "@/components/organization-ui";
import { ParticipantIdentity } from "@/components/grant-card";
import { useToken } from "@/hooks/use-grant";
import {
  useLinkOrganizationGrant,
  useOrganization,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import type { OrganizationTemplate } from "@/lib/cloud/organizations/types";
import { useSession } from "@/hooks/use-session";
import {
  assertTestnetWallet,
  getWalletGuardMessages,
  useTransaction,
} from "@/hooks/use-transaction";
import { readRevocationState } from "@/lib/protocol/revocation";
import {
  calculateVestedByTime,
  dateLabel,
  errorMessage,
  normalizeAddress,
  parseAllocation,
  percent,
  validParty,
} from "@/lib/protocol/grants";
import {
  GENERATED_PRESET_KEY,
  type AppliedPresetKey,
  type GrantPreset,
  type GrantPresetKey,
} from "@/lib/shared/grant-presets/presets";
import { organizationTemplatePreset } from "@/lib/shared/grant-presets/organization-template";
import { parseTemplateKey } from "@/lib/shared/grant-presets/template-key";
import {
  applyReviewerDefault,
  BLANK_PRESET_FIELDS,
  clearPreset,
  resyncMilestoneAmounts,
  selectPreset,
  type AppliedPreset,
} from "@/lib/shared/grant-presets/wizard-state";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";

/** Step ids; labels come from the dictionary. */
const steps = [0, 1, 2, 3, 4] as const;
/** Strategy ids, in the order the picker lists them. */
const STRATEGY_INDEXES = [0, 1, 2] as const;
/** Network name and chain id are protocol literals, never translated. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

/** Named so the step a block belongs to survives inserting another one. */
const STEP = {
  template: 0,
  grant: 1,
  strategy: 2,
  conditions: 3,
  review: 4,
} as const;
type MilestoneInput = { title: string; amount: string };
type GrantConfiguration = {
  title: string;
  token: Address;
  beneficiary: Address;
  reviewer: Address;
  totalAllocation: bigint;
  strategy: 0 | 1 | 2;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  eligibilityProvider: Address;
  initialUnlock: bigint;
  revocable: boolean;
};
type PreparedGrant = {
  config: GrantConfiguration;
  milestones: { title: string; amount: bigint }[];
  symbol: string;
  decimals: number;
  issuer: Address;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="block text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

/**
 * Optional starting points for the same wizard. A preset only fills fields the
 * user can still edit or clear; the vault stores what is submitted, and the
 * chosen key travels as workspace metadata only.
 */
function PresetPicker({
  selected,
  appliedPreset,
  onSelect,
}: {
  selected: AppliedPresetKey | null;
  /**
   * The applied preset when it has no catalog entry to look up: an AI draft
   * (HAS-18) or an organization template (HAS-13).
   */
  appliedPreset?: GrantPreset;
  onSelect: (key: GrantPresetKey | null) => void;
}) {
  const t = useTranslations();
  const { presets, findPreset } = useGrantPresets();
  const active = selected ? (findPreset(selected) ?? appliedPreset) : undefined;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">{t("wizard.preset.title")}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("wizard.preset.lede")}
        </p>
      </div>
      {selected === GENERATED_PRESET_KEY && appliedPreset && (
        <p className="flex flex-wrap items-baseline gap-x-2 rounded-control border border-[rgba(77,106,217,.3)] bg-[rgba(77,106,217,.08)] px-3 py-2 text-xs text-secondary">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#4d6ad9]">
            {t("ai.preset.applied")}
          </span>
          <span className="min-w-0 text-foreground">
            {appliedPreset.titleSuggestion}
          </span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => (
          <PresetOption
            key={preset.key}
            name={preset.name}
            tagline={preset.tagline}
            meta={[
              t(`strategy.${preset.strategy}.name`),
              preset.reviewerRequired && t("wizard.preset.needsReviewer"),
              preset.bestFor[0],
            ]
              .filter(Boolean)
              .join(" · ")}
            selected={selected === preset.key}
            onSelect={() => onSelect(preset.key as GrantPresetKey)}
          />
        ))}
        <PresetOption
          name={t("wizard.preset.custom.name")}
          tagline={t("wizard.preset.custom.tagline")}
          meta={t("wizard.preset.custom.meta")}
          selected={selected === null}
          onSelect={() => onSelect(null)}
        />
      </div>
      {active && (
        <div className="rounded-card border border-primary/20 bg-[rgba(87,217,139,.05)] p-5">
          {active.description && (
            <p className="text-sm leading-6">{active.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {active.bestFor.map((audience) => (
              <span
                key={audience}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <span className="size-1.5 rounded-full bg-current" />
                {audience}
              </span>
            ))}
          </div>
          {active.milestones && (
            <dl className="mt-4 space-y-1 border-t border-primary/20 pt-4 text-xs">
              {active.milestones.map((milestone) => (
                <div
                  className="flex justify-between gap-4"
                  key={milestone.title}
                >
                  <dt className="text-muted-foreground">{milestone.title}</dt>
                  <dd>
                    {t("wizard.preset.allocationShare", {
                      percent: milestone.percentOfAllocation,
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {active.timing?.realWorldNote && (
            <p className="mt-4 border-t border-primary/20 pt-4 text-xs leading-5 text-muted-foreground">
              {active.timing.realWorldNote}
            </p>
          )}
          {active.assumptions.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-primary/20 pt-4 text-xs leading-5 text-muted-foreground">
              {active.assumptions.map((assumption) => (
                <li key={assumption}>· {assumption}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export type NewGrantProps = {
  organizationId?: string;
};

export function NewGrant({ organizationId }: NewGrantProps) {
  const t = useTranslations();
  const walletMessages = getWalletGuardMessages(t);
  const { preset: localizedPreset } = useGrantPresets();
  /** Translated rejection messages for the pure parseAllocation helper. */
  const allocationErrors = (decimals: number) => ({
    format: t("wizard.error.amountFormat"),
    decimals: t("grants.error.decimals", { decimals }),
    range: t("wizard.error.amountRange"),
  });
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const { writeContractAsync } = useWriteContract();
  const tx = useTransaction();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const organizationMembers = useOrganizationMembers(organizationId);
  /**
   * The organization whose templates the Template step lists. Fixed in the
   * organization-aware wizard; chosen by the reader in the direct one.
   */
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const templateSource = organizationId ?? templateOrganizationId;
  const templateMembers = useOrganizationMembers(templateSource || undefined);
  const linkGrant = useLinkOrganizationGrant(organizationId ?? "direct");
  const [creationMode, setCreationMode] = useState<"single" | "cohort">(
    "single",
  );
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [beneficiaryMemberId, setBeneficiaryMemberId] = useState("");
  const [beneficiaryExternal, setBeneficiaryExternal] =
    useState(!organizationId);
  const [token, setToken] = useState<string>(testnetDeployment.demoToken ?? "");
  const [allocation, setAllocation] = useState("");
  const [strategy, setStrategy] = useState<0 | 1 | 2>(0);
  const [start, setStart] = useState("");
  const [cliff, setCliff] = useState("0");
  const [duration, setDuration] = useState("5");
  const [unit, setUnit] = useState("60");
  const [initialUnlock, setInitialUnlock] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [reviewerMemberId, setReviewerMemberId] = useState("");
  const [reviewerExternal, setReviewerExternal] = useState(!organizationId);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", amount: "" },
  ]);
  const [provider, setProvider] = useState("");
  const [revocable, setRevocable] = useState(false);
  const [applied, setApplied] = useState<AppliedPreset>();
  const [validationError, setValidationError] = useState("");
  const [prepared, setPrepared] = useState<PreparedGrant>();
  const [createdAddress, setCreatedAddress] = useState<Address>();
  const [creationConfirmed, setCreationConfirmed] = useState(false);
  const [metadataSync, setMetadataSync] = useState<
    "idle" | "pending" | "saved" | "failed"
  >("idle");
  const [metadataError, setMetadataError] = useState("");
  const tokenMetadata = useToken(normalizeAddress(token));
  const factory = testnetDeployment.factory;
  const canWrite = Boolean(
    address &&
    chainId === 133 &&
    factory &&
    (!organizationId ||
      (session.walletMatches && organization.data?.membership.isOwner)),
  );

  /**
   * The applied preset's name for the review step.
   *
   * A generated draft (HAS-18) carries an English placeholder name, because
   * its user-facing chrome is rendered from the `ai.*` dictionary rather than
   * from the preset itself.
   */
  const appliedKey = parseTemplateKey(applied?.key);
  /** The applied organization template, so the picker can mark it. */
  const appliedTemplateId =
    appliedKey?.kind === "organization" ? appliedKey.templateId : null;

  const appliedPresetName = !applied
    ? ""
    : applied.key === GENERATED_PRESET_KEY
      ? t("ai.draft.name")
      : applied.preset.name;

  /** The subset of form state a preset may write, in the shape the rules use. */
  function presetFields() {
    return {
      title,
      description,
      allocation,
      strategy,
      unit,
      cliff,
      duration,
      milestones,
      reviewerRequired: applied?.fields.reviewerRequired ?? false,
    };
  }

  /**
   * Applies a preset to the fields below, or returns to a blank form.
   *
   * Everything a preset writes stays editable, and anything the user typed
   * themselves survives both switching presets and choosing Custom / blank.
   * `wizard-state.ts` owns that distinction and is tested there.
   */
  function choosePreset(key: GrantPresetKey | null) {
    setValidationError("");
    if (!key) {
      writePresetFields(clearPreset(presetFields(), applied));
      setApplied(undefined);
      return;
    }
    const next = selectPreset(key, presetFields(), applied, {
      decimals: tokenMetadata.data?.decimals,
      applyDescription: Boolean(organizationId),
      preset: localizedPreset(key),
    });
    writePresetFields(next.fields);
    setApplied(next);
  }

  /**
   * Applies an AI draft (HAS-18) through the preset path above.
   *
   * The draft is a validated preset, so nothing here is new: the same
   * ownership rules decide which of the user's values survive, and the same
   * `validateGrant`/`prepare` still gate submission. Moving to the Grant step
   * is only what pressing Next would have done — it skips no validation,
   * because leaving the Template step never had any.
   */
  function applyAiDraft(preset: GrantPreset) {
    setValidationError("");
    const next = selectPreset(GENERATED_PRESET_KEY, presetFields(), applied, {
      decimals: tokenMetadata.data?.decimals,
      applyDescription: Boolean(organizationId),
      preset,
    });
    writePresetFields(next.fields);
    setApplied(next);
    if (step === STEP.template) setStep(STEP.grant);
  }

  /**
   * Applies an organization template (HAS-13) through the same preset path.
   *
   * Mapping the template to a preset re-validates it, so a stored template the
   * protocol could not accept is reported rather than filling the form. Its
   * reviewer default is a member reference and becomes a suggestion only here:
   * never a permission, never the beneficiary, and never over a choice the
   * user already made.
   */
  function chooseOrganizationTemplate(template: OrganizationTemplate) {
    setValidationError("");
    let preset;
    try {
      preset = organizationTemplatePreset(template);
    } catch {
      setValidationError(t("wizard.orgTemplates.invalid"));
      return;
    }
    const next = selectPreset(preset.key, presetFields(), applied, {
      decimals: tokenMetadata.data?.decimals,
      applyDescription: Boolean(organizationId),
      preset,
    });
    writePresetFields(next.fields);
    setApplied(next);
    const reviewerChoice = applyReviewerDefault({
      path: organizationId ? "organization" : "direct",
      strategy: next.fields.strategy,
      defaultReviewerMemberId: template.defaultReviewerMemberId,
      members: templateMembers.data,
      current: {
        memberId: reviewerMemberId,
        address: reviewer,
        external: reviewerExternal,
      },
    });
    setReviewerMemberId(reviewerChoice.memberId);
    setReviewer(reviewerChoice.address);
    setReviewerExternal(reviewerChoice.external);
  }

  function writePresetFields(fields: typeof BLANK_PRESET_FIELDS) {
    setTitle(fields.title);
    setDescription(fields.description);
    setAllocation(fields.allocation);
    setStrategy(fields.strategy);
    setUnit(fields.unit);
    setCliff(fields.cliff);
    setDuration(fields.duration);
    setMilestones(fields.milestones);
    if (fields.strategy === 1) setInitialUnlock("");
  }

  /**
   * Keeps an untouched preset milestone split in step with the allocation, so a
   * changed amount cannot silently break the exact-sum rule at review time.
   */
  function changeAllocation(value: string) {
    setAllocation(value);
    const resynced = resyncMilestoneAmounts(
      value,
      milestones,
      applied,
      tokenMetadata.data?.decimals,
    );
    if (!resynced) return;
    setMilestones(resynced.fields.milestones);
    setApplied(resynced);
  }

  function validateMemberSelection(
    memberId: string,
    selectedAddress: string,
    external: boolean,
    // The message arrives translated: "Choose a ${label}" only builds a
    // grammatical sentence in English.
    mismatchMessage: string,
  ) {
    if (!organizationId || external) return;
    const member = organizationMembers.data?.find(
      (item) => item.id === memberId,
    );
    if (
      !member ||
      member.walletAddress.toLowerCase() !== selectedAddress.toLowerCase()
    )
      throw new Error(mismatchMessage);
  }

  function validateGrant() {
    if (!title.trim()) throw new Error(t("wizard.error.title"));
    if (organizationId && !beneficiaryExternal && !beneficiaryMemberId)
      throw new Error(t("wizard.error.beneficiaryMember"));
    validateMemberSelection(
      beneficiaryMemberId,
      beneficiary,
      beneficiaryExternal,
      t("wizard.error.memberMismatch.beneficiary"),
    );
    if (!validParty(beneficiary))
      throw new Error(t("wizard.error.beneficiaryAddress"));
    if (!validParty(token)) throw new Error(t("wizard.error.token"));
    if (!tokenMetadata.data || tokenMetadata.isError)
      throw new Error(t("wizard.error.tokenMetadata", NETWORK));
    return parseAllocation(
      allocation,
      tokenMetadata.data.decimals,
      allocationErrors(tokenMetadata.data.decimals),
    );
  }

  function prepare(): PreparedGrant {
    const totalAllocation = validateGrant();
    if (!tokenMetadata.data || !address)
      throw new Error(t("wizard.error.issuerWallet"));
    let startTimestamp = 0n;
    let cliffSeconds = 0n;
    let durationSeconds = 0n;
    let initialUnlockAmount = 0n;
    if (strategy !== 1) {
      if (!/^\d+$/.test(duration) || BigInt(duration) === 0n)
        throw new Error(t("wizard.error.duration"));
      if (!/^\d+$/.test(cliff)) throw new Error(t("wizard.error.cliff"));
      durationSeconds = BigInt(duration) * BigInt(unit);
      cliffSeconds = BigInt(cliff) * BigInt(unit);
      if (cliffSeconds > durationSeconds)
        throw new Error(t("wizard.error.cliffTooLong"));
      if (durationSeconds > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error(t("wizard.error.durationTooLarge"));
      if (start) {
        const parsed = new Date(start).getTime();
        if (!Number.isFinite(parsed) || parsed < 0)
          throw new Error(t("wizard.error.startDate"));
        startTimestamp = BigInt(Math.floor(parsed / 1000));
      }
      if (initialUnlock.trim()) {
        initialUnlockAmount = parseAllocation(
          initialUnlock,
          tokenMetadata.data.decimals,
          allocationErrors(tokenMetadata.data.decimals),
        );
        if (initialUnlockAmount > totalAllocation)
          throw new Error(t("wizard.error.initialUnlockExceeds"));
      }
    } else {
      if (
        initialUnlock.trim() &&
        parseAllocation(
          initialUnlock,
          tokenMetadata.data.decimals,
          allocationErrors(tokenMetadata.data.decimals),
        ) > 0n
      ) {
        throw new Error(t("wizard.error.initialUnlockMilestone"));
      }
    }
    if (provider && !validParty(provider))
      throw new Error(t("wizard.error.eligibility"));
    const items =
      strategy === 0
        ? []
        : milestones.map((item, index) => {
            if (!item.title.trim())
              throw new Error(
                t("wizard.error.milestoneTitle", { index: index + 1 }),
              );
            return {
              title: item.title.trim(),
              amount: parseAllocation(
                item.amount,
                tokenMetadata.data.decimals,
                allocationErrors(tokenMetadata.data.decimals),
              ),
            };
          });
    if (strategy !== 0) {
      if (organizationId && !reviewerExternal && !reviewerMemberId)
        throw new Error(t("wizard.error.reviewerMember"));
      validateMemberSelection(
        reviewerMemberId,
        reviewer,
        reviewerExternal,
        t("wizard.error.memberMismatch.reviewer"),
      );
      if (!validParty(reviewer))
        throw new Error(t("wizard.error.reviewerRequired"));
      if (!items.length || items.length > 20)
        throw new Error(t("wizard.error.milestoneCount", { max: 20 }));
      if (strategy === 2 && initialUnlockAmount === totalAllocation) {
        throw new Error(t("wizard.error.hybridInitialUnlockFull"));
      }
      const expectedMilestoneSum =
        strategy === 2
          ? totalAllocation - initialUnlockAmount
          : totalAllocation;
      if (
        items.reduce((sum, item) => sum + item.amount, 0n) !==
        expectedMilestoneSum
      ) {
        throw new Error(
          strategy === 2 && initialUnlockAmount > 0n
            ? t("wizard.error.milestoneSumRemaining")
            : t("wizard.error.milestoneSum"),
        );
      }
    }
    return {
      config: {
        title: title.trim(),
        token: getAddress(token),
        beneficiary: getAddress(beneficiary),
        reviewer: strategy === 0 ? zeroAddress : getAddress(reviewer),
        totalAllocation,
        strategy,
        start: startTimestamp,
        cliff: cliffSeconds,
        duration: durationSeconds,
        eligibilityProvider: provider ? getAddress(provider) : zeroAddress,
        initialUnlock: initialUnlockAmount,
        revocable,
      },
      milestones: items,
      symbol: tokenMetadata.data.symbol,
      decimals: tokenMetadata.data.decimals,
      issuer: address,
    };
  }

  function next() {
    setValidationError("");
    try {
      if (step === STEP.grant) validateGrant();
      if (step === STEP.conditions) setPrepared(prepare());
      setStep((current) => Math.min(current + 1, STEP.review));
    } catch (error) {
      setValidationError(errorMessage(error));
    }
  }

  async function createGrant() {
    await tx.run(async () => {
      if (!prepared || !client || !factory)
        throw new Error(t("wizard.error.reviewFirst"));
      const account = assertTestnetWallet(prepared.issuer, walletMessages);
      const { config, milestones: items } = prepared;
      const balance = await client.readContract({
        address: config.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      });
      if (balance < config.totalAllocation)
        throw new Error(
          t("wizard.error.insufficientBalance", { symbol: prepared.symbol }),
        );
      if (config.eligibilityProvider !== zeroAddress) {
        const code = await client.getCode({
          address: config.eligibilityProvider,
        });
        if (!code || code === "0x")
          throw new Error(t("wizard.error.eligibilityNoCode", NETWORK));
      }
      const allowance = await client.readContract({
        address: config.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, factory],
      });
      if (allowance < config.totalAllocation) {
        if (allowance > 0n) {
          await tx.confirm(t("wizard.tx.resetAllowance"), () =>
            writeContractAsync({
              address: config.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [factory, 0n],
              chainId: 133,
              account: assertTestnetWallet(account, walletMessages),
              gas: 60_000n,
            }),
          );
        }
        await tx.confirm(t("wizard.tx.approve"), () =>
          writeContractAsync({
            address: config.token,
            abi: erc20Abi,
            functionName: "approve",
            args: [factory, config.totalAllocation],
            chainId: 133,
            account: assertTestnetWallet(account, walletMessages),
            gas: 80_000n,
          }),
        );
      }
      assertTestnetWallet(account, walletMessages);
      const createFunction = organizationId
        ? "createSponsoredGrant"
        : "createGrant";
      const simulation = await client.simulateContract({
        address: factory,
        abi: hashVestFactoryAbi,
        functionName: createFunction,
        args: [config, items],
        account,
      });
      const receipt = await tx.confirm(t("wizard.tx.create"), () =>
        writeContractAsync({
          address: factory,
          abi: hashVestFactoryAbi,
          functionName: createFunction,
          args: [config, items],
          chainId: 133,
          account: assertTestnetWallet(account, walletMessages),
          gas: simulation.request.gas
            ? (simulation.request.gas * 130n) / 100n
            : undefined,
        }),
      );
      const events = parseEventLogs({
        abi: hashVestFactoryAbi,
        eventName: "GrantCreated",
        logs: receipt.logs.filter(
          (log) => log.address.toLowerCase() === factory.toLowerCase(),
        ),
      });
      const expectedStart =
        config.start === 0n
          ? (await client.getBlock({ blockNumber: receipt.blockNumber }))
              .timestamp
          : config.start;
      // Match every immutable term and milestone. The simulation result and
      // event are preferred; the role index is a lagging HSK discovery fallback.
      let indexedAddress: Address | undefined;
      const matchesConfiguration = async (candidate: Address) => {
        try {
          const [
            candidateTitle,
            candidateIssuer,
            candidateBeneficiary,
            candidateReviewer,
            candidateToken,
            candidateAllocation,
            candidateStrategy,
            candidateStart,
            candidateCliff,
            candidateDuration,
            candidateProvider,
            candidateMilestones,
            candidateInitialUnlock,
            candidateRevocation,
          ] = await Promise.all([
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "title",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "issuer",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "beneficiary",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "reviewer",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "token",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "totalAllocation",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "strategy",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "start",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "cliff",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "duration",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "eligibilityProvider",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "getMilestones",
            }),
            client
              .readContract({
                address: candidate,
                abi: grantVaultAbi,
                functionName: "initialUnlock",
              })
              .catch(() => 0n),
            readRevocationState({
              revocable: () =>
                client.readContract({
                  address: candidate,
                  abi: grantVaultAbi,
                  functionName: "revocable",
                }),
              revoked: () =>
                client.readContract({
                  address: candidate,
                  abi: grantVaultAbi,
                  functionName: "revoked",
                }),
              revokedAt: () =>
                client.readContract({
                  address: candidate,
                  abi: grantVaultAbi,
                  functionName: "revokedAt",
                }),
              revocationEarnedAmount: () =>
                client.readContract({
                  address: candidate,
                  abi: grantVaultAbi,
                  functionName: "revocationEarnedAmount",
                }),
            }),
          ]);
          return (
            candidateTitle === config.title &&
            candidateIssuer.toLowerCase() === account.toLowerCase() &&
            candidateBeneficiary.toLowerCase() ===
              config.beneficiary.toLowerCase() &&
            candidateReviewer.toLowerCase() === config.reviewer.toLowerCase() &&
            candidateToken.toLowerCase() === config.token.toLowerCase() &&
            candidateAllocation === config.totalAllocation &&
            Number(candidateStrategy) === config.strategy &&
            candidateStart === expectedStart &&
            candidateCliff === config.cliff &&
            candidateDuration === config.duration &&
            candidateProvider.toLowerCase() ===
              config.eligibilityProvider.toLowerCase() &&
            candidateInitialUnlock === config.initialUnlock &&
            candidateRevocation.revocable === config.revocable &&
            candidateMilestones.length === items.length &&
            candidateMilestones.every(
              (milestone, index) =>
                milestone.title === items[index].title &&
                milestone.amount === items[index].amount &&
                !milestone.approved,
            )
          );
        } catch {
          return false;
        }
      };
      const candidates = [simulation.result, events[0]?.args.vault].filter(
        (candidate): candidate is Address => Boolean(candidate),
      );
      for (const candidate of candidates) {
        if (await matchesConfiguration(candidate)) {
          indexedAddress = candidate;
          break;
        }
      }
      for (let attempt = 0; attempt < 8 && !indexedAddress; attempt += 1) {
        const indexedGrants = await client.readContract({
          address: factory,
          abi: hashVestFactoryAbi,
          functionName: "getGrantsByIssuer",
          args: [account],
        });
        for (const candidate of [...indexedGrants].reverse()) {
          if (await matchesConfiguration(candidate)) {
            indexedAddress = candidate;
            break;
          }
        }
        if (!indexedAddress && attempt < 7)
          await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const created = indexedAddress;
      if (created) {
        setCreatedAddress(created);
        setCreationConfirmed(true);
        await syncWorkspaceGrant(created);
      } else {
        setCreationConfirmed(true);
      }
    });
  }

  async function syncWorkspaceGrant(vaultAddress: Address) {
    if (!organizationId) return;
    setMetadataSync("pending");
    setMetadataError("");
    try {
      if (!prepared) throw new Error(t("wizard.error.reviewAgain"));
      const currentWallet = assertTestnetWallet(
        prepared.issuer,
        walletMessages,
      );
      if (
        !session.walletMatches ||
        session.session?.walletAddress.toLowerCase() !==
          currentWallet.toLowerCase()
      )
        throw new Error(t("wizard.error.walletChangedSync"));
      await linkGrant.mutateAsync({
        chainId: 133,
        vaultAddress,
        description: description.trim() || null,
        // Optional product metadata: which preset this grant started from. It
        // carries no onchain authority and never changes the vault's terms.
        templateKey: applied?.key ?? null,
      });
      setMetadataSync("saved");
    } catch (error) {
      setMetadataSync("failed");
      setMetadataError(
        errorMessage(error, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
        }),
      );
    }
  }

  function updateMilestone(
    index: number,
    key: keyof MilestoneInput,
    value: string,
  ) {
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeading
        eyebrow={t("wizard.eyebrow")}
        title={
          creationConfirmed
            ? t("wizard.title.created")
            : t("wizard.title.create")
        }
      >
        <p>
          {creationConfirmed
            ? t("wizard.lede.created", NETWORK)
            : t("wizard.lede.create")}
        </p>
      </PageHeading>
      <NetworkNotice />
      {organizationId && organization.data && (
        <Notice
          title={t("wizard.notice.organization.title", {
            organization: organization.data.organization.name,
          })}
        >
          <p>{t("wizard.notice.organization.body")}</p>
        </Notice>
      )}
      {!factory && (
        <Notice title={t("wizard.notice.noDeployment.title")}>
          <p>{t("wizard.notice.noDeployment.body")}</p>
        </Notice>
      )}
      {!creationConfirmed && (
        <div className="flex rounded-lg border bg-secondary/30 p-1 w-fit">
          <button
            type="button"
            onClick={() => setCreationMode("single")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              creationMode === "single"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Grant
          </button>
          <button
            type="button"
            onClick={() => setCreationMode("cohort")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              creationMode === "cohort"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cohort Distribution (Batch)
          </button>
        </div>
      )}
      {creationMode === "cohort" ? (
        <CohortCreator
          organizationId={organizationId}
          onSwitchToSingle={() => setCreationMode("single")}
        />
      ) : creationConfirmed ? (
        <Card>
          <CardContent className="space-y-6 p-7">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
              ✓
            </div>
            <h2 className="font-mono text-[22px] font-normal">
              {prepared?.config.title}
            </h2>
            {createdAddress ? (
              <>
                <AddressDisplay address={createdAddress} full />
                {organizationId && metadataSync === "pending" && (
                  <Notice title={t("wizard.sync.pending.title")}>
                    <p>{t("wizard.sync.pending.body")}</p>
                  </Notice>
                )}
                {organizationId && metadataSync === "saved" && (
                  <p className="text-sm text-primary">
                    {t("wizard.sync.saved")}
                  </p>
                )}
                {organizationId && metadataSync === "failed" && (
                  <Notice title={t("wizard.sync.failed.title")} error>
                    <p>{t("wizard.sync.failed.body")}</p>
                    <p className="mt-2 break-words">{metadataError}</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      disabled={linkGrant.isPending}
                      onClick={() => void syncWorkspaceGrant(createdAddress)}
                    >
                      {linkGrant.isPending
                        ? t("wizard.sync.retrying")
                        : t("wizard.sync.retry")}
                    </Button>
                  </Notice>
                )}
                <div>
                  <Link
                    className={buttonVariants()}
                    href={`/grants/${createdAddress}`}
                  >
                    {t("wizard.openGrant")} <span aria-hidden>→</span>
                  </Link>
                </div>
              </>
            ) : (
              <p>
                {t("wizard.confirmed.before")}
                <Link
                  href={appRoutes.grants}
                  className="text-primary underline"
                >
                  {t("wizard.confirmed.link")}
                </Link>
                {t("wizard.confirmed.after")}
              </p>
            )}
            <TransactionStatus {...tx} />
          </CardContent>
        </Card>
      ) : (
        <>
          <ol
            aria-label={t("wizard.progress")}
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {steps.map((id, index) => (
              <li
                key={id}
                aria-current={step === index ? "step" : undefined}
                className={`border-b-2 pb-3 text-sm ${index <= step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-secondary text-xs">
                  {index + 1}
                </span>
                {t(`wizard.step.${id}`)}
              </li>
            ))}
          </ol>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {t(`wizard.stepTitle.${steps[step]}`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step < STEP.review) next();
                }}
                className="space-y-6"
              >
                <fieldset className="min-w-0 space-y-6" disabled={tx.pending}>
                  {step === STEP.template && (
                    <div className="space-y-7">
                      <OrganizationTemplatePicker
                        organizationId={templateSource || undefined}
                        fixedOrganization={Boolean(organizationId)}
                        onOrganizationChange={setTemplateOrganizationId}
                        selectedTemplateId={appliedTemplateId}
                        onSelect={chooseOrganizationTemplate}
                      />
                      <PresetPicker
                        selected={applied?.key ?? null}
                        appliedPreset={applied?.preset}
                        onSelect={choosePreset}
                      />
                    </div>
                  )}
                  {step === STEP.grant && (
                    <>
                      <Field
                        label={t("wizard.field.title.label")}
                        hint={t("wizard.field.title.hint")}
                      >
                        <input
                          className="field"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          maxLength={120}
                          placeholder={t("wizard.field.title.placeholder")}
                          autoComplete="off"
                        />
                      </Field>
                      {organizationId ? (
                        <MemberPicker
                          label={t("wizard.field.beneficiary.label")}
                          hint={t("wizard.field.beneficiary.hint")}
                          choosePlaceholder={t("picker.chooseBeneficiary")}
                          members={organizationMembers.data}
                          memberId={beneficiaryMemberId}
                          addressValue={beneficiary}
                          onMemberChange={setBeneficiaryMemberId}
                          onAddressChange={setBeneficiary}
                          external={beneficiaryExternal}
                          onExternalChange={setBeneficiaryExternal}
                        />
                      ) : (
                        <Field
                          label={t("wizard.field.beneficiaryWallet.label")}
                          hint={t("wizard.field.beneficiaryWallet.hint")}
                        >
                          <input
                            className="field font-mono"
                            value={beneficiary}
                            onChange={(event) =>
                              setBeneficiary(event.target.value.trim())
                            }
                            placeholder="0x…"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </Field>
                      )}
                      {organizationId && organizationMembers.isError && (
                        <p className="text-xs text-destructive">
                          {t("wizard.members.unavailable")}
                        </p>
                      )}
                      {organizationId && (
                        <Field
                          label={t("wizard.field.description.label")}
                          hint={t("wizard.field.description.hint")}
                        >
                          <textarea
                            className="field min-h-24 resize-y"
                            value={description}
                            onChange={(event) =>
                              setDescription(event.target.value)
                            }
                            maxLength={1000}
                            placeholder={t(
                              "wizard.field.description.placeholder",
                            )}
                          />
                        </Field>
                      )}
                      <Field
                        label={t("wizard.field.token.label")}
                        hint={t("wizard.field.token.hint", NETWORK)}
                      >
                        <input
                          className="field font-mono"
                          value={token}
                          onChange={(event) =>
                            setToken(event.target.value.trim())
                          }
                          placeholder="0x…"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </Field>
                      {testnetDeployment.demoToken && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setToken(testnetDeployment.demoToken ?? "")
                          }
                        >
                          {t("wizard.token.useDemo", { symbol: "hvUSD" })}
                        </Button>
                      )}
                      {isAddress(token) && (
                        <p className="text-xs text-muted-foreground">
                          {tokenMetadata.isPending
                            ? t("wizard.token.reading", NETWORK)
                            : tokenMetadata.isError
                              ? t("wizard.token.error")
                              : t("wizard.token.decimals", {
                                  symbol: tokenMetadata.data?.symbol ?? "",
                                  decimals: tokenMetadata.data?.decimals ?? 0,
                                })}
                        </p>
                      )}
                      <Field
                        label={t("wizard.field.allocation.label")}
                        hint={t("wizard.field.allocation.hint")}
                      >
                        <input
                          className="field"
                          value={allocation}
                          onChange={(event) =>
                            changeAllocation(event.target.value)
                          }
                          inputMode="decimal"
                          placeholder="1000"
                          autoComplete="off"
                        />
                      </Field>
                    </>
                  )}
                  {step === STEP.strategy && (
                    <div className="space-y-3">
                      {STRATEGY_INDEXES.map((index) => (
                        <label
                          key={index}
                          className={`flex cursor-pointer items-start gap-4 rounded-card border p-5 ${strategy === index ? "border-primary bg-[rgba(87,217,139,.06)]" : "bg-card"}`}
                        >
                          <input
                            className="mt-1 accent-primary"
                            type="radio"
                            name="strategy"
                            checked={strategy === index}
                            onChange={() => {
                              const next =
                                index === 0 ? 0 : index === 1 ? 1 : 2;
                              setStrategy(next);
                              if (next === 1) setInitialUnlock("");
                            }}
                          />
                          <span>
                            <span className="block font-semibold">
                              {t(`strategy.${index}.name`)}
                            </span>
                            <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                              {t(`strategy.${index}.description`)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {step === STEP.conditions && (
                    <>
                      {strategy !== 1 && (
                        <div className="space-y-5">
                          <div>
                            <h3 className="font-semibold">
                              {t("wizard.schedule.title")}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {t("wizard.schedule.lede")}
                            </p>
                          </div>
                          <Field
                            label={t("wizard.field.start.label")}
                            hint={t("wizard.field.start.hint")}
                          >
                            <input
                              className="field"
                              type="datetime-local"
                              value={start}
                              onChange={(event) => setStart(event.target.value)}
                            />
                          </Field>
                          <Field
                            label={t("wizard.field.initialUnlock.label")}
                            hint={t("wizard.field.initialUnlock.hint")}
                          >
                            <div className="relative">
                              <input
                                className="field pr-16"
                                placeholder="0.0"
                                value={initialUnlock}
                                onChange={(event) =>
                                  setInitialUnlock(event.target.value)
                                }
                              />
                              {tokenMetadata.data && (
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                                  {tokenMetadata.data.symbol}
                                </span>
                              )}
                            </div>
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Field label={t("wizard.field.unit.label")}>
                              <select
                                className="field"
                                value={unit}
                                onChange={(event) =>
                                  setUnit(event.target.value)
                                }
                              >
                                <option value="60">
                                  {t("wizard.unit.minutes")}
                                </option>
                                <option value="3600">
                                  {t("wizard.unit.hours")}
                                </option>
                                <option value="86400">
                                  {t("wizard.unit.days")}
                                </option>
                              </select>
                            </Field>
                            <Field label={t("wizard.field.cliff.label")}>
                              <input
                                className="field"
                                inputMode="numeric"
                                value={cliff}
                                onChange={(event) =>
                                  setCliff(event.target.value)
                                }
                              />
                            </Field>
                            <Field label={t("wizard.field.duration.label")}>
                              <input
                                className="field"
                                inputMode="numeric"
                                value={duration}
                                onChange={(event) =>
                                  setDuration(event.target.value)
                                }
                              />
                            </Field>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {applied?.preset.timing?.realWorldNote ||
                              t("wizard.schedule.demoTip")}
                          </p>
                        </div>
                      )}
                      {strategy !== 0 && (
                        <div className="space-y-5">
                          {organizationId ? (
                            <MemberPicker
                              label={t("wizard.field.reviewer.label")}
                              hint={t("wizard.field.reviewer.hint")}
                              choosePlaceholder={t("picker.chooseReviewer")}
                              members={organizationMembers.data}
                              memberId={reviewerMemberId}
                              addressValue={reviewer}
                              onMemberChange={setReviewerMemberId}
                              onAddressChange={setReviewer}
                              external={reviewerExternal}
                              onExternalChange={setReviewerExternal}
                            />
                          ) : (
                            <Field
                              label={t("wizard.field.reviewerWallet.label")}
                              hint={t("wizard.field.reviewerWallet.hint")}
                            >
                              <input
                                className="field font-mono"
                                value={reviewer}
                                onChange={(event) =>
                                  setReviewer(event.target.value.trim())
                                }
                                placeholder="0x…"
                                spellCheck={false}
                              />
                            </Field>
                          )}
                          <div>
                            <h3 className="font-semibold">
                              {t("wizard.milestones.title")}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {t("wizard.milestones.lede", {
                                amount:
                                  allocation ||
                                  t("wizard.milestones.theAllocation"),
                                symbol: tokenMetadata.data?.symbol ?? "",
                                max: 20,
                              })}
                            </p>
                          </div>
                          {milestones.map((item, index) => (
                            <div
                              className="space-y-3 rounded-card border bg-secondary/30 p-4"
                              key={index}
                            >
                              <div className="flex justify-between">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {t("wizard.milestone.index", {
                                    index: index + 1,
                                  })}
                                </p>
                                {milestones.length > 1 && (
                                  <button
                                    className="text-xs text-destructive"
                                    type="button"
                                    onClick={() =>
                                      setMilestones((items) =>
                                        items.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                      )
                                    }
                                  >
                                    {t("wizard.milestone.remove")}
                                  </button>
                                )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                                <Field
                                  label={t("wizard.field.milestoneTitle.label")}
                                >
                                  <input
                                    className="field"
                                    value={item.title}
                                    onChange={(event) =>
                                      updateMilestone(
                                        index,
                                        "title",
                                        event.target.value,
                                      )
                                    }
                                    maxLength={120}
                                    placeholder={t(
                                      "wizard.field.milestoneTitle.placeholder",
                                    )}
                                  />
                                </Field>
                                <Field
                                  label={t(
                                    "wizard.field.milestoneAmount.label",
                                    {
                                      symbol:
                                        tokenMetadata.data?.symbol ??
                                        t(
                                          "wizard.field.milestoneAmount.fallbackSymbol",
                                        ),
                                    },
                                  )}
                                >
                                  <input
                                    className="field"
                                    inputMode="decimal"
                                    value={item.amount}
                                    onChange={(event) =>
                                      updateMilestone(
                                        index,
                                        "amount",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="500"
                                  />
                                </Field>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            disabled={milestones.length >= 20}
                            onClick={() =>
                              setMilestones((items) => [
                                ...items,
                                { title: "", amount: "" },
                              ])
                            }
                          >
                            {t("wizard.milestones.add")}
                          </Button>
                        </div>
                      )}
                      <details className="rounded-card border border-border p-4">
                        <summary className="cursor-pointer text-sm font-medium">
                          {t("wizard.advanced.summary")}
                        </summary>
                        <div className="mt-4">
                          <Field
                            label={t("wizard.field.eligibility.label")}
                            hint={t("wizard.field.eligibility.hint")}
                          >
                            <input
                              className="field font-mono"
                              value={provider}
                              onChange={(event) =>
                                setProvider(event.target.value.trim())
                              }
                              placeholder={t(
                                "wizard.field.eligibility.placeholder",
                              )}
                              spellCheck={false}
                            />
                          </Field>
                        </div>
                      </details>
                      <div className="rounded-card border border-border p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={revocable}
                            onChange={(event) =>
                              setRevocable(event.target.checked)
                            }
                          />
                          <div>
                            <span className="text-sm font-medium">
                              {t("wizard.field.revocable.label")}
                            </span>
                            <span className="block text-xs leading-5 text-muted-foreground mt-0.5">
                              {t("wizard.field.revocable.hint")}
                            </span>
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                  {step === STEP.review && prepared && (
                    <>
                      <div className="rounded-card border border-primary/20 bg-[rgba(87,217,139,.05)] p-5">
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[.08em] text-primary">
                          {t(`strategy.${prepared.config.strategy}.name`)}
                        </p>
                        <h3 className="mt-2 font-mono text-[18px] font-normal">
                          {prepared.config.title}
                        </h3>
                        <p className="mt-4 break-all font-mono text-[28px] font-medium tabular-nums">
                          {formatUnits(
                            prepared.config.totalAllocation,
                            prepared.decimals,
                          )}{" "}
                          <span className="text-lg text-muted-foreground">
                            {prepared.symbol}
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t(
                            `strategy.${prepared.config.strategy}.description`,
                          )}
                        </p>
                        {applied && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {t("wizard.review.fromPreset", {
                              preset: appliedPresetName,
                            })}
                          </p>
                        )}
                      </div>
                      <dl className="space-y-4 text-sm">
                        {[
                          ["issuer", prepared.issuer],
                          ["beneficiary", prepared.config.beneficiary],
                          ["token", prepared.config.token],
                          ...(strategy !== 0
                            ? [["reviewer", prepared.config.reviewer]]
                            : []),
                        ].map(([field, party]) => (
                          <div
                            key={field}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <dt className="text-muted-foreground">
                              {t(
                                `wizard.review.${field as "issuer" | "beneficiary" | "token" | "reviewer"}`,
                              )}
                            </dt>
                            <dd>
                              {organizationId && field !== "token" ? (
                                <ParticipantIdentity
                                  label=""
                                  address={getAddress(party)}
                                  members={organizationMembers.data}
                                />
                              ) : (
                                <AddressDisplay
                                  address={getAddress(party)}
                                  full
                                />
                              )}
                            </dd>
                          </div>
                        ))}
                        {strategy !== 1 && (
                          <>
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">
                                {t("wizard.review.start")}
                              </dt>
                              <dd>
                                {prepared.config.start === 0n
                                  ? t("wizard.review.startCreation")
                                  : dateLabel(prepared.config.start)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">
                                {t("wizard.review.initialUnlock")}
                              </dt>
                              <dd>
                                {prepared.config.initialUnlock > 0n
                                  ? t("wizard.review.initialUnlockValue", {
                                      amount: formatUnits(
                                        prepared.config.initialUnlock,
                                        prepared.decimals,
                                      ),
                                      symbol: prepared.symbol,
                                      percent: percent(
                                        prepared.config.initialUnlock,
                                        prepared.config.totalAllocation,
                                      ),
                                    })
                                  : t("wizard.review.initialUnlockNone")}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">
                                {t("wizard.review.cliffDuration")}
                              </dt>
                              <dd>
                                {prepared.config.cliff.toString()}s /{" "}
                                {prepared.config.duration.toString()}s
                              </dd>
                            </div>
                            {prepared.config.initialUnlock > 0n && (
                              <div className="rounded-lg bg-secondary/50 p-3 text-xs leading-5">
                                <p className="font-semibold text-foreground">
                                  {t("wizard.review.schedulePreview")}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {t("wizard.review.scheduleAtStart", {
                                    amount: formatUnits(
                                      prepared.config.initialUnlock,
                                      prepared.decimals,
                                    ),
                                    symbol: prepared.symbol,
                                  })}
                                  <br />
                                  {t("wizard.review.scheduleAtCliff", {
                                    amount: formatUnits(
                                      calculateVestedByTime({
                                        start: prepared.config.start,
                                        cliff: prepared.config.cliff,
                                        duration: prepared.config.duration,
                                        totalAllocation:
                                          prepared.config.totalAllocation,
                                        initialUnlock:
                                          prepared.config.initialUnlock,
                                        timestamp:
                                          prepared.config.start +
                                          prepared.config.cliff,
                                      }),
                                      prepared.decimals,
                                    ),
                                    symbol: prepared.symbol,
                                  })}
                                  <br />
                                  {t("wizard.review.scheduleAtCompletion", {
                                    amount: formatUnits(
                                      prepared.config.totalAllocation,
                                      prepared.decimals,
                                    ),
                                    symbol: prepared.symbol,
                                  })}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">
                            {t("wizard.review.eligibility")}
                          </dt>
                          <dd>
                            {prepared.config.eligibilityProvider ===
                            zeroAddress ? (
                              t("wizard.review.eligibilityNone")
                            ) : (
                              <AddressDisplay
                                address={prepared.config.eligibilityProvider}
                                full
                              />
                            )}
                          </dd>
                        </div>
                      </dl>
                      {prepared.milestones.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                          {prepared.milestones.map((item, index) => (
                            <div
                              className="flex justify-between gap-4 text-sm"
                              key={index}
                            >
                              <span>
                                {index + 1}. {item.title}
                              </span>
                              <strong className="break-all text-right">
                                {formatUnits(item.amount, prepared.decimals)}{" "}
                                {prepared.symbol}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <Notice
                        title={
                          prepared.config.revocable
                            ? t("wizard.review.revocable.title")
                            : t("wizard.review.permanent.title")
                        }
                      >
                        <p>
                          {prepared.config.revocable
                            ? t("wizard.review.revocable.body")
                            : t("wizard.review.permanent.body")}
                        </p>
                      </Notice>
                    </>
                  )}
                </fieldset>
                {validationError && (
                  <p role="alert" className="text-sm text-destructive">
                    {validationError}
                  </p>
                )}
                <div className="flex justify-between gap-3 border-t pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={step === STEP.template || tx.pending}
                    onClick={() => {
                      setStep((current) => current - 1);
                      setValidationError("");
                    }}
                  >
                    {t("wizard.nav.back")}
                  </Button>
                  {step < STEP.review ? (
                    <Button
                      type="submit"
                      disabled={step === STEP.conditions && !address}
                    >
                      {t("wizard.nav.continue")} <span aria-hidden>→</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        !canWrite ||
                        tx.pending ||
                        !prepared ||
                        address?.toLowerCase() !== prepared.issuer.toLowerCase()
                      }
                      onClick={() => void createGrant()}
                    >
                      {tx.pending
                        ? t("wizard.nav.pending")
                        : t("wizard.nav.submit")}
                    </Button>
                  )}
                </div>
                {prepared &&
                  step === STEP.review &&
                  address &&
                  address.toLowerCase() !== prepared.issuer.toLowerCase() && (
                    <p role="alert" className="text-sm text-destructive">
                      {t("wizard.walletChanged")}
                    </p>
                  )}
                <TransactionStatus {...tx} />
              </form>
            </CardContent>
          </Card>
          {step === STEP.grant && <DemoFaucet />}
        </>
      )}
      {!creationConfirmed && (
        <AiGrantBuilder onApply={applyAiDraft} disabled={tx.pending} />
      )}
    </div>
  );
}

export default function NewGrantPage() {
  return <NewGrant />;
}
