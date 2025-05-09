import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const notes = db
        .prepare("SELECT * FROM notes ORDER BY createdAt DESC")
        .all()
        .map((note) => ({
          ...note,
          tags: JSON.parse(note.tags),
          synced: Boolean(note.synced),
        }));
      res.status(200).json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
