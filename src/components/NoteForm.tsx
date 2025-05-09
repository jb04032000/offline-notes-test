import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { Button, Input, Textarea } from "../styles/styled";
import { Note } from "../utils/notes";

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: #fff;
  box-sizing: border-box;

  @media (max-width: 768px) {
    max-width: 95%;
    padding: 0.75rem;
  }
`;

const Label = styled.label`
  font-size: 1rem;
  color: #333;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const Warning = styled.p`
  color: #ff4136;
  font-size: 0.9rem;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

interface NoteFormProps {
  onNoteSubmit: (title: string, content?: string, tags?: string[]) => void;
  onEdit: (id: string, updates: Partial<Note>) => void;
  editingNote: Note | null;
  onCancel: () => void;
}

const NoteForm: React.FC<NoteFormProps> = ({
  onNoteSubmit,
  onEdit,
  editingNote,
  onCancel,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [titleWarning, setTitleWarning] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || "");
      setContent(editingNote.content || "");
      setTags(editingNote.tags ? editingNote.tags.join(", ") : "");
    } else {
      resetForm();
    }
  }, [editingNote]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags("");
    setTitleWarning("");
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleWarning("Title is required");
      return;
    }

    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    if (editingNote && editingNote.localId) {
      onEdit(editingNote.localId, {
        title: title.trim(),
        content: content.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      });
    } else {
      onNoteSubmit(
        title.trim(),
        content.trim() || undefined,
        tagArray.length > 0 ? tagArray : undefined
      );
    }

    resetForm();
  };

  return (
    <FormContainer onSubmit={handleSubmit} ref={formRef}>
      <Label>
        Title
        <Input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleWarning("");
          }}
          placeholder="Enter note title"
        />
        {titleWarning && <Warning>{titleWarning}</Warning>}
      </Label>
      <Label>
        Content (optional)
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter note content"
        />
      </Label>
      <Label>
        Tags (optional, comma-separated)
        <Input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., work, urgent"
        />
      </Label>
      <ButtonContainer>
        {editingNote && (
          <Button
            type="button"
            onClick={() => {
              onCancel();
              resetForm();
            }}
          >
            Cancel
          </Button>
        )}
        <Button type="submit">{editingNote ? "Update" : "Submit"}</Button>
      </ButtonContainer>
    </FormContainer>
  );
};

export default NoteForm;
