import { NextRequest, NextResponse } from "next/server";
import { MlbPlayerIdParamSchema, OddsResponseSchema } from "@/types/mlb";
import { fallbackOdds, getOddsForPlayer, swrCacheHeaders } from "@/lib/propline";

export const runtime = "edge";

const enc = new TextEncoder();

function jsonHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    ...swrCacheHeaders(),
    ...extra,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId: rawId } = await ctx.params;
  const idParse = MlbPlayerIdParamSchema.safeParse(rawId);
  const playerId = idParse.success ? idParse.data : "0";

  const wantsStream = req.nextUrl.searchParams.get("stream") === "1";

  let body: unknown;
  let usedFallback = false;
  try {
    if (!idParse.success) {
      body = fallbackOdds(rawId || "unknown");
      usedFallback = true;
    } else {
      body = await getOddsForPlayer(playerId);
      const check = OddsResponseSchema.safeParse(body);
      if (!check.success) {
        body = fallbackOdds(playerId);
        usedFallback = true;
      }
    }
  } catch (e) {
    console.error("[api/odds] MCP/cache error", e);
    body = fallbackOdds(playerId);
    usedFallback = true;
  }

  const finalParsed = OddsResponseSchema.safeParse(body);
  const payload = finalParsed.success ? finalParsed.data : fallbackOdds(playerId);

  if (wantsStream) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          send({ type: "start", playerId: idParse.success ? playerId : rawId });
          await new Promise((r) => setTimeout(r, 0));
          send({ type: "props", props: payload.props });
          send({ type: "books", books: payload.books });
          send({ type: "done", ok: true, fallback: usedFallback });
        } catch (err) {
          send({ type: "error", message: String(err) });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Statpedia-Fallback": usedFallback ? "1" : "0",
      },
    });
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: jsonHeaders({ "X-Statpedia-Fallback": usedFallback ? "1" : "0" }),
  });
}
