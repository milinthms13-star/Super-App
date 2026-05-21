import { useEffect, useState } from "react";
import { freelancerApi } from "../freelancerApi";

export default function useAdminPayload() {
  const [payload, setPayload] = useState(null);
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
        const plansResponse = await freelancerApi.getPlans();
        let commissionResponse = null;
        let dashboardResponse = null;
        try {
          [commissionResponse, dashboardResponse] = await Promise.all([
            freelancerApi.getCommissionSettings(),
            freelancerApi.getAdminDashboard(),
          ]);
        } catch (adminError) {
          const status = Number(adminError?.response?.status || 0);
          if (status !== 401 && status !== 403) {
            throw adminError;
          }
        }
        if (!active) return;
        setPayload({
          config: commissionResponse?.data?.config || null,
          dashboard: dashboardResponse?.data || null,
          plans: plansResponse?.data?.plans || [],
        });
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Unable to load admin payload.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { payload, loading, error, refetch };
}
