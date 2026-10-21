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
    token = token.replace(/^\[|\](:\d+)?$/g, "").replace(/%\w+$/, "");
    if (isIPv6(token)) found.add(token.toLowerCase());
  }
  return [...found];
}
