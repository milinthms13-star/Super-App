// useAdminPayload.js - Custom hook for fetching admin payload (scaffold)
import { useState, useEffect } from 'react';
import { getAdminPayload } from '../freelancerApi';
export default function useAdminPayload() {
  const [payload, setPayload] = useState(null);
  useEffect(() => {
    getAdminPayload().then(setPayload);
  }, []);
  return payload;
}
