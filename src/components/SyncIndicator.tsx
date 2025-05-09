import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

const SyncContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    top: 0.75rem;
    right: 0.75rem;
  }
`;

const SyncIcon = styled.div<{
  isSyncing: boolean;
  syncSuccess: boolean | null;
}>`
  font-size: 28px;
  color: ${({ isSyncing, syncSuccess }) =>
    isSyncing
      ? "#888"
      : syncSuccess === true
      ? "#2ECC40"
      : syncSuccess === false
      ? "#FF4136"
      : "#888"};
  transition: color 0.3s;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

interface SyncIndicatorProps {
  isSyncing: boolean;
  syncSuccess: boolean | null;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  isSyncing,
  syncSuccess,
}) => {
  return (
    <SyncContainer
      title={
        isSyncing
          ? "Syncing notes..."
          : syncSuccess === true
          ? "Sync successful"
          : syncSuccess === false
          ? "Sync failed"
          : "Idle"
      }
    >
      <SyncIcon isSyncing={isSyncing} syncSuccess={syncSuccess}>
        <FontAwesomeIcon icon={faSync} spin={isSyncing} />
      </SyncIcon>
    </SyncContainer>
  );
};

export default SyncIndicator;