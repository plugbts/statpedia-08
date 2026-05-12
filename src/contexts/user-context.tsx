// Stub file to prevent build errors
// This app now uses custom AuthContext instead of user-context

import React, { createContext, useContext } from 'react';

export interface UserContextType {
  user: any;
  userIdentity: any;
  userSubscription: string;
  userRole: string;
  isAuthenticated: boolean;
  getUserInitials: () => string;
  getMaskedEmail: (email?: string) => string;
  isOwnerEmail: (email?: string) => boolean;
  validateUserAccess: (...args: any[]) => boolean;
  logSecurityEvent: (...args: any[]) => void;
}

const defaultValue: UserContextType = {
  user: null,
  userIdentity: null,
  userSubscription: 'free',
  userRole: 'user',
  isAuthenticated: false,
  getUserInitials: () => 'U',
  getMaskedEmail: (email?: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}***@${domain}`;
  },
  isOwnerEmail: () => false,
  validateUserAccess: () => false,
  logSecurityEvent: () => {},
};

const UserContext = createContext<UserContextType>(defaultValue);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <UserContext.Provider value={defaultValue}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
