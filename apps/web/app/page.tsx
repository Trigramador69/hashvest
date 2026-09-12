import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletStatus } from "@/components/wallet-status";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader className="gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            HSK Web3 workspace
          </p>
          <CardTitle className="text-3xl tracking-tight">
            Development environment ready
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            A minimal starting point for building and testing future on-chain
            workflows.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>HSK Testnet default</Button>
            <span className="text-sm text-muted-foreground">
              Chain configuration is loaded.
            </span>
          </div>
          <WalletStatus />
        </CardContent>
      </Card>
    </main>
  );
}
