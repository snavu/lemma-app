const { ChromaClient } = require("chromadb");

const client = new ChromaClient();

export const upsertNote = async (notesDirectory: string, filePath: string, content: string) => {
  const docId = filePath.replace("/", "file-").replaceAll("/", "-").replaceAll(" ", "_");
  const dirId = notesDirectory.replace("/", "dir-").replaceAll("/", "-").replaceAll(" ", "_");

  try {
    // Create or retrieve a collection pertaining to the notes directory
    const collection = await client.getOrCreateCollection({
      name: dirId,
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
