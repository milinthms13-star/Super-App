import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";
import { buildStableObjectKey } from "./stableKey";

export default function useBookings(params = {}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const paramsKey = buildStableObjectKey(params);

  const refetch = () => setReloadToken((current) => current + 1);

  useEffect(() => {
    if (!params || Object.keys(params).length === 0) {
      setBookings([]);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await freelancerApi.getBookings(params);
        if (!active) return;
        setBookings(response?.data?.bookings || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load bookings.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [paramsKey, reloadToken]);

  return { bookings, loading, error, refetch };
}
