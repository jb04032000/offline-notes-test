import axios from 'axios';
import {
  storeOfflineNote,
  getOfflineNote,
  getOfflineNotes,
  deleteOfflineNote,
  editOfflineNote
} from '../../public/indexeddb';

export interface Note {
  _id?: number;
  localId?: string;
  localDeleteSynced?: boolean;
  localEditSynced?: boolean;
  title: string;
  content?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  lastSyncedAt?: string;
  synced?: boolean;
  version?: number;
}

function createServerNote(note: Note): Partial<Note> {
  return {
    title: note.title,
    content: note.content,
    tags: note.tags || [],
    localId: note.localId,
    createdAt: note.createdAt,
  };
}

export function createNote(
  noteTitle: string,
  content?: string,
  tags?: string[]
): Note {
  const now = new Date().toISOString();
  return {
    title: noteTitle,
    content,
    tags: tags || [],
    localId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: undefined,
    synced: false,
    version: 1,
  };
}

export async function submitNote(note: Note) {
  await storeOfflineNote(note);
  if (navigator.onLine) {
    try {
      const response = await fetch("/api/save-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createServerNote(note)),
      });
      const data = await response.json();
      if (response.ok) {
        note._id = data.insertedId;
        note.synced = true;
        note.lastSyncedAt = new Date().toISOString();
        await editOfflineNote(note);
      } else {
        console.error("Failed to submit note:", data.error, data.details);
        throw new Error(data.error || "Failed to submit note");
      }
    } catch (error) {
      console.error("Error submitting note:", error);
    }
  } else {
    console.log("Offline: Note stored locally, will sync when online");
  }
}

export async function deleteNote(noteId: string) {
  try {
    const note = await getOfflineNote(noteId);
    if (note) {
      if (note._id === undefined) {
        await deleteOfflineNote(noteId);
      } else {
        if (navigator.onLine) {
          try {
            await axios.delete(`/api/delete-note?id=${note._id}`);
            await deleteOfflineNote(noteId);
          } catch (error) {
            console.error("Error deleting note:", error);
            note.localDeleteSynced = false;
            note.lastSyncedAt = new Date().toISOString();
            await editOfflineNote(note);
          }
        } else {
          note.localDeleteSynced = false;
          note.lastSyncedAt = new Date().toISOString();
          note.updatedAt = new Date().toISOString();
          await editOfflineNote(note);
        }
      }
    }
  } catch (error) {
    console.error("Failed to delete note:", error);
  }
}

export async function editNote(noteId: string, updates: Partial<Note>) {
  try {
    const note = await getOfflineNote(noteId);
    if (note) {
      const updatedNote = {
        ...note,
        title: updates.title ?? note.title,
        content: updates.content ?? note.content,
        tags: updates.tags ?? note.tags,
        updatedAt: new Date().toISOString(),
        version: (note.version || 1) + 1,
        localEditSynced: note._id ? false : undefined,
      };
      await editOfflineNote(updatedNote);
      if (note._id && navigator.onLine) {
        try {
          const response = await axios.put(`/api/edit-note?id=${note._id}`, {
            title: updatedNote.title,
            content: updatedNote.content,
            tags: updatedNote.tags,
          });
          updatedNote.localEditSynced = undefined;
          updatedNote.synced = true;
          updatedNote.lastSyncedAt = new Date().toISOString();
          await editOfflineNote(updatedNote);
        } catch (error) {
          console.error("Error editing note:", error);
          updatedNote.localEditSynced = false;
          await editOfflineNote(updatedNote);
        }
      }
    }
  } catch (error) {
    console.error("Failed to edit note:", error);
  }
}

