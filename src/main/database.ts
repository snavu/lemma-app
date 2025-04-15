const { ChromaClient, DefaultEmbeddingFunction } = require("chromadb");
// import { ChromaClient, DefaultEmbeddingFunction } from "chromadb";

const client = new ChromaClient();
const modelName = "supabase/gte-small";
const embedFunc = new DefaultEmbeddingFunction({ model: modelName });

export const upsertNote = async (notesDirectory: string, filePath: string, content: string) => {
  const docId = filePath.replace("/", "file-").replaceAll("/", "-").replaceAll(" ", "_");
  const dirId = notesDirectory.replace("/", "dir-").replaceAll("/", "-").replaceAll(" ", "_");

  // console.log(embedFunc);
  try {
    // Create or retrieve a collection pertaining to the notes directory
    const collection = await client.getOrCreateCollection({
      name: dirId,
      embeddingFunction: embedFunc,
    });

    // Add/update notes to vector database
    await collection.upsert({
      documents: [
        content,
      ],
      ids: [docId],
    });

    // Query the collection with an embedded query
    // const results = await collection.query({
    //   queryTexts: "I want some orange",
    //   nResults: 2,
    // });

    // Get document from database for debugging
    const results = await collection.get({
      ids: [docId],
    });

    console.log(results); // Output results
  } catch (error) {
    console.error("Error during ChromaDB operation:", error);
  }
};
