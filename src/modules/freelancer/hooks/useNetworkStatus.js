import { useEffect, useState } from "react";

export default function useNetworkStatus() {
  const getOnline = () => {
    if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") {
      return true;
    }
    return navigator.onLine;
  };

  const [isOnline, setIsOnline] = useState(getOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  return { isOnline };
}
