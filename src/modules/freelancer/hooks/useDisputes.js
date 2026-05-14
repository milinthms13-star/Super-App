// useDisputes.js - Custom hook for fetching disputes (scaffold)
import { useState, useEffect } from 'react';
import { getDisputes } from '../freelancerApi';
export default function useDisputes() {
  const [disputes, setDisputes] = useState([]);
  useEffect(() => {
    getDisputes().then(setDisputes);
  }, []);
  return disputes;
}
