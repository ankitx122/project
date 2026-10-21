// Pull IP addresses out of pasted text or a file (lists, CSVs, log lines). IPv4 is matched anywhere,
// including "1.2.3.4:443"; IPv6 is taken from whitespace/punctuation-separated tokens and checked with
// the URL parser, so timestamps like 12:30:45 aren't mistaken for addresses.
const IPV4 = /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d.])/g;

function isIPv6(token) {
  if ((token.match(/:/g) ?? []).length < 2 || !/^[0-9a-f:.]+$/i.test(token)) return false;
  try {
    new URL(`http://[${token}]/`);
    return true;
  } catch {
    return false;
  }
}

export default function extractIps(text) {
  const found = new Set(text.match(IPV4) ?? []);
  for (let token of text.split(/[\s,;|"'()<>{}]+/)) {
    token = token.replace(/^\[|\](:\d+)?$/g, "").replace(/%\w+$/, ""); // [v6]:port and zone ids
    if (isIPv6(token)) found.add(token.toLowerCase());
  }
  return [...found];
}
