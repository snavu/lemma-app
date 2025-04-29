const { DefaultEmbeddingFunction } = require("chromadb");
import { ChromaClient } from "chromadb";
import os from "os";

interface Note {
  id: string,
  content: string,
  hashtags: string[]
}

const client = new ChromaClient();
const modelName = "supabase/gte-small";
const embedFunc = new DefaultEmbeddingFunction({ model: modelName });

// Get file or collection ID based on file or directory path
// Replace all forbidden characters for specifying a collection ID
const getId = (filePath: string, type: string): string => {
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

// Add/update embeddings for the specified note
export const upsertNote = async (notesDirectory: string, filePath: string, content: string, updateHashtags: string[]) => {
  const docId = getId(filePath, "file");
  const dirId = getId(notesDirectory, "dir");
  console.log("Updated hashtags:", updateHashtags); // Debugging line
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
      metadatas: [{ 
        hashtags: updateHashtags.join(','),
        type: "file",
      }],
      ids: [docId],
    });

    // Get document from database for debugging
    // const results = await collection.get({
    //   ids: [docId],
    // });
    // console.log("Document successfully upserted:", results); // Output results
    const results = await queryAllNotes(notesDirectory);
    console.log("Documents in", notesDirectory, "\n", results);
  } catch (error) {
    console.error("Error during ChromaDB operation:", error);
  }
};

// Queries all notes in the collection (directory)
export const queryAllNotes = async (notesDirectory: string): Promise<Note[]> => {
  const dirId = getId(notesDirectory, "dir");

  const collection = await client.getOrCreateCollection({
    name: dirId,
    embeddingFunction: embedFunc,
  });

  const data = await collection.get({where: {"type": "file"}});

  // Transform the queried results into a list of notes
  const results = data.ids.map((id, index) => ({
    id: id,
    content: data.documents[index],
    hashtags: String(data.metadatas[index].hashtags).split(','),
  }));

  return results;
}