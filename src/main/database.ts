const { DefaultEmbeddingFunction } = require("chromadb");
import { ChromaClient, Collection, GetResponse } from "chromadb";
import os from "os";

interface Note {
  id: string,
  filePath: string,
  content: string
}

const defaultModelName = "supabase/gte-small";
const primaryCollection = "notes";

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

// Returns a string that represents the HTML element of the tag
const getTagElement = (tag: string): string => {
  return "#" + tag;
}

// An instance that connects to a collection in the vector database
export class DbClient {
  private collection: Collection | null;
  private collectionName: string;
  private embedFunc: typeof DefaultEmbeddingFunction;
  private client: ChromaClient;

  constructor(collection: string = primaryCollection, model: string = defaultModelName) {
    this.client = new ChromaClient();
    this.embedFunc = new DefaultEmbeddingFunction({ model: model });
    this.collection = null;
    this.collectionName = collection;
  }

  // Initializes connection to the collection. Will be done only once
  private initCollection = async (collection: string): Promise<void> => {
    if (!this.collection) {
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: collection,
          embeddingFunction: this.embedFunc,
        });
      } catch (error) {
        console.error("Error during ChromaDB initialization:", error);
      }
    }
  };

  // Add/update embeddings for one notes or multiple notes
  public upsertNotes = async (notesDirectory: string, filePath: string | string[], content: string | string[]) => {
    let docIds: string[];
    let notesContent: string[];
    let metadatas: any[];

    // Mismatched parameter types
    if (Array.isArray(filePath) && !Array.isArray(content) || !Array.isArray(filePath) && Array.isArray(content)) {
      throw TypeError("upsertNote(): filePath and content have different types.");
    }
    // If inserting multiple notes
    if (Array.isArray(filePath) && Array.isArray(content)) {
      // Mismatched length of parameters
      if (filePath.length !== content.length) {
        throw Error("upsertNote(): filePath and content must have the same size.");
      }

      docIds = filePath.map((value) => { return getId(value, "file") });
      notesContent = content.map((value) => { return value.toLowerCase() });
      metadatas = filePath.map(((value) => ({ directory: notesDirectory, filePath: value })));
    } else {
      // If inserting individual note
      docIds = [getId(String(filePath), "file")];
      notesContent = [String(content).toLowerCase()];
      metadatas = [{
        directory: notesDirectory,
        filePath: filePath
      }];
    }

    try {
      await this.initCollection(this.collectionName);
      // Add/update notes to vector database
      await this.collection.upsert({
        ids: docIds,
        documents: notesContent,
        metadatas: metadatas,
      });

      // Get document from database for debugging
      // const results = await this.queryNotes(notesDirectory, content);
      console.log("Document successfully upserted:", filePath); // Output results
    } catch (error) {
      console.error("Error during ChromaDB operation:", error);
    }
  };

  // Deletes the document of the specified note in the directory.
  // If no specific document is specified, deletes all documents of each note in the directory
  public deleteNotes = async (notesDirectory: string, filePath?: string) => {
    try {
      await this.initCollection(this.collectionName);
      if (filePath) {
        // Delete individual note from vector database
        await this.collection.delete({
          ids: [getId(filePath, "file")],
          where: {"directory": notesDirectory}
        });
      } else {
        // Delete all notes from vector database
        await this.collection.delete({
          where: {"directory": notesDirectory}
        });
      }
    } catch (error) {
      console.error("Error during ChromaDB operation:", error);
    }
  };

  // Return a list of notes that matches the search query.
  // If no search query given, return all notes in the directory
  public queryNotes = async (notesDirectory: string, searchQuery?: string): Promise<Note[]> => {
    let data: GetResponse;
    try {
      await this.initCollection(this.collectionName);
      
      if (searchQuery) {
        // Query notes by search query
        data = await this.collection.get({ 
          where: {"directory": notesDirectory},
          whereDocument: {"$contains": searchQuery.toLowerCase()}
        });
      } else {
        // Query all notes
        data = await this.collection.get({ 
          where: {"directory": notesDirectory},
        });
      }
    } catch (error) {
      console.error("Error during ChromaDB operation:", error);
    }

    const results = data.ids.map((id, index) => ({
      id: id,
      filePath: String(data.metadatas[index].filePath),
      content: data.documents[index],
    }));

    return results;
  };

  // Return a list of notes that contains the tag specified in the search query
  public queryNotesByTag = async (notesDirectory: string, searchQuery: string): Promise<Note[]> => {
    return this.queryNotes(notesDirectory, getTagElement(searchQuery));
  }
}
