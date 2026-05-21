import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";

export default function useBootstrap() {
  const [bootstrap, setBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = () => setReloadToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await freelancerApi.getBootstrap();
        if (!active) return;
        setBootstrap(response?.data || null);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load bootstrap.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { bootstrap, loading, error, refetch };
}