export async function getNotes() {
  const notes = await getOfflineNotes();
  notes.sort(
    (a: Note, b: Note) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return notes;
}

export async function refreshNotes() {
  if (navigator.onLine) {
    try {
      // Step 1: Get local notes
      const localNotes = await getOfflineNotes();

      // Step 2: Fetch server notes
      let serverNotes: Note[] = [];
      try {
        const response = await axios.get("/api/notes");
        serverNotes = response.data.map((note: Note) => ({
          ...note,
          _id: note.id,
          tags: Array.isArray(note.tags)
            ? note.tags
            : note.tags
            ? JSON.parse(note.tags)
            : [],
        }));
      } catch (error) {
        console.error("Error fetching server notes:", error);
        return;
      }

      // Step 3: Detect conflicts and sync notes
      for (const localNote of localNotes) {
        // Find matching server note
        const serverNote = localNote._id
          ? serverNotes.find((sn) => sn._id === localNote._id)
          : serverNotes.find((sn) => sn.localId === localNote.localId);

        // Handle conflicts for edited notes
        if (
          localNote._id &&
          (localNote.localEditSynced === false || !localNote.synced)
        ) {
          if (serverNote) {
            const conflictFields: string[] = [];
            if (localNote.title !== serverNote.title) {
              conflictFields.push(
                `title (local: "${localNote.title}", server: "${serverNote.title}")`
              );
            }
            if (localNote.content !== serverNote.content) {
              conflictFields.push(
                `content (local: "${localNote.content || ""}", server: "${
                  serverNote.content || ""
                }")`
              );
            }
            if (
              JSON.stringify(localNote.tags || []) !==
              JSON.stringify(serverNote.tags || [])
            ) {
              conflictFields.push(
                `tags (local: ${JSON.stringify(
                  localNote.tags || []
                )}, server: ${JSON.stringify(serverNote.tags || [])})`
              );
            }
            if (localNote.version !== serverNote.version) {
              conflictFields.push(
                `version (local: ${localNote.version}, server: ${serverNote.version})`
              );
            }
            if (localNote.updatedAt !== serverNote.updatedAt) {
              conflictFields.push(
                `updatedAt (local: "${localNote.updatedAt}", server: "${serverNote.updatedAt}")`
              );
            }

            if (conflictFields.length > 0) {
              if (localNote.updatedAt && serverNote.updatedAt) {
                if (
                  new Date(localNote.updatedAt) > new Date(serverNote.updatedAt)
                ) {
                  try {
                    await axios.put(`/api/edit-note?id=${localNote._id}`, {
                      title: localNote.title,
                      content: localNote.content,
                      tags: localNote.tags,
                    });
                    const updatedNote = {
                      ...localNote,
                      localEditSynced: undefined,
                      synced: true,
                      lastSyncedAt: new Date().toISOString(),
                    };
                    await editOfflineNote(updatedNote);
                  } catch (error) {
                    console.error(
                      `Error syncing local edit for note ${localNote.localId}:`,
                      error
                    );
                  }
                } else {
                  const updatedNote = {
                    ...localNote,
                    title: serverNote.title,
                    content: serverNote.content,
                    tags: serverNote.tags,
                    updatedAt: serverNote.updatedAt,
                    version: serverNote.version,
                    localEditSynced: undefined,
                    synced: true,
                    lastSyncedAt: serverNote.lastSyncedAt,
                  };
                  await editOfflineNote(updatedNote);
                }
              }
              continue;
            }
          }
          // No server note: Sync edit
          try {
            await axios.put(`/api/edit-note?id=${localNote._id}`, {
              title: localNote.title,
              content: localNote.content,
              tags: localNote.tags,
            });
            const updatedNote = {
              ...localNote,
              localEditSynced: undefined,
              synced: true,
              lastSyncedAt: new Date().toISOString(),
            };
            await editOfflineNote(updatedNote);
          } catch (error) {
            console.error(
              `Error syncing local edit for note ${localNote.localId}:`,
              error
            );
          }
          continue;
        }

        // Handle conflicts for deleted notes
        if (localNote.localDeleteSynced === false) {
          if (serverNote) {
            console.warn(
              `Conflict detected for deletion of note localId=${localNote.localId}, _id=${localNote._id}: Note exists on server with title="${serverNote.title}"`
            );
            // Resolution: Prefer most recent updatedAt
            if (localNote.updatedAt && serverNote.updatedAt) {
              if (
                new Date(localNote.updatedAt) > new Date(serverNote.updatedAt)
              ) {
                try {
                  await axios.delete(`/api/delete-note?id=${localNote._id}`);
                  await deleteOfflineNote(localNote.localId);
                } catch (error) {
                  console.error(
                    `Error syncing deletion for note ${localNote.localId}:`,
                    error
                  );
                }
              } else {
                const updatedNote = {
                  ...localNote,
                  title: serverNote.title,
                  content: serverNote.content,
                  tags: serverNote.tags,
                  updatedAt: serverNote.updatedAt,
                  version: serverNote.version,
                  localDeleteSynced: undefined,
                  synced: true,
                  lastSyncedAt: serverNote.lastSyncedAt,
                };
                await editOfflineNote(updatedNote);
              }
            }
            continue;
          } else {
            // No conflict: Sync deletion
            try {
              await axios.delete(`/api/delete-note?id=${localNote._id}`);
              await deleteOfflineNote(localNote.localId);
            } catch (error) {
              console.error(
                `Error syncing deletion for note ${localNote.localId}:`,
                error
              );
            }
            continue;
          }
        }

        // Sync new notes
        if (
          localNote._id === undefined &&
          localNote.localDeleteSynced !== false &&
          localNote.localId &&
          localNote.title
        ) {
          if (serverNote && serverNote.localId === localNote.localId) {
            // Resolution: Prefer server note if newer, else push local
            if (localNote.updatedAt && serverNote.updatedAt) {
              if (
                new Date(localNote.updatedAt) > new Date(serverNote.updatedAt)
              ) {
                try {
                  const serverNoteData = createServerNote(localNote);
                  const response = await fetch("/api/save-note", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(serverNoteData),
                  });
                  const data = await response.json();
                  if (response.ok) {
                    const updatedNote = {
                      ...localNote,
                      _id: data.insertedId,
                      synced: true,
                      lastSyncedAt: new Date().toISOString(),
                      version: data.version || localNote.version,
                    };
                    await editOfflineNote(updatedNote);
                  } else {
                    console.error(
                      `Failed to sync note ${localNote.localId}:`,
                      data.error
                    );
                  }
                } catch (error) {
                  console.error(
                    `Error syncing note ${localNote.localId}:`,
                    error
                  );
                }
              } else {
                const updatedNote = {
                  ...localNote,
                  _id: serverNote._id,
                  title: serverNote.title,
                  content: serverNote.content,
                  tags: serverNote.tags,
                  updatedAt: serverNote.updatedAt,
                  version: serverNote.version,
                  synced: true,
                  lastSyncedAt: serverNote.lastSyncedAt,
                };
                await editOfflineNote(updatedNote);
              }
            }
            continue;
          }
          try {
            const serverNoteData = createServerNote(localNote);
            const response = await fetch("/api/save-note", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(serverNoteData),
            });
            const data = await response.json();
            if (response.ok) {
              const updatedNote = {
                ...localNote,
                _id: data.insertedId,
                synced: true,
                lastSyncedAt: new Date().toISOString(),
                version: data.version || localNote.version,
              };
              await editOfflineNote(updatedNote);
            } else {
              console.error(
                `Failed to sync note ${localNote.localId}:`,
                data.error
              );
            }
          } catch (error) {
            console.error(`Error syncing note ${localNote.localId}:`, error);
          }
        }
      }

      // Step 4: Pull server notes not in local (new server notes or missed updates)
      for (const serverNote of serverNotes) {
        const localNote = localNotes.find(
          (ln: any) => ln._id === serverNote._id
        );
        if (!localNote) {
          const newLocalNote = {
            ...serverNote,
            localId: serverNote.localId || crypto.randomUUID(),
            synced: true,
            localDeleteSynced: undefined,
            localEditSynced: undefined,
          };
          await storeOfflineNote(newLocalNote);
        } else if (
          localNote.synced &&
          localNote.localEditSynced !== false &&
          localNote.localDeleteSynced !== false
        ) {
          const updatedNote = {
            ...localNote,
            title: serverNote.title,
            content: serverNote.content,
            tags: serverNote.tags,
            updatedAt: serverNote.updatedAt,
            version: serverNote.version,
            lastSyncedAt: serverNote.lastSyncedAt,
          };
          await editOfflineNote(updatedNote);
        }
      }

      // Step 5: Clean up local notes not on server
      for (const localNote of localNotes) {
        if (
          localNote._id &&
          !serverNotes.some((sn) => sn._id === localNote._id) &&
          localNote.localDeleteSynced !== false
        ) {
          console.log("Deleting local note not found on server:", {
            id: localNote._id,
          });
          await deleteOfflineNote(localNote.localId);
        }
      }
    } catch (error) {
      console.error("Error in refreshNotes:", error);
    }
  } else {
    console.log("Cannot refresh notes: offline");
  }
}

