import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faSync,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Note } from "../utils/notes";

const NoteItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto 1rem;
  background-color: #fff;
  box-sizing: border-box;

  @media (max-width: 768px) {
    max-width: 95%;
    padding: 0.75rem;
  }
`;

const NoteContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const NoteTitle = styled.h3<{ isDeleted: boolean }>`
  margin: 0;
  font-size: 1.2rem;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: ${({ isDeleted }) => (isDeleted ? "line-through" : "none")};

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const NoteText = styled.p<{ isDeleted: boolean }>`
  margin: 0.5rem 0;
  font-size: 1rem;
  color: #333;
  text-decoration: ${({ isDeleted }) => (isDeleted ? "line-through" : "none")};

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const NoteTags = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Tag = styled.span<{ isDeleted: boolean }>`
  background-color: #e0e0e0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  text-decoration: ${({ isDeleted }) => (isDeleted ? "line-through" : "none")};

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const NoteActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #007bff;
  padding: 0.2rem;

  &:hover {
    color: #0056b3;
  }

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
`;

const SyncIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #888;
  vertical-align: middle;

  @media (max-width: 768px) {
    width: 14px;
    height: 14px;
  }
`;

interface NoteItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  isNoteSyncing: boolean;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  onEdit,
  onDelete,
  isNoteSyncing,
}) => {
  const isPendingSync =
    note._id === undefined ||
    !note.synced ||
    note.localDeleteSynced === false ||
    note.localEditSynced === false;
  const isDeleted = note.localDeleteSynced === false;

  return (
    <NoteItemContainer>
      <NoteContent>
        <NoteTitle isDeleted={isDeleted}>
          {note.title}
          {isPendingSync ? (
            <SyncIcon>
              <FontAwesomeIcon
                icon={isNoteSyncing ? faSync : faClock}
                spin={isNoteSyncing}
              />
            </SyncIcon>
          ) : null}
        </NoteTitle>
      </NoteContent>
      {note.content && (
        <NoteText isDeleted={isDeleted}>{note.content}</NoteText>
      )}
      {note.tags && note.tags.length > 0 && (
        <NoteTags>
          {note.tags.map((tag) => (
            <Tag key={tag} isDeleted={isDeleted}>
              {tag}
            </Tag>
          ))}
        </NoteTags>
      )}
      <NoteActions>
        <ActionButton onClick={() => onEdit(note)} disabled={isDeleted}>
          <FontAwesomeIcon icon={faEdit} />
        </ActionButton>
        <ActionButton
          onClick={() => onDelete(note.localId!)}
          disabled={isDeleted}
        >
          <FontAwesomeIcon icon={faTrash} />
        </ActionButton>
      </NoteActions>
    </NoteItemContainer>
  );
};

export default NoteItem;
