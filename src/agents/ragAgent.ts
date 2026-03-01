import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent, SystemMessage } from "langchain";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import {
  RAG_AGENT_MODEL,
  RAG_SYSTEM_PROMPT,
  RAG_TOOL_DESCRIPTION,
} from "../config/aiConfig";

export async function createRAGAgent(vectorStore: MemoryVectorStore) {
  const retrieveSchema = z.object({ query: z.string() });

  const retrieve = tool(
    async ({ query }) => {
      const retrievedDocs = await vectorStore.similaritySearch(query, 2);
      const serialized = retrievedDocs
        .map(
          (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
        )
        .join("\n");
      return [serialized, retrievedDocs];
    },
    {
      name: "retrieve",
      description: RAG_TOOL_DESCRIPTION,
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  const tools = [retrieve];
  const systemPrompt = new SystemMessage(RAG_SYSTEM_PROMPT);

  const agent = createAgent({ model: RAG_AGENT_MODEL, tools, systemPrompt });

  return agent;
}
