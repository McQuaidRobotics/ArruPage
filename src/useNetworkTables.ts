import { useContext } from 'react';
import { NTContext } from './NetworkTablesContext';

export const useNetworkTables = () => useContext(NTContext);
