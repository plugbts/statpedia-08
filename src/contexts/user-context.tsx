// Stub file to prevent build errors
// This app now uses custom AuthContext instead of user-context

import React, { createContext, useContext } from 'react';

interface UserContextType {
  user: any;
  userIdentity: any;
  userSubscription: string;
  getUserInitials: () => string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userIdentity: null,
  userSubscription: 'free',
  getUserInitials: () => 'U'
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <UserContext.Provider value={{
    user: null,
    userIdentity: null,
    userSubscription: 'free',
    getUserInitials: () => 'U'
  }}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
