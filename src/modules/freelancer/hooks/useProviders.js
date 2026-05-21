import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";
import { buildStableObjectKey } from "./stableKey";

export default function useProviders(filters = {}) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const filtersKey = buildStableObjectKey(filters);

  const refetch = () => setReloadToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await freelancerApi.getProviders(filters);
        if (!active) return;
        setProviders(response?.data?.providers || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load providers.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [filtersKey, reloadToken]);

  return { providers, loading, error, refetch };
}
