import { MultiAiClient } from "../dist/index.js";

const client = new MultiAiClient();

const response = await client.generate({
  context: "User asks for a short summary",
  prompt: "Explain event-driven architecture in 5 lines.",
  outputJson: {
    title: "string",
    bullets: ["string"]
  }
});

console.log(response.text);
