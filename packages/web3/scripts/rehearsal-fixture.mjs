import { getAddress, isAddress, parseUnits, zeroAddress } from "viem";

const walletRoles = ["issuer", "reviewer", "beneficiary"];
const walletLabels = {
  issuer: "Issuer / workspace owner",
  reviewer: "Treasury Reviewer",
  beneficiary: "Builder",
};
const walletFields = ["label", "address"];
const grantFields = [
  "strategy",
  "allocation",
  "cliffSeconds",
  "durationSeconds",
  "milestones",
];
const milestoneFields = ["title", "amount"];
const tokenDecimals = 18;
const maxMilestones = 20;
const fixedGrant = {
  strategy: "HYBRID",
  allocation: "100",
  cliffSeconds: 0,
  durationSeconds: 300,
  milestones: [
    { title: "Prototype accepted", amount: "40" },
    { title: "Delivery accepted", amount: "60" },
  ],
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value) {
  if (!isRecord(value))
    throw new Error(
      "Rehearsal fixture must contain public addresses and rehearsal settings only.",
    );
  return value;
}

function requireExactFields(value, fields) {
  const record = requireRecord(value);
  if (Object.keys(record).some((field) => !fields.includes(field)))
    throw new Error(
      "Rehearsal fixture must contain public addresses and rehearsal settings only.",
    );
  return record;
}

function requireText(value, message) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function parsePublicAddress(value) {
  if (typeof value !== "string" || !isAddress(value))
    throw new Error(
      "Every rehearsal wallet must use a valid public EVM address.",
    );
  const address = getAddress(value);
  if (address.toLowerCase() === zeroAddress)
    throw new Error(
      "Every rehearsal wallet must use a nonzero public EVM address.",
    );
  return address;
}

function parseTokenAmount(value, label) {
  if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value))
    throw new Error(`${label} must be a positive decimal token amount.`);
  try {
    const amount = parseUnits(value, tokenDecimals);
    if (amount <= 0n) throw new Error("zero");
    return amount;
  } catch {
    throw new Error(`${label} must be a positive decimal token amount.`);
  }
}

function parseSeconds(value, label, { positive = false } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < (positive ? 1 : 0)
  )
    throw new Error(
      `${label} must be a ${positive ? "positive" : "nonnegative"} whole number of seconds.`,
    );
  return value;
}

export function parseRehearsalFixture(input) {
  const root = requireExactFields(input, ["wallets", "grant"]);
  const walletInput = requireExactFields(root.wallets, walletRoles);
  const wallets = {};
  const addresses = new Set();

  for (const role of walletRoles) {
    const member = requireExactFields(walletInput[role], walletFields);
    const label = requireText(
      member.label,
      `The ${role} wallet needs a label.`,
    );
    if (label !== walletLabels[role])
      throw new Error(
        "Rehearsal wallet labels are fixed; edit public addresses only.",
      );
    const address = parsePublicAddress(member.address);
    const normalized = address.toLowerCase();
    if (addresses.has(normalized))
      throw new Error(
        "Issuer, reviewer, and beneficiary wallets must be distinct.",
      );
    addresses.add(normalized);
    wallets[role] = { label, address };
  }

  const grantInput = requireExactFields(root.grant, grantFields);
  if (grantInput.strategy !== fixedGrant.strategy)
    throw new Error(
      "The browser rehearsal fixture must use the HYBRID strategy.",
    );
  const allocationBaseUnits = parseTokenAmount(
    grantInput.allocation,
    "Allocation",
  );
  const cliffSeconds = parseSeconds(grantInput.cliffSeconds, "Cliff");
  const durationSeconds = parseSeconds(grantInput.durationSeconds, "Duration", {
    positive: true,
  });
  if (cliffSeconds > durationSeconds)
    throw new Error("Cliff cannot be longer than the total duration.");
  if (
    !Array.isArray(grantInput.milestones) ||
    grantInput.milestones.length === 0 ||
    grantInput.milestones.length > maxMilestones
  )
    throw new Error(`Add between 1 and ${maxMilestones} rehearsal milestones.`);

  const milestones = grantInput.milestones.map((inputMilestone, index) => {
    const milestone = requireExactFields(inputMilestone, milestoneFields);
    return {
      title: requireText(
        milestone.title,
        `Milestone ${index + 1} needs a title.`,
      ),
      amount: milestone.amount,
      amountBaseUnits: parseTokenAmount(
        milestone.amount,
        `Milestone ${index + 1}`,
      ),
    };
  });
  const milestoneTotal = milestones.reduce(
    (total, milestone) => total + milestone.amountBaseUnits,
    0n,
  );
  if (milestoneTotal !== allocationBaseUnits)
    throw new Error(
      "Rehearsal milestones must add up exactly to the allocation.",
    );
  if (
    grantInput.allocation !== fixedGrant.allocation ||
    grantInput.cliffSeconds !== fixedGrant.cliffSeconds ||
    grantInput.durationSeconds !== fixedGrant.durationSeconds ||
    milestones.length !== fixedGrant.milestones.length ||
    milestones.some(
      (milestone, index) =>
        milestone.title !== fixedGrant.milestones[index].title ||
        milestone.amount !== fixedGrant.milestones[index].amount,
    )
  )
    throw new Error(
      "Use the fixed 100 hvUSD HYBRID rehearsal schedule: 0/300 seconds with 40/60 milestones.",
    );

  return {
    wallets,
    grant: {
      strategy: fixedGrant.strategy,
      allocation: grantInput.allocation,
      allocationBaseUnits,
      cliffSeconds,
      durationSeconds,
      milestones,
    },
  };
}
