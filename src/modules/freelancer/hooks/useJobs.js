import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";
import { buildStableObjectKey } from "./stableKey";

export default function useJobs(params = { status: "open" }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const paramsKey = buildStableObjectKey(params);

  const refetch = () => setReloadToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await freelancerApi.getJobs(params);
        if (!active) return;
        setJobs(response?.data?.jobs || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load jobs.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [paramsKey, reloadToken]);

  return { jobs, loading, error, refetch };
}
