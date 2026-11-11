import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = new URLSearchParams(await request.text());
  const token = url.searchParams.get("token") ?? body.get("token");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return new Response("Invalid unsubscribe request.", { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response("Unsubscribe service is temporarily unavailable.", {
      status: 503,
    });
  }

  const client = new ConvexHttpClient(convexUrl);
  try {
    await client.mutation(api.reminders.unsubscribe, { token });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("One-click workout reminder unsubscribe failed.", error);
    return new Response("Could not update reminder preferences.", {
      status: 500,
    });
  }
}
