/** Generate queries like a user would type in the Google Maps search bar (no `site:` operators). */
export function generateMapsPlacesQueries(niche: string, city: string): string[] {
  const n = niche.trim();
  const c = city.trim();
  const commaIdx = c.indexOf(",");
  const cityOnly =
    commaIdx >= 0
      ? c.slice(0, commaIdx).replace(/\s+/g, " ").trim()
      : c.replace(/\s+/g, " ").trim();
  const afterComma = commaIdx >= 0 ? c.slice(commaIdx + 1).replace(/\s+/g, " ").trim() : "";
  const stateGuess =
    (/^[A-Z]{2}$/.test(afterComma) ? afterComma : "") || (c.match(/\b([A-Z]{2})\b/)?.[1] ?? "");

  const commaPlace = stateGuess ? `${cityOnly}, ${stateGuess}` : cityOnly;
  const spacePlace = stateGuess ? `${cityOnly} ${stateGuess}` : cityOnly;

  const ordered: (string | null)[] = [
    `${n} in ${commaPlace}`,
    `${n} in ${spacePlace}`,
    `${n} near ${commaPlace}`,
    `${n} ${commaPlace}`,
    `${n} ${spacePlace}`,
    stateGuess ? `${n} in ${cityOnly}` : null,
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of ordered) {
    if (!q) continue;
    const t = q.replace(/\s+/g, " ").trim();
    if (t.length <= 4 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Generate diverse SERP-style queries for a niche + city (Brave Web Search / other providers). */
export function generateSerpQueries(niche: string, city: string): string[] {
  const n = niche.trim();
  const c = city.trim();
  const stateGuess = c.match(/\b([A-Z]{2})\b/)?.[1] ?? "";
  const cityPart = c.replace(/,/g, "").trim();
  const place = stateGuess ? `${cityPart} ${stateGuess}` : cityPart;

  /** Order matters: local / Maps-style queries first (closer to “electricians in Bothell”). */
  const ordered: string[] = [
    `${n} in ${place}`,
    `site:google.com/maps ${n} ${place}`,
    `${n} ${place} reviews`,
    `google maps ${n} ${place}`,
    `${n} near ${place}`,
    `${n} ${place} phone`,
    `${n} ${place} contact`,
    `${place} ${n}`,
    `site:yelp.com ${n} ${place}`,
    `site:facebook.com ${n} ${place}`,
    `site:instagram.com ${n} ${place}`,
    `site:yellowpages.com ${n} ${place}`,
    `${place} chamber of commerce ${n}`,
    `${place} business directory ${n}`,
    `"${n}" "${place}" website`,
    `"${n}" "${place}" official site`,
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of ordered) {
    const t = q.replace(/\s+/g, " ").trim();
    if (t.length <= 3 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
