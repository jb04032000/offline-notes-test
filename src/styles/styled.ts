import styled from 'styled-components';
import theme from './theme';

export const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
`;

export const Heading = styled.h1`
  font-size: 24px;
  color: ${theme.colors.primary};
  margin-bottom: 20px;
`;

export const Button = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0050cc;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.colors.primary};
    outline: none;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
    padding: 6px;
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.colors.primary};
    outline: none;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
    padding: 6px;
    min-height: 80px;
  }
`;