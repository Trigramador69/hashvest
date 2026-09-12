import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-16 py-7 sm:py-12">
      <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.2em] text-primary">
            Programmable grants · HashKey Chain
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Fund the work.
            <br />
            <span className="text-primary">Define the unlock.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            HashVest turns token allocations into fully funded grants that
            unlock with time, milestones, or both.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className={buttonVariants({ size: "lg" })}>
              Open application <span aria-hidden>↗</span>
            </Link>
            <Link
              href="/grants/new"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Create a grant
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Live on HSK Testnet · ERC20 tokens · No revocation
          </p>
        </div>
        <div className="rounded-2xl border bg-secondary/60 p-7 sm:p-10">
          <p className="mb-7 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            One allocation. Clear conditions.
          </p>
          <div className="space-y-4">
            {[
              [
                "01",
                "Treasury funds a vault",
                "The full allocation is deposited at creation.",
              ],
              [
                "02",
                "Conditions unlock tokens",
                "A fixed schedule, reviewer approval, or both.",
              ],
              [
                "03",
                "Beneficiary claims",
                "Only the recipient can withdraw unlocked tokens.",
              ],
            ].map(([step, title, description]) => (
              <div
                key={step}
                className="flex gap-4 rounded-xl border bg-card p-5"
              >
                <span className="text-sm font-semibold text-primary">
                  {step}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Built for every kind of contribution.
          </h2>
          <p className="text-sm text-muted-foreground">
            Ecosystem builders · Teams · Advisors · Contributors
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              "Time vesting",
              "Reward sustained commitment.",
              "Tokens vest linearly from the start. An optional cliff delays access without resetting the curve.",
            ],
            [
              "Milestone grants",
              "Fund measurable progress.",
              "A designated reviewer approves fixed milestones. Each approval unlocks its exact allocation.",
            ],
            [
              "Hybrid grants",
              "Keep time and delivery aligned.",
              "Unlocked = min(time vested, approved milestone amount). Both conditions constrain every claim.",
            ],
          ].map(([title, subtitle, description]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="pt-2 text-sm font-medium text-primary">
                  {subtitle}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
