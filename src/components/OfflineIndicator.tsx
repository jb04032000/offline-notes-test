import { useEffect, useState } from 'react';
import styled from 'styled-components';

const OnlineContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    bottom: 0.75rem;
    left: 0.75rem;
    padding: 0.4rem 0.6rem;
  }
`;

const OnlineText = styled.p`
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #555;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const OfflineIndicator: React.FC<{ onOnline: () => void }> = ({ onOnline }) => {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);

  useEffect(() => {
    // Set initial state client-side
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      // onOnline();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onOnline]);

  // Render nothing until client-side state is set
  if (isOffline === null) return null;

  return (
    <OnlineContainer>
      <svg width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill={isOffline ? "#FF4136" : "#2ECC40"} />
      </svg>
      <OnlineText>You are {isOffline ? "offline" : "online"}</OnlineText>
    </OnlineContainer>
  );
};

export default OfflineIndicator;