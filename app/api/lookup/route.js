import { lookupCIDR, lookupIP, rangeToCIDR, search } from "@/lib/geoip";

// Same contract as core-engine's GET /lookup (server/cidr_handler.go):
//   ?ip=8.8.8.8 | ?cidr=8.8.8.0/24 | ?range=8.8.8.0-8.8.8.255
//   -> { message: "success", data } or { message: "error", data: { error } }
// Plus ?q= for the UI's free-text search (also accepts hostnames).
export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const ip = params.get("ip");
  const cidr = params.get("cidr");
  const range = params.get("range");
  const q = params.get("q");

  try {
    let data;
    if (ip) {
      data = await lookupIP(ip);
    } else if (cidr) {
      data = await lookupCIDR(cidr);
    } else if (range) {
      const parts = range.split("-");
      if (parts.length !== 2) return error("invalid range format");
      data = await rangeToCIDR(parts[0], parts[1]);
    } else if (q) {
      data = await search(q);
    } else {
      return error("provide ip or cidr or range");
    }
    return Response.json({ message: "success", data });
  } catch (err) {
    return error(err.message, err.status ?? 400);
  }
}

function error(message, status = 400) {
  return Response.json({ message: "error", data: { error: message } }, { status });
}
