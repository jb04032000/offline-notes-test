import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      const result = db.prepare("DELETE FROM notes WHERE id = ?").run(id);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Note not found" });
      }

      res.status(200).json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
