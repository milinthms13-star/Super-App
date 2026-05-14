import { useEffect, useMemo, useState } from "react";
import { astrologyService } from "../../../services/astrologyService";

const KUNDLI_HISTORY_STORAGE_KEY = "astrology.kundliHistory.v1";
const COMPATIBILITY_HISTORY_STORAGE_KEY = "astrology.compatibilityHistory.v1";
const MAX_LOCAL_HISTORY_ITEMS = 12;

const getUserScopedStorageKey = (baseKey, currentUser) => {
  const userKey = currentUser?.id || currentUser?.email || currentUser?.name || "guest";
  return `${baseKey}.${String(userKey).trim().toLowerCase()}`;
};

const loadLocalHistory = (storageKey) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveLocalHistory = (storageKey, nextItems) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
  } catch (error) {
    // Ignore storage write failures.
  }
};

const upsertHistoryItem = (items, nextItem) =>
  [nextItem, ...items.filter((item) => item.id !== nextItem.id)].slice(0, MAX_LOCAL_HISTORY_ITEMS);

const formatSavedReadingDate = (value) => {
  if (!value) {
    return "Today";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const useAstrologyKundliCompatibility = ({
  activeSection,
  currentUser,
  selectedProfile,
  selectedSign,
  setSelectedSign,
  setSaveState,
  ensureSignedIn,
}) => {
  const [partnerSign, setPartnerSign] = useState("taurus");
  const [compatibility, setCompatibility] = useState(null);
  const [kundliData, setKundliData] = useState(null);
  const [kundliLoading, setKundliLoading] = useState(false);
  const [downloadingKundli, setDownloadingKundli] = useState(false);
  const [kundliHistory, setKundliHistory] = useState([]);
  const [activeKundliSnapshotId, setActiveKundliSnapshotId] = useState("");
  const [compatibilityHistory, setCompatibilityHistory] = useState([]);

  const currentUserStorageIdentity =
    currentUser?.id || currentUser?.email || currentUser?.name || "guest";
  const kundliStorageKey = useMemo(
    () => getUserScopedStorageKey(KUNDLI_HISTORY_STORAGE_KEY, { id: currentUserStorageIdentity }),
    [currentUserStorageIdentity]
  );
  const compatibilityStorageKey = useMemo(
    () =>
      getUserScopedStorageKey(COMPATIBILITY_HISTORY_STORAGE_KEY, {
        id: currentUserStorageIdentity,
      }),
    [currentUserStorageIdentity]
  );

  useEffect(() => {
    setKundliHistory(loadLocalHistory(kundliStorageKey));
    setCompatibilityHistory(loadLocalHistory(compatibilityStorageKey));
    setActiveKundliSnapshotId("");
  }, [compatibilityStorageKey, kundliStorageKey]);

  useEffect(() => {
    if (activeSection !== "kundli") {
      return;
    }
    if (activeKundliSnapshotId) {
      setKundliLoading(false);
      return;
    }

    let active = true;
    setKundliLoading(true);

    const loadKundliData = async () => {
      try {
        const kundli = await astrologyService.getKundliData({
          ...selectedProfile,
          sign: selectedProfile.sign || selectedSign,
        });
        if (!active) {
          return;
        }
        setKundliData(kundli);
        const historyItem = {
          id: `kundli-${Date.now()}`,
          createdAt: new Date().toISOString(),
          sign: selectedProfile.sign || selectedSign,
          profileName: selectedProfile.name || currentUser?.name || "Profile",
          data: kundli,
        };
        setKundliHistory((currentItems) => {
          const nextItems = upsertHistoryItem(currentItems, historyItem);
          saveLocalHistory(kundliStorageKey, nextItems);
          return nextItems;
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setKundliData(error.fallbackData || null);
        setSaveState({
          type: "error",
          message: error.message || "Unable to load Kundli details.",
        });
      } finally {
        if (active) {
          setKundliLoading(false);
        }
      }
    };

    void loadKundliData();

    return () => {
      active = false;
    };
  }, [
    activeKundliSnapshotId,
    activeSection,
    currentUser?.name,
    kundliStorageKey,
    selectedProfile,
    selectedSign,
    setSaveState,
  ]);

  const handleCompatibilitySubmit = async () => {
    try {
      const result = await astrologyService.getCompatibility(selectedSign, partnerSign);
      setCompatibility(result);
      const historyItem = {
        id: `compatibility-${Date.now()}`,
        createdAt: new Date().toISOString(),
        sign: selectedSign,
        partnerSign,
        data: result,
      };
      setCompatibilityHistory((currentItems) => {
        const nextItems = upsertHistoryItem(currentItems, historyItem);
        saveLocalHistory(compatibilityStorageKey, nextItems);
        return nextItems;
      });
      setSaveState({ type: "success", message: "Compatibility calculated successfully." });
    } catch (error) {
      setCompatibility(null);
      setSaveState({
        type: "error",
        message: error.message || "Unable to calculate compatibility.",
      });
    }
  };

  const handleDownloadKundliReport = async () => {
    if (!ensureSignedIn()) {
      return;
    }

    setDownloadingKundli(true);
    setSaveState({ type: "", message: "" });

    try {
      const { blob, fileName } = await astrologyService.downloadKundliReport({
        ...selectedProfile,
        sign: selectedProfile.sign || selectedSign,
        name: selectedProfile.name || currentUser?.name || "Astrology User",
      });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "kundli-report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      setSaveState({
        type: "success",
        message: "Kundli PDF report downloaded successfully.",
      });
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to download Kundli PDF report.",
      });
    } finally {
      setDownloadingKundli(false);
    }
  };

  const handleRestoreKundliSnapshot = (snapshot) => {
    if (!snapshot?.data) {
      return;
    }

    setActiveKundliSnapshotId(snapshot.id || "");
    setKundliData(snapshot.data);
    setSaveState({
      type: "success",
      message: `Loaded saved Kundli from ${formatSavedReadingDate(snapshot.createdAt)}.`,
    });
  };

  const handleLoadLiveKundli = () => {
    setActiveKundliSnapshotId("");
    setSaveState({
      type: "success",
      message: "Switched back to live Kundli generation.",
    });
  };

  const handleRestoreCompatibility = (historyItem) => {
    if (!historyItem?.data) {
      return;
    }

    setSelectedSign(historyItem.sign || selectedSign);
    setPartnerSign(historyItem.partnerSign || partnerSign);
    setCompatibility(historyItem.data);
    setSaveState({
      type: "success",
      message: `Loaded saved compatibility run from ${formatSavedReadingDate(historyItem.createdAt)}.`,
    });
  };

  return {
    partnerSign,
    setPartnerSign,
    compatibility,
    handleCompatibilitySubmit,
    compatibilityHistory,
    handleRestoreCompatibility,
    kundliData,
    kundliLoading,
    downloadingKundli,
    handleDownloadKundliReport,
    activeKundliSnapshotId,
    handleLoadLiveKundli,
    kundliHistory,
    handleRestoreKundliSnapshot,
  };
};
