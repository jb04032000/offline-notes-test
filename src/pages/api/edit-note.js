import db from "../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Allow", ["PUT"]);

  if (req.method !== "PUT") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { id } = req.query;
  const { title, content, tags } = req.body;

  if (!id || !title) {
    console.error("Missing required fields:", { id, title });
    return res.status(400).json({ error: "ID and title are required" });
  }

  try {
    const note = db.prepare("SELECT version FROM notes WHERE id = ?").get(id);
    if (!note) {
      console.error("Note not found:", { id });
      return res.status(404).json({ error: "Note not found" });
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `
      UPDATE notes
      SET title = ?,
          content = ?,
          tags = ?,
          updatedAt = ?,
          lastSyncedAt = ?,
          synced = ?,
          version = ?
      WHERE id = ?
    `
      )
      .run(
        title,
        content || null,
        tags ? JSON.stringify(tags) : "[]",
        now,
        now,
        1,
        note.version + 1,
        parseInt(id, 10)
      );

    if (result.changes === 0) {
      console.error("No changes made, note not found:", { id });
      return res.status(404).json({ error: "Note not found" });
    }

    res.status(200).json({ message: "Note updated successfully" });
  } catch (error) {
    console.error("Error updating note:", error);
    res
      .status(500)
      .json({ error: "Failed to update note", details: error.message });
  }
}
