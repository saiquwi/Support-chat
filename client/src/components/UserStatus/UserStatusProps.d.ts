// src/components/UserStatus/UserStatusProps.d.ts
export interface UserStatusProps {
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  showText?: boolean;
}