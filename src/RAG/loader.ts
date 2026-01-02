import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

export async function loadDocuments() {
  const loader = new CSVLoader("./src/rag/document/restaurants.csv");
  const docs = await loader.load();
  console.log(`Total characters: ${docs[0].pageContent.length}`);
  return docs;
}
