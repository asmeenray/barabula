// JSON-only body reader for write routes (16-RESEARCH Security, T-16-18).
// A non-JSON Content-Type gets 415, so a cross-site HTML form post (which can
// only send urlencoded, multipart or text/plain) can never reach a write.

type ReadJsonResult = { ok: true; body: unknown } | { ok: false; response: Response }

function isJsonContentType(header: string | null): boolean {
  if (!header) return false
  return header.split(';')[0].trim().toLowerCase() === 'application/json'
}

export async function readJson(req: Request): Promise<ReadJsonResult> {
  if (!isJsonContentType(req.headers.get('content-type'))) {
    return { ok: false, response: Response.json({ error: 'Unsupported media type' }, { status: 415 }) }
  }
  try {
    return { ok: true, body: await req.json() }
  } catch {
    return { ok: false, response: Response.json({ error: 'Invalid request' }, { status: 400 }) }
  }
}
