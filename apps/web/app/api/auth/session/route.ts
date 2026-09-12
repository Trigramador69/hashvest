import { readSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await readSession();
  return Response.json(
    session ? { authenticated: true, session } : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
