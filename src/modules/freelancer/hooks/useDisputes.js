import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";

export default function useDisputes(status = "open") {
  const [disputes, setDisputes] = useState([]);
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
        const response = await freelancerApi.getDisputes(status);
        if (!active) return;
        setDisputes(response?.data?.disputes || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load disputes.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [status, reloadToken]);

  return { disputes, loading, error, refetch };
}
