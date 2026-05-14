// useBootstrap.js - Custom hook for fetching bootstrap/config (scaffold)
import { useState, useEffect } from 'react';
import { getBootstrap } from '../freelancerApi';
export default function useBootstrap() {
  const [bootstrap, setBootstrap] = useState(null);
  useEffect(() => {
    getBootstrap().then(setBootstrap);
  }, []);
  return bootstrap;
}
