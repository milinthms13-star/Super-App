// useProviders.js - Custom hook for fetching providers (scaffold)
import { useState, useEffect } from 'react';
import { getProviders } from '../freelancerApi';
export default function useProviders() {
  const [providers, setProviders] = useState([]);
  useEffect(() => {
    getProviders().then(setProviders);
  }, []);
  return providers;
}
