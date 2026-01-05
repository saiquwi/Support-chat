// src/components/UserStatus/UserStatus.tsx
import { FC } from "react";
import { UserStatusProps } from "./UserStatusProps";

const UserStatus: FC<UserStatusProps> = ({ status, showText = false }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'ONLINE':
        return 'online';
      case 'OFFLINE':
        return 'offline';
      case 'AWAY':
        return 'away';
      default:
        return 'offline';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ONLINE':
        return 'Online';
      case 'OFFLINE':
        return 'Offline';
      case 'AWAY':
        return 'Away';
      default:
        return 'Offline';
    }
  };

  return (
    <span className={`user-status ${getStatusClass()}`}>
      <span className="status-dot"></span>
      {showText && <span className="status-text">{getStatusText()}</span>}
    </span>
  );
};

export default UserStatus;