function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const JSON_TOKEN_REGEX =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function highlightJson(text: string): string {
  return escapeHtml(text).replace(JSON_TOKEN_REGEX, (match) => {
    if (match.startsWith('"')) {
      return `<span class="${/:\s*$/.test(match) ? 'json-key' : 'json-string'}">${match}</span>`;
    }
    if (match === 'true' || match === 'false') {
      return `<span class="json-boolean">${match}</span>`;
    }
    if (match === 'null') {
      return `<span class="json-null">${match}</span>`;
    }
    return `<span class="json-number">${match}</span>`;
  });
}

export function formatJson(raw: string): string {
  return JSON.stringify(JSON.parse(raw), null, 2);
}

export function formatXml(raw: string): string {
  const collapsed = raw.replace(/>\s*</g, '><').trim();
  if (!collapsed.startsWith('<')) {
    throw new Error('Not XML');
  }

  const withBreaks = collapsed.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
  const lines = withBreaks.split('\n');

  let indent = 0;
  const pad = '  ';
  const out: string[] = [];

  for (const line of lines) {
    const isClosingTag = /^<\//.test(line);
    const isSelfClosing = /\/>$/.test(line) || /^<\?/.test(line) || /^<!/.test(line);
    const isOpeningTag = /^<[^/!?]/.test(line) && !isSelfClosing;
    const opensAndClosesOnSameLine = /^<[^/!?][^>]*>.*<\/[^>]+>$/.test(line);

    if (isClosingTag) {
      indent = Math.max(indent - 1, 0);
    }

    out.push(pad.repeat(indent) + line);

    if (isOpeningTag && !opensAndClosesOnSameLine) {
      indent += 1;
    }
  }

  return out.join('\n');
}
