import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent, SystemMessage } from "langchain";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

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
      description: "Retrieve information related to a query.",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  const tools = [retrieve];
  const systemPrompt = new SystemMessage(
    "You have access to a tool that retrieves context from a document with restaurants from tandil. " +
    "Use the tool to help answer user queries. if you cant found an option, please return false"
  );

  const agent = createAgent({ model: "gpt-5", tools, systemPrompt });
  
  return agent;
}

