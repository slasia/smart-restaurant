import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RAG_EMBEDDING_MODEL } from "../config/aiConfig";

export async function createVectorStore(documents: Document[]) {
  const embeddings = new OpenAIEmbeddings({
    model: RAG_EMBEDDING_MODEL,
  });

  const vectorStore = new MemoryVectorStore(embeddings);

  try {
    await vectorStore.addDocuments(documents);
  } catch (error) {
    console.error(error);
  }

  return vectorStore;
}
