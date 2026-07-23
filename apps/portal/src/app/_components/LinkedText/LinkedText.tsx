const safeUriSchemes = new Set(["http:", "https:", "mailto:", "tel:"]);
const linkPattern = /\b(?:https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|tel:[^\s<>"']+)/gi;

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return safeUriSchemes.has(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function trimTrailingPunctuation(value: string) {
  const match = value.match(/^(.*?)([),.;:!?]+)?$/);
  return {
    hrefText: match?.[1] ?? value,
    trailing: match?.[2] ?? "",
  };
}

export function LinkedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(linkPattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const { hrefText, trailing } = trimTrailingPunctuation(raw);
    const href = safeHref(hrefText);
    if (!href) continue;

    if (index > cursor) parts.push(text.slice(cursor, index));
    const opensInNewTab = href.startsWith("http://") || href.startsWith("https://");
    parts.push(
      <a
        key={`${href}-${index}`}
        href={href}
        target={opensInNewTab ? "_blank" : undefined}
        rel={opensInNewTab ? "noopener noreferrer" : undefined}
        aria-label={opensInNewTab ? `${hrefText} opens in a new tab` : undefined}
        className="font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-950"
      >
        {hrefText}
      </a>,
    );
    if (trailing) parts.push(trailing);
    cursor = index + raw.length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
