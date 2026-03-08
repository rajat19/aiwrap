export async function* readSseData(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let splitIndex = buffer.indexOf("\n\n");
    while (splitIndex !== -1) {
      const chunk = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + 2);

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data) yield data;
      }

      splitIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data) yield data;
    }
  }
}

export async function* readNdjson(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) yield line;
      newlineIndex = buffer.indexOf("\n");
    }
  }

  if (buffer.trim()) {
    yield buffer.trim();
  }
}
