// useJobs.js - Custom hook for fetching jobs (scaffold)
import { useState, useEffect } from 'react';
import { getJobs } from '../freelancerApi';
export default function useJobs() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => {
    getJobs().then(setJobs);
  }, []);
  return jobs;
}
