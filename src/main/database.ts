const { DefaultEmbeddingFunction } = require("chromadb");
import { ChromaClient } from "chromadb";
import os from "os";

const client = new ChromaClient();
const modelName = "supabase/gte-small";
const embedFunc = new DefaultEmbeddingFunction({ model: modelName });

// Get file or collection ID based on file or directory path
// Replace all forbidden characters for specifying a collection ID
const getDbId = (filePath: string, type: string): string => {
  // Check if system is Windows or Linux
  const isWindows = os.platform() === "win32";
  // Replace all colons and backslashes for Windows file paths
  // Replace all slashes for Linux file paths
  const unsafeChars = isWindows ? /[\\/:]/g : /\//g;

  return filePath
    .replace(unsafeChars, "-")
    .replace(/\s+/g, "_")
    .replace(/^/, `${type}-`)
    .replace(/-+/g, "-");
};

export const upsertNote = async (notesDirectory: string, filePath: string, content: string) => {
  // const docId = filePath.replace("/", "file-").replaceAll("/", "-").replaceAll(" ", "_");
  // const dirId = notesDirectory.replace("/", "dir-").replaceAll("/", "-").replaceAll(" ", "_");
  const docId = getDbId(filePath, "file");
  const dirId = getDbId(notesDirectory, "dir");

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
