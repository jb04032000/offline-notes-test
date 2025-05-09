import db from "../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Allow", ["POST"]);

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { title, content, tags, localId, createdAt } = req.body;

  if (!title || !createdAt) {
    console.error("Missing required fields:", { title, createdAt });
    return res.status(400).json({ error: "Title and createdAt are required" });
  }

  try {
    const now = new Date().toISOString();
    const noteCreatedAt = createdAt || now;
    const result = db
      .prepare(
        `
      INSERT INTO notes (title, content, tags, createdAt, updatedAt, lastSyncedAt, synced, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        title,
        content || null,
        tags ? JSON.stringify(tags) : "[]",
        noteCreatedAt,
        now,
        now,
        1,
        1
      );

    res.status(201).json({ insertedId: result.lastInsertRowid });
  } catch (error) {
    console.error("Error saving note:", error);
    res
      .status(500)
      .json({ error: "Failed to save note", details: error.message });
  }
}
