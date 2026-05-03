export function splitDiscordChunks(text: string, maxLength: number = 1900): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split at a newline to keep formatting clean
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.7) {
      // No good newline found, split at space
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1) {
      // No space either, hard split
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export async function sendDiscordWebhook(url: string, content: string) {
  const chunks = splitDiscordChunks(content);
  for (let i = 0; i < chunks.length; i++) {
    const header = chunks.length > 1
      ? `# Systemics Weekly Post-Mortem [${i + 1}/${chunks.length}]\n\n`
      : `# Systemics Weekly Post-Mortem\n\n`;
    const part = header + chunks[i];

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: part }),
    });

    // Small delay between messages to respect rate limits
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}