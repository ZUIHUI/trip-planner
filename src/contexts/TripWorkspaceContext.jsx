import React, { createContext, useContext } from 'react';

const TripWorkspaceContext = createContext(null);

export const TripWorkspaceProvider = ({ value, children }) => (
  <TripWorkspaceContext.Provider value={value}>
    {children}
  </TripWorkspaceContext.Provider>
);

export const useTripWorkspace = () => {
  const context = useContext(TripWorkspaceContext);

  if (!context) {
    throw new Error('useTripWorkspace must be used within TripWorkspaceProvider');
  }

  return context;
};
