import React, { useEffect, useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import dynamic from "next/dynamic";
import NoteForm from "./NoteForm";
import SyncIndicator from "./SyncIndicator";
import NoteItem from "./NoteItem";
import { Button, Container } from "../styles/styled";
import {
  Note,
  getNotes,
  refreshNotes,
  submitNote,
  deleteNote,
  editNote,
} from "../utils/notes";

let isInitialized = false;

const OfflineIndicator = dynamic(() => import("./OfflineIndicator"), {
  ssr: false,
});

const NoteListContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 768px) {
    max-width: 95%;
    padding: 0.75rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FilterContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  @media (min-width: 768px) {
    width: auto;
  }
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #333;
`;

const TagSearchInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  max-width: 100%;
  font-size: 0.9rem;
  transition: border-color 0.2s;

  &:focus {
    border-color: #007bff;
    outline: none;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #444;
  cursor: pointer;

  &:hover {
    color: #007bff;
  }
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  accent-color: #007bff;
`;

const RefreshButton = styled(Button)`
  align-self: flex-end;
`;

const NoNotesMessage = styled.div`
  text-align: center;
  color: #666;
  font-size: 1rem;
  margin-top: 2rem;
`;

const NoteList: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [syncingNoteIds, setSyncingNoteIds] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState("");
  const [selectedSyncStatuses, setSelectedSyncStatuses] = useState<string[]>(
    []
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchNotes = async () => {
    if (isSyncing) {
      return;
    }
    setIsLoading(true);
    try {
      const fetchedNotes = await getNotes();
      setNotes((prevNotes) => {
        const prevMap = new Map(prevNotes.map((n) => [n.localId, n]));
        const updatedNotes = fetchedNotes.map((newNote: Note) => {
          const prevNote = prevMap.get(newNote.localId);

          return {
            ...newNote,
            localDeleteSynced:
              !prevNote?.localDeleteSynced ||
              !newNote.localDeleteSynced ||
              undefined,
            localEditSynced:
              !prevNote?.localEditSynced ||
              !newNote.localEditSynced ||
              undefined,
          };
        });
        return updatedNotes;
      });
      setSyncSuccess(true);
    } catch (error) {
      console.error("fetchNotes: Error fetching notes:", error);
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }
    setIsSyncing(true);
    setIsLoading(true);
    setSyncingNoteIds(new Set(notes.map((n) => n.localId!)));
    try {
      await refreshNotes();
      await fetchNotes();
      setSyncSuccess(true);
    } catch (error) {
      console.error("handleRefresh: Error refreshing notes:", error);
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      setSyncingNoteIds(new Set());
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            }
          );
          await registration.sync.register("sync-notes");
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }

        navigator.serviceWorker.addEventListener("message", (event) => {
          if (
            event.data &&
            event.data.type === "SYNC_NOTES" &&
            isMounted &&
            !isSyncing
          ) {
            fetchNotes();
          }
        });
      }

      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        if (isMounted) {
          setIsOnline(true);
          handleRefresh();
        }
      };
      const handleOffline = () => {
        if (isMounted) setIsOnline(false);
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if (isMounted) await fetchNotes();

      return () => {
        isMounted = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    };

    if (!isInitialized) {
      isInitialized = true;
      handleRefresh();
      initialize();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNoteSubmit = async (
    noteTitle: string,
    content?: string,
    tags?: string[]
  ) => {
    if (isSyncing) {
      return;
    }
    const note = {
      title: noteTitle,
      content,
      tags,
      localId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      version: 1,
      localDeleteSynced: true,
      localEditSynced: true,
    };
    setIsLoading(true);
    setSyncingNoteIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(note.localId);
      return newSet;
    });
    try {
      await submitNote(note);
      setNotes((prev) => [...prev, note]);
      if (navigator.onLine) await fetchNotes();
      setSyncSuccess(true);
    } catch (error) {
      console.error("handleNoteSubmit: Error submitting note:", error);
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
      setSyncingNoteIds((prev) => {
        const updated = new Set(prev);
        updated.delete(note.localId);
        return updated;
      });
    }
  };

  const handleEditNote = async (id: string, updates: Partial<Note>) => {
    if (isSyncing) {
      return;
    }
    setIsLoading(true);
    setSyncingNoteIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    try {
      const note = notes.find((n) => n.localId === id);
      if (!note) {
        throw new Error(`handleEditNote: Note with localId ${id} not found`);
      }

      const updatedNote = {
        ...note,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: (note.version || 0) + 1,
        synced: navigator.onLine,
        localEditSynced: navigator.onLine,
      };

      await editNote(id, updatedNote);
      setNotes((prevNotes) =>
        prevNotes.map((n) => (n.localId === id ? updatedNote : n))
      );

      setSyncSuccess(true);
      setEditingNote(null);
    } catch (error) {
      console.error(`handleEditNote: Error editing note ${id}:`, error);
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
      setSyncingNoteIds((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (isSyncing) {
      return;
    }
    setIsLoading(true);
    setSyncingNoteIds((prev) => new Set([...prev, id]));
    try {
      const note = notes.find((n) => n.localId === id);
      if (!note) {
        throw new Error(`handleDeleteNote: Note with localId ${id} not found`);
      }
      await deleteNote(note.localId);
      if (!navigator.onLine) {
        setNotes((prevNotes) =>
          prevNotes.map((n) =>
            n.localId === id
              ? {
                  ...n,
                  localDeleteSynced: false,
                  synced: false,
                  updatedAt: new Date().toISOString(),
                  version: (n.version || 0) + 1,
                }
              : n
          )
        );
      } else {
        setNotes((prevNotes) => prevNotes.filter((n) => n.localId !== id));
      }
      setSyncSuccess(true);
    } catch (error) {
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
      setSyncingNoteIds((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingNote(note);
  };

  const filteredNotes = useMemo(() => {
    let filtered = notes;
    if (tagFilter.trim()) {
      const searchTags = tagFilter
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag);
      filtered = filtered.filter((note) =>
        searchTags.every((tag) =>
          (note.tags || []).some((noteTag) =>
            noteTag.toLowerCase().includes(tag)
          )
        )
      );
    }
    if (selectedSyncStatuses.length > 0) {
      filtered = filtered.filter((note) =>
        selectedSyncStatuses.some((status) => {
          if (status === "synced") {
            return (
              note.synced &&
              note.localEditSynced !== false &&
              note.localDeleteSynced !== false
            );
          } else if (status === "pending-sync") {
            return !note.synced || note.localEditSynced === false;
          } else if (status === "pending-deletion") {
            return note.localDeleteSynced === false;
          }
          return false;
        })
      );
    }
    return filtered;
  }, [notes, tagFilter, selectedSyncStatuses]);

  const toggleSyncStatusFilter = useCallback((status: string) => {
    setSelectedSyncStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }, []);

  return (
    <NoteListContainer>
      <Header>
        <FilterContainer>
          <FilterTitle>Filter Notes</FilterTitle>
          <TagSearchInput
            type="text"
            placeholder="Search tags (comma-separated)..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          <CheckboxGroup>
            <CheckboxLabel>
              <Checkbox
                checked={selectedSyncStatuses.includes("synced")}
                onChange={() => toggleSyncStatusFilter("synced")}
              />
              Synced
            </CheckboxLabel>
            <CheckboxLabel>
              <Checkbox
                checked={selectedSyncStatuses.includes("pending-sync")}
                onChange={() => toggleSyncStatusFilter("pending-sync")}
              />
              Pending Sync
            </CheckboxLabel>
            <CheckboxLabel>
              <Checkbox
                checked={selectedSyncStatuses.includes("pending-deletion")}
                onChange={() => toggleSyncStatusFilter("pending-deletion")}
              />
              Pending Deletion
            </CheckboxLabel>
          </CheckboxGroup>
        </FilterContainer>
      </Header>
      <NoteForm
        onNoteSubmit={handleNoteSubmit}
        onEdit={handleEditNote}
        editingNote={editingNote}
        onCancel={() => setEditingNote(null)}
      />
      <RefreshButton onClick={handleRefresh} disabled={isLoading || !isOnline}>
        {isLoading ? "Refreshing..." : "Refresh Notes"}
      </RefreshButton>
      {notes.length > 0 ? (
        filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => (
            <NoteItem
              key={note.localId ? `${note.localId}-${index}` : `index-${index}`}
              note={note}
              onEdit={handleStartEdit}
              onDelete={handleDeleteNote}
              isNoteSyncing={syncingNoteIds.has(note.localId!)}
            />
          ))
        ) : (
          <NoNotesMessage>
            No notes match the selected filters. Try adjusting your tag search
            or sync filters.
          </NoNotesMessage>
        )
      ) : (
        <NoNotesMessage>
          No notes available. Create a new note to get started.
        </NoNotesMessage>
      )}
      <OfflineIndicator onOnline={handleRefresh} />
      <SyncIndicator isSyncing={isLoading} syncSuccess={syncSuccess} />
    </NoteListContainer>
  );
};

export default NoteList;
