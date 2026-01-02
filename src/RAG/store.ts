import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

export async function createVectorStore(documents: Document[]) {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large",
  });

  const vectorStore = new MemoryVectorStore(embeddings);
  
  try {
    await vectorStore.addDocuments(documents);
  } catch (error) {
    console.error(error);
  }
  
  return vectorStore;
}

