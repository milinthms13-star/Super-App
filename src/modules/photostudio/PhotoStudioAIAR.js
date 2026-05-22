import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./PhotoStudioAIAR.css";

const NAV_TABS = [
  { id: "home", label: "Photo Studio Home" },
  { id: "editor", label: "Edit Photo" },
  { id: "ar", label: "AR Camera" },
  { id: "studio360", label: "360 Studio" },
  { id: "ai", label: "AI Tools" },
  { id: "bgremove", label: "Background Remove" },
  { id: "collage", label: "Collage" },
  { id: "templates", label: "Templates" },
  { id: "my", label: "My Creations" },
  { id: "admin", label: "Admin Panel" },
];

const DEFAULT_EDITOR = {
  operations: ["crop", "brightness", "contrast"],
  filters: ["beauty-soft"],
  exportFormat: "jpg",
  quality: "standard",
  crop: { left: 0, top: 0, width: 900, height: 900 },
  resize: { width: 1080, height: 1080 },
  rotation: 0,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  payPerExportUnlocked: false,
  removeWatermark: false,
};

const DEFAULT_ADMIN_PACK = {
  name: "",
  category: "filter",
  tags: "",
  isPremium: false,
  previewUrl: "",
};

const DEFAULT_TEMPLATE_FORM = {
  name: "",
  category: "instagram-post",
  language: "en",
  premium: false,
  businessOnly: false,
};

const DEFAULT_PLAN_RULES = {
  freeTools: ["crop", "rotate", "resize", "brightness", "contrast"],
  premiumTools: ["ai-enhance", "background-remove", "object-remove", "face-retouch", "ar-filters"],
  businessTools: ["product-editing", "template-marketplace", "batch-export"],
  payPerExportPrice: 29,
  watermarkText: "MGRAND HUB Photo Studio",
  allowFreeWatermarkRemoval: false,
};

const SUPPORTED_IMAGE_MIME = /^image\//i;
const AVAILABLE_360_STYLES = [
  {
    value: "spherical",
    label: "Spherical Panorama",
    description: "Best for landscape, travel and wide-angle compositions.",
  },
  {
    value: "immersive",
    label: "Immersive Photo Dome",
    description: "Perfect for square or portrait portraits with dramatic depth.",
  },
  {
    value: "cinematic",
    label: "Cinematic 360 Banner",
    description: "Ideal for wide shots, motion scenes and premium story visuals.",
  },
];

const QUICK_FILTER_PRESETS = {
  Normal: "none",
  Warm: "sepia(20%) saturate(130%) brightness(105%)",
  Cool: "contrast(105%) saturate(120%) hue-rotate(15deg)",
  Vintage: "sepia(55%) contrast(95%) brightness(95%)",
  Mono: "grayscale(100%) contrast(110%)",
  Cinematic: "contrast(120%) saturate(140%) brightness(90%)",
};

const QUICK_STICKERS = ["✨", "❤️", "🌸", "👑", "🕶️", "🎉", "🪔", "⭐"];

const EXPORT_PRESETS = [
  { id: "square", label: "Instagram Post 1080x1080", width: 1080, height: 1080 },
  { id: "story", label: "Instagram/WhatsApp Story 1080x1920", width: 1080, height: 1920 },
  { id: "reel", label: "Reels Cover 1080x1350", width: 1080, height: 1350 },
  { id: "product", label: "Product Square 1200x1200", width: 1200, height: 1200 },
  { id: "youtube", label: "YouTube Thumbnail 1280x720", width: 1280, height: 720 },
];

const STEP_LABELS = {
  upload: "Uploading asset",
  edit: "Applying studio edit",
  "ai-enhance": "AI enhancing image",
  "ai-background": "Removing background",
  "ai-object": "Removing objects",
  "ai-upscale": "Upscaling image",
  caption: "Generating caption",
  "ar-session": "Starting AR session",
  "template-render": "Rendering template",
  "save-creation": "Saving creation",
  "ai-360": "Rendering 360 image",
};

const toTagList = (value = "") =>
  String(value || "")
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const PhotoStudioAIAR = () => {
  const [tab, setTab] = useState("home");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busyKey, setBusyKey] = useState("");

  const [meta, setMeta] = useState(null);
  const [editor, setEditor] = useState(DEFAULT_EDITOR);
  const [uploadedAsset, setUploadedAsset] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [beforeAfterSplit, setBeforeAfterSplit] = useState(50);
  const [dragOver, setDragOver] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [exportUnlock, setExportUnlock] = useState(false);
  const [studio360Style, setStudio360Style] = useState("spherical");
  const [studio360Result, setStudio360Result] = useState(null);
  const [studio360Meta, setStudio360Meta] = useState(null);
  const [viewerPan, setViewerPan] = useState(50);
  const [viewerDragStart, setViewerDragStart] = useState(null);
  const [quickFilter, setQuickFilter] = useState("Normal");
  const [quickSticker, setQuickSticker] = useState("✨");
  const [quickCaption, setQuickCaption] = useState("");
  const [quickBrightness, setQuickBrightness] = useState(100);
  const [quickContrast, setQuickContrast] = useState(100);
  const [quickBlur, setQuickBlur] = useState(0);
  const [quickRotation, setQuickRotation] = useState(0);
  const [exportPreset, setExportPreset] = useState("square");
  const [paywallState, setPaywallState] = useState({ open: false, message: "", code: "" });

  const [arConfig, setArConfig] = useState({
    effectId: "live-face-filter",
    recordMode: "photo",
  });
  const [arSession, setArSession] = useState(null);
  const [arRuntimeOn, setArRuntimeOn] = useState(false);
  const [arRuntimeStatus, setArRuntimeStatus] = useState("Camera not started");
  const [arFacesDetected, setArFacesDetected] = useState(0);

  const [captionContext, setCaptionContext] = useState("");
  const [captionResult, setCaptionResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [objectSelections, setObjectSelections] = useState("120,120,260,260");

  const [templateCategory, setTemplateCategory] = useState("onam");
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [templateResult, setTemplateResult] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [renderedTemplate, setRenderedTemplate] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("Super Offer");
  const [templateSubtitle, setTemplateSubtitle] = useState("Create with Photo Studio AI + AR");

  const [myCreations, setMyCreations] = useState([]);
  const [adminPacks, setAdminPacks] = useState([]);
  const [adminTemplates, setAdminTemplates] = useState([]);
  const [adminPackForm, setAdminPackForm] = useState(DEFAULT_ADMIN_PACK);
  const [adminTemplateForm, setAdminTemplateForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [planRules, setPlanRules] = useState(DEFAULT_PLAN_RULES);

  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const quickCanvasRef = useRef(null);
  const arVideoRef = useRef(null);
  const arCanvasRef = useRef(null);
  const arStreamRef = useRef(null);
  const arRenderRafRef = useRef(null);
  const arFaceDetectorRef = useRef(null);
  const arAnchorRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const arFrameCounterRef = useRef(0);

  const token = getStoredAuthToken();
  const isAuthenticated = Boolean(token);

  const request = useCallback(
    async (method, path, data, params, headers = {}) => {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios({
        method,
        url: buildApiUrl(path),
        data,
        params,
        headers: { ...authHeaders, ...headers },
      });
      return response.data;
    },
    [token]
  );

  const withBusy = useCallback(async (key, action) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey("");
    }
  }, []);

  const pushStatus = useCallback((type, message) => {
    setStatus({ type, message });
  }, []);

  const currentAssetUrl = useMemo(() => {
    if (historyIndex >= 0 && historyStack[historyIndex]) {
      return historyStack[historyIndex];
    }
    return uploadedAsset?.url || "";
  }, [historyIndex, historyStack, uploadedAsset?.url]);

  const initialAssetUrl = useMemo(() => {
    if (historyStack.length > 0) {
      return historyStack[0];
    }
    return uploadedAsset?.url || "";
  }, [historyStack, uploadedAsset?.url]);

  const availableFilters = useMemo(() => meta?.features?.filters || [], [meta?.features?.filters]);
  const availableArEffects = useMemo(() => meta?.features?.arEffects || [], [meta?.features?.arEffects]);
  const availableAiTools = useMemo(() => meta?.features?.aiTools || [], [meta?.features?.aiTools]);
  const availableEditTools = useMemo(() => meta?.features?.editTools || [], [meta?.features?.editTools]);

  const planTier = meta?.planTier || "free";
  const monetization = meta?.monetization || {};
  const sdkList = meta?.features?.sdkRecommendations || [];
  const templateCategories = meta?.features?.templateCategories || [];

  const studio360StyleAdvice = useMemo(() => {
    const rule = AVAILABLE_360_STYLES.find((item) => item.value === studio360Style);
    return rule?.description || "Choose a 360° style and render your image into a premium panorama.";
  }, [studio360Style]);

  const quickFilterStyle = useMemo(() => {
    const baseFilter = QUICK_FILTER_PRESETS[quickFilter] || "none";
    return `${baseFilter} brightness(${quickBrightness}%) contrast(${quickContrast}%) blur(${quickBlur}px)`;
  }, [quickBlur, quickBrightness, quickContrast, quickFilter]);

  const currentStepLabel = useMemo(() => {
    if (!busyKey) return "";
    return STEP_LABELS[busyKey] || "Processing";
  }, [busyKey]);

  useEffect(() => {
    setStudio360Result(null);
    setStudio360Meta(null);
    setViewerPan(50);
  }, [currentAssetUrl]);

  useEffect(() => {
    const preset = EXPORT_PRESETS.find((item) => item.id === exportPreset);
    if (!preset) return;
    setEditor((current) => ({
      ...current,
      resize: { width: preset.width, height: preset.height },
    }));
  }, [exportPreset]);

  const loadMeta = useCallback(async () => {
    if (!isAuthenticated) {
      pushStatus("error", "Login required for Photo Studio AI + AR.");
      return;
    }

    await withBusy("meta", async () => {
      try {
        const result = await request("get", "/photo-studio/meta");
        setMeta(result);
        if (result?.accessControl) {
          setPlanRules({
            freeTools: result.accessControl.freeTools || DEFAULT_PLAN_RULES.freeTools,
            premiumTools: result.accessControl.premiumTools || DEFAULT_PLAN_RULES.premiumTools,
            businessTools: result.accessControl.businessTools || DEFAULT_PLAN_RULES.businessTools,
            payPerExportPrice: Number(result?.monetization?.payPerExportPrice || DEFAULT_PLAN_RULES.payPerExportPrice),
            watermarkText: result?.accessControl?.watermarkText || DEFAULT_PLAN_RULES.watermarkText,
            allowFreeWatermarkRemoval: Boolean(result?.accessControl?.allowFreeWatermarkRemoval),
          });
        }
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load module metadata.");
      }
    });
  }, [isAuthenticated, pushStatus, request, withBusy]);

  const loadMyCreations = useCallback(async () => {
    if (!isAuthenticated) return;
    await withBusy("my-creations", async () => {
      try {
        const result = await request("get", "/photo-studio/creations/mine");
        setMyCreations(Array.isArray(result?.creations) ? result.creations : []);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load creations.");
      }
    });
  }, [isAuthenticated, pushStatus, request, withBusy]);

  const loadTemplates = useCallback(async () => {
    if (!isAuthenticated) return;
    await withBusy("templates", async () => {
      try {
        const result = await request("get", "/photo-studio/templates", null, {
          category: templateCategory,
          language: templateLanguage,
        });
        setTemplateResult(Array.isArray(result?.templates) ? result.templates : []);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load templates.");
      }
    });
  }, [isAuthenticated, pushStatus, request, templateCategory, templateLanguage, withBusy]);

  const loadAdminPacks = useCallback(async () => {
    if (!isAuthenticated) return;
    await withBusy("admin-packs", async () => {
      try {
        const result = await request("get", "/photo-studio/admin/asset-packs");
        setAdminPacks(Array.isArray(result?.packs) ? result.packs : []);
      } catch (_error) {
        setAdminPacks([]);
      }
    });
  }, [isAuthenticated, request, withBusy]);

  const loadAdminTemplates = useCallback(async () => {
    if (!isAuthenticated) return;
    await withBusy("admin-templates", async () => {
      try {
        const result = await request("get", "/photo-studio/admin/templates");
        setAdminTemplates(Array.isArray(result?.templates) ? result.templates : []);
      } catch (_error) {
        setAdminTemplates([]);
      }
    });
  }, [isAuthenticated, request, withBusy]);

  useEffect(() => {
    loadMeta();
    loadMyCreations();
    loadTemplates();
    loadAdminPacks();
    loadAdminTemplates();
  }, [loadAdminPacks, loadAdminTemplates, loadMeta, loadMyCreations, loadTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates, templateCategory, templateLanguage]);

  const parseSelections = useCallback(() => {
    return String(objectSelections || "")
      .split(/[;\n]+/)
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [left, top, width, height] = row.split(",").map((item) => Number(item.trim()));
        if ([left, top, width, height].some((value) => Number.isNaN(value))) {
          return null;
        }
        return { left, top, width, height };
      })
      .filter(Boolean);
  }, [objectSelections]);

  const trackEvent = useCallback(
    async (eventName, payload = {}) => {
      if (!eventName || !isAuthenticated) return;
      try {
        await request("post", "/photo-studio/analytics/event", {
          eventName,
          source: "photo-studio-module",
          payload,
        });
      } catch (_error) {
        // analytics must not block UX
      }
    },
    [isAuthenticated, request]
  );

  const closePaywall = useCallback(() => {
    setPaywallState({ open: false, message: "", code: "" });
  }, []);

  const openPaywall = useCallback((error) => {
    const message = error?.response?.data?.message || "This feature is locked for your current plan.";
    const code = error?.response?.data?.code || "FEATURE_LOCKED";
    setPaywallState({ open: true, message, code });
  }, []);

  const paintArOverlay = useCallback((ctx, anchor, effectId) => {
    const normalized = String(effectId || "").toLowerCase();
    const centerX = anchor.x + anchor.width / 2;
    const centerY = anchor.y + anchor.height / 2;

    if (normalized.includes("background")) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, ctx.canvas.height * 0.62, ctx.canvas.width, ctx.canvas.height * 0.38);
    }

    if (normalized.includes("makeup")) {
      ctx.fillStyle = "rgba(244, 114, 182, 0.20)";
      ctx.beginPath();
      ctx.ellipse(centerX - anchor.width * 0.2, centerY + anchor.height * 0.1, anchor.width * 0.14, anchor.height * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + anchor.width * 0.2, centerY + anchor.height * 0.1, anchor.width * 0.14, anchor.height * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(251, 113, 133, 0.26)";
      ctx.fillRect(centerX - anchor.width * 0.16, centerY + anchor.height * 0.24, anchor.width * 0.32, anchor.height * 0.06);
    }

    if (normalized.includes("hair")) {
      ctx.fillStyle = "rgba(168, 85, 247, 0.22)";
      ctx.beginPath();
      ctx.ellipse(centerX, anchor.y + anchor.height * 0.08, anchor.width * 0.56, anchor.height * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (normalized.includes("jewellery")) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
      ctx.lineWidth = Math.max(2, anchor.width * 0.02);
      ctx.beginPath();
      ctx.arc(centerX, centerY + anchor.height * 0.5, anchor.width * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    if (
      normalized.includes("glasses") ||
      normalized.includes("live-face") ||
      normalized.includes("sticker") ||
      normalized.includes("multi-face")
    ) {
      const eyeY = centerY - anchor.height * 0.08;
      const eyeW = anchor.width * 0.28;
      const eyeH = anchor.height * 0.17;
      ctx.fillStyle = "rgba(15, 23, 42, 0.34)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = Math.max(2, anchor.width * 0.015);
      ctx.beginPath();
      ctx.rect(centerX - eyeW * 2.1, eyeY - eyeH / 2, eyeW, eyeH);
      ctx.rect(centerX + eyeW * 1.1, eyeY - eyeH / 2, eyeW, eyeH);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - eyeW * 1.1, eyeY);
      ctx.lineTo(centerX + eyeW * 1.1, eyeY);
      ctx.stroke();
    }
  }, []);

  const stopArRuntime = useCallback(() => {
    if (arRenderRafRef.current) {
      cancelAnimationFrame(arRenderRafRef.current);
      arRenderRafRef.current = null;
    }
    const stream = arStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    arStreamRef.current = null;
    if (arVideoRef.current) {
      arVideoRef.current.srcObject = null;
    }
    setArRuntimeOn(false);
    setArFacesDetected(0);
    setArRuntimeStatus("Camera stopped");
  }, []);

  const startArRuntime = useCallback(async () => {
    const video = arVideoRef.current;
    const canvas = arCanvasRef.current;
    if (!video || !canvas) {
      pushStatus("error", "AR camera surface is not ready.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      arStreamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const FaceDetectorClass = window.FaceDetector;
      if (FaceDetectorClass) {
        arFaceDetectorRef.current = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 2 });
        setArRuntimeStatus("AR running with face detection");
      } else {
        arFaceDetectorRef.current = null;
        setArRuntimeStatus("AR running in compatibility mode");
      }

      setArRuntimeOn(true);

      const render = async () => {
        const context = canvas.getContext("2d");
        if (!context || !video.videoWidth || !video.videoHeight) {
          arRenderRafRef.current = requestAnimationFrame(render);
          return;
        }

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.restore();

        let anchor = {
          x: canvas.width * 0.28,
          y: canvas.height * 0.2,
          width: canvas.width * 0.44,
          height: canvas.height * 0.52,
        };

        let detectedFaces = 0;
        const detector = arFaceDetectorRef.current;
        if (detector && arFrameCounterRef.current % 2 === 0) {
          try {
            const faces = await detector.detect(video);
            detectedFaces = Array.isArray(faces) ? faces.length : 0;
            if (detectedFaces > 0) {
              const box = faces[0].boundingBox || {};
              const mirroredX = canvas.width - (Number(box.x || 0) + Number(box.width || 0));
              anchor = {
                x: mirroredX,
                y: Number(box.y || 0),
                width: Number(box.width || anchor.width),
                height: Number(box.height || anchor.height),
              };
            }
          } catch (_error) {
            // continue in compatibility mode
          }
        }
        arFrameCounterRef.current += 1;

        setArFacesDetected(detectedFaces);
        const previous = arAnchorRef.current;
        const smooth = 0.25;
        const smoothedAnchor = {
          x: previous.width ? previous.x + (anchor.x - previous.x) * smooth : anchor.x,
          y: previous.height ? previous.y + (anchor.y - previous.y) * smooth : anchor.y,
          width: previous.width ? previous.width + (anchor.width - previous.width) * smooth : anchor.width,
          height: previous.height ? previous.height + (anchor.height - previous.height) * smooth : anchor.height,
        };
        arAnchorRef.current = smoothedAnchor;
        paintArOverlay(context, smoothedAnchor, arConfig.effectId);
        arRenderRafRef.current = requestAnimationFrame(render);
      };

      arRenderRafRef.current = requestAnimationFrame(render);
    } catch (error) {
      const message = error?.message || "Camera permission denied.";
      pushStatus("error", message);
      setArRuntimeStatus("Camera permission denied");
      stopArRuntime();
    }
  }, [arConfig.effectId, paintArOverlay, pushStatus, stopArRuntime]);

  const handleCaptureArFrame = useCallback(() => {
    const canvas = arCanvasRef.current;
    if (!canvas) {
      pushStatus("error", "AR canvas is not ready.");
      return;
    }
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          pushStatus("error", "Failed to capture AR frame.");
          return;
        }
        await withBusy("upload", async () => {
          try {
            const formData = new FormData();
            formData.append("file", blob, `ar-capture-${Date.now()}.jpg`);
            formData.append("source", "ar-camera");
            formData.append("storageProvider", "auto");
            const result = await request(
              "post",
              "/photo-studio/upload",
              formData,
              null,
              { "Content-Type": "multipart/form-data" }
            );
            const uploadData = result?.upload;
            if (!uploadData?.url) {
              pushStatus("error", "AR capture upload failed.");
              return;
            }
            setUploadedAsset(uploadData);
            setHistoryStack([uploadData.url]);
            setHistoryIndex(0);
            setBeforeAfterSplit(50);
            trackEvent("ar_capture_saved", { effectId: arConfig.effectId });
            pushStatus("success", "AR frame captured and loaded into editor.");
          } catch (error) {
            pushStatus("error", error?.response?.data?.message || "AR capture upload failed.");
          }
        });
      },
      "image/jpeg",
      0.94
    );
  }, [arConfig.effectId, pushStatus, request, trackEvent, withBusy]);

  useEffect(() => {
    if (tab !== "ar" && arRuntimeOn) {
      stopArRuntime();
    }
  }, [arRuntimeOn, stopArRuntime, tab]);

  useEffect(() => {
    return () => {
      stopArRuntime();
    };
  }, [stopArRuntime]);

  const uploadFile = useCallback(
    async (file, source = "gallery") => {
      if (!file) return;
      if (!SUPPORTED_IMAGE_MIME.test(file.type)) {
        pushStatus("error", "Only image uploads are supported in Photo Studio. Please select a photo file.");
        return;
      }
      await withBusy("upload", async () => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("source", source);
          formData.append("storageProvider", "auto");

          const result = await request(
            "post",
            "/photo-studio/upload",
            formData,
            null,
            { "Content-Type": "multipart/form-data" }
          );

          const uploadData = result?.upload;
          if (!uploadData?.url) {
            pushStatus("error", "Upload failed. Missing uploaded asset URL.");
            return;
          }

          setUploadedAsset(uploadData);
          setHistoryStack([uploadData.url]);
          setHistoryIndex(0);
          setBeforeAfterSplit(50);
          trackEvent("asset_uploaded", { source, provider: uploadData.provider || "unknown" });
          pushStatus("success", `Uploaded from ${source}. Provider: ${uploadData.provider}`);
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Upload failed.");
        }
      });
    },
    [pushStatus, request, trackEvent, withBusy]
  );

  const pushHistoryUrl = useCallback((url) => {
    if (!url) return;
    setHistoryStack((current) => {
      const truncated = current.slice(0, historyIndex + 1);
      return [...truncated, url];
    });
    setHistoryIndex((current) => current + 1);
  }, [historyIndex]);

  const handleApplyEdit = useCallback(async () => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload an image first.");
      return;
    }

    await withBusy("edit", async () => {
      try {
        trackEvent("export_attempted", {
          quality: editor.quality,
          format: editor.exportFormat,
          source: "editor",
        });
        const result = await request("post", "/photo-studio/edit", {
          assetUrl: currentAssetUrl,
          operations: editor.operations,
          filters: editor.filters,
          exportFormat: editor.exportFormat,
          quality: editor.quality,
          crop: editor.crop,
          resize: editor.resize,
          rotation: editor.rotation,
          brightness: editor.brightness,
          contrast: editor.contrast,
          saturation: editor.saturation,
          payPerExportUnlocked: exportUnlock || editor.payPerExportUnlocked,
          removeWatermark: editor.removeWatermark,
          history: historyStack,
        });

        const afterUrl = result?.result?.afterUrl;
        if (!afterUrl) {
          pushStatus("error", "Edit failed: no output URL.");
          return;
        }
        pushHistoryUrl(afterUrl);
        trackEvent("export_success", {
          quality: editor.quality,
          format: editor.exportFormat,
          source: "editor",
        });
        pushStatus("success", "Edit applied with history update.");
      } catch (error) {
        const paymentHint = error?.response?.status === 402
          ? ` Unlock HD at Rs.${planRules.payPerExportPrice || 29}.`
          : "";
        if (error?.response?.status === 402) {
          openPaywall(error);
        }
        pushStatus("error", `${error?.response?.data?.message || "Failed to apply edit."}${paymentHint}`);
      }
    });
  }, [currentAssetUrl, editor, exportUnlock, historyStack, openPaywall, planRules.payPerExportPrice, pushHistoryUrl, pushStatus, request, trackEvent, withBusy]);

  const runAiTool = useCallback(async (toolKey) => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload an image first.");
      return;
    }

    const endpointMap = {
      enhance: "/photo-studio/ai/enhance",
      background: "/photo-studio/ai/background-remove",
      object: "/photo-studio/ai/object-remove",
      upscale: "/photo-studio/ai/upscale",
    };

    const endpoint = endpointMap[toolKey];
    if (!endpoint) return;

    await withBusy(`ai-${toolKey}`, async () => {
      try {
        const payload = {
          assetUrl: currentAssetUrl,
          storageProvider: "auto",
        };

        if (toolKey === "object") {
          payload.selections = parseSelections();
        }
        if (toolKey === "upscale") {
          payload.scale = 2;
        }

        const result = await request("post", endpoint, payload);
        const outputUrl =
          result?.result?.enhancedUrl || result?.result?.outputUrl || result?.result?.afterUrl || "";

        if (outputUrl) {
          pushHistoryUrl(outputUrl);
        }
        setAiResult(result?.result || null);
        trackEvent("ai_tool_applied", { tool: toolKey });
        pushStatus("success", `AI ${toolKey} completed.`);
      } catch (error) {
        if (error?.response?.status === 402) {
          openPaywall(error);
        }
        pushStatus("error", error?.response?.data?.message || `AI ${toolKey} failed.`);
      }
    });
  }, [currentAssetUrl, openPaywall, parseSelections, pushHistoryUrl, pushStatus, request, trackEvent, withBusy]);

  const handleGenerateCaption = useCallback(async () => {
    await withBusy("caption", async () => {
      try {
        const result = await request("post", "/photo-studio/ai/caption-hashtags", {
          context: captionContext,
          style: "social",
        });
        setCaptionResult(result?.result || null);
        pushStatus("success", "Caption and hashtags generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed caption generation.");
      }
    });
  }, [captionContext, pushStatus, request, withBusy]);

  const handleStartArSession = useCallback(async () => {
    await withBusy("ar-session", async () => {
      try {
        const result = await request("post", "/photo-studio/ar/session", arConfig);
        setArSession(result?.session || null);
        trackEvent("ar_effect_selected", { effectId: arConfig.effectId, mode: arConfig.recordMode });
        pushStatus("success", "AR session configured. Start live camera to preview overlays.");
      } catch (error) {
        if (error?.response?.status === 402) {
          openPaywall(error);
        }
        pushStatus("error", error?.response?.data?.message || "Failed to configure AR session.");
      }
    });
  }, [arConfig, openPaywall, pushStatus, request, trackEvent, withBusy]);

  const handleGenerate360 = useCallback(async () => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload an image first to generate the 360 experience.");
      return;
    }

    await withBusy("ai-360", async () => {
      try {
        const result = await request("post", "/photo-studio/ai/360-style", {
          assetUrl: currentAssetUrl,
          style: studio360Style,
          storageProvider: "auto",
        });

        const outputUrl = result?.result?.outputUrl;
        const viewerType = result?.result?.viewerType || "equirectangular";
        if (outputUrl) {
          setStudio360Result(outputUrl);
          setStudio360Meta({ style: studio360Style, viewerType, width: result?.result?.width, height: result?.result?.height });
          setViewerPan(50);
          pushHistoryUrl(outputUrl);
          trackEvent("ai_tool_applied", { tool: "360-style", style: studio360Style, viewerType });
          pushStatus("success", "360° image created successfully.");
        } else {
          pushStatus("error", "360° render completed but no output was returned.");
        }
      } catch (error) {
        if (error?.response?.status === 402) {
          openPaywall(error);
        }
        pushStatus("error", error?.response?.data?.message || "360° generation failed.");
      }
    });
  }, [currentAssetUrl, openPaywall, pushHistoryUrl, pushStatus, request, studio360Style, trackEvent, withBusy]);

  const handleRenderTemplate = useCallback(async () => {
    if (!selectedTemplateId) {
      pushStatus("error", "Select a template first.");
      return;
    }
    await withBusy("template-render", async () => {
      try {
        const result = await request("post", "/photo-studio/templates/render", {
          templateId: selectedTemplateId,
          assetUrl: currentAssetUrl || undefined,
          title: templateTitle,
          subtitle: templateSubtitle,
          storageProvider: "auto",
        });

        const renderedUrl = result?.result?.renderedUrl || "";
        setRenderedTemplate(result?.result || null);
        if (renderedUrl) {
          pushHistoryUrl(renderedUrl);
        }
        trackEvent("template_rendered", { templateId: selectedTemplateId || "unknown" });
        pushStatus("success", "Template rendered successfully.");
      } catch (error) {
        if (error?.response?.status === 402) {
          openPaywall(error);
        }
        pushStatus("error", error?.response?.data?.message || "Template render failed.");
      }
    });
  }, [currentAssetUrl, openPaywall, pushHistoryUrl, pushStatus, request, selectedTemplateId, templateSubtitle, templateTitle, trackEvent, withBusy]);

  const handleSaveCreation = useCallback(async () => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload and edit an image before saving.");
      return;
    }

    await withBusy("save-creation", async () => {
      try {
        await request("post", "/photo-studio/creations", {
          title: saveTitle || "Photo Studio Draft",
          sourceUrl: initialAssetUrl || currentAssetUrl,
          beforeUrl: initialAssetUrl || currentAssetUrl,
          afterUrl: currentAssetUrl,
          exportFormat: editor.exportFormat,
          quality: editor.quality,
          planTier,
          editOperations: editor.operations,
          filters: editor.filters,
          aiTools: aiResult ? [aiResult.mode || "ai-enhance"] : [],
          arEffects: arSession?.effectId ? [arSession.effectId] : [],
          templateId: selectedTemplateId || "",
          metadata: {
            caption: captionResult?.caption || "",
            hashtags: captionResult?.hashtags || [],
            historyLength: historyStack.length,
          },
        });
        setSaveTitle("");
        trackEvent("creation_saved", { historyLength: historyStack.length });
        pushStatus("success", "Creation saved.");
        loadMyCreations();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to save creation.");
      }
    });
  }, [aiResult, arSession?.effectId, captionResult?.caption, captionResult?.hashtags, currentAssetUrl, editor.exportFormat, editor.filters, editor.operations, editor.quality, historyStack.length, initialAssetUrl, loadMyCreations, planTier, pushStatus, request, saveTitle, selectedTemplateId, trackEvent, withBusy]);

  const handleDeleteCreation = useCallback(async (id) => {
    await withBusy(`delete-${id}`, async () => {
      try {
        await request("delete", `/photo-studio/creations/${id}`);
        setMyCreations((current) => current.filter((item) => item._id !== id));
        pushStatus("success", "Creation deleted.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to delete creation.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const handleCreatePack = useCallback(async () => {
    if (!adminPackForm.name.trim()) {
      pushStatus("error", "Asset pack name is required.");
      return;
    }
    await withBusy("create-pack", async () => {
      try {
        await request("post", "/photo-studio/admin/asset-packs", {
          name: adminPackForm.name,
          category: adminPackForm.category,
          tags: toTagList(adminPackForm.tags),
          isPremium: adminPackForm.isPremium,
          previewUrl: adminPackForm.previewUrl,
          config: {},
        });
        setAdminPackForm(DEFAULT_ADMIN_PACK);
        pushStatus("success", "Asset pack created.");
        loadAdminPacks();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to create asset pack.");
      }
    });
  }, [adminPackForm, loadAdminPacks, pushStatus, request, withBusy]);

  const handleDeletePack = useCallback(async (id) => {
    await withBusy(`delete-pack-${id}`, async () => {
      try {
        await request("delete", `/photo-studio/admin/asset-packs/${id}`);
        setAdminPacks((current) => current.filter((item) => item._id !== id));
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to delete pack.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const handleCreateTemplate = useCallback(async () => {
    if (!adminTemplateForm.name.trim()) {
      pushStatus("error", "Template name is required.");
      return;
    }

    await withBusy("create-template", async () => {
      try {
        await request("post", "/photo-studio/admin/templates", adminTemplateForm);
        setAdminTemplateForm(DEFAULT_TEMPLATE_FORM);
        pushStatus("success", "Template created.");
        loadAdminTemplates();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to create template.");
      }
    });
  }, [adminTemplateForm, loadAdminTemplates, pushStatus, request, withBusy]);

  const handleUpdatePlanRules = useCallback(async () => {
    await withBusy("plan-rules", async () => {
      try {
        await request("put", "/photo-studio/admin/settings", {
          freeTools: planRules.freeTools,
          premiumTools: planRules.premiumTools,
          businessTools: planRules.businessTools,
          payPerExportPrice: Number(planRules.payPerExportPrice || 0),
          watermarkText: planRules.watermarkText,
          allowFreeWatermarkRemoval: Boolean(planRules.allowFreeWatermarkRemoval),
        });
        pushStatus("success", "Monetization and access rules updated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to update plan rules.");
      }
    });
  }, [planRules, pushStatus, request, withBusy]);

  const handleQuickBackgroundRemove = useCallback(async () => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload an image first for quick background remove.");
      return;
    }
    await runAiTool("background");
  }, [currentAssetUrl, pushStatus, runAiTool]);

  const handleQuickExport = useCallback(() => {
    if (!currentAssetUrl) {
      pushStatus("error", "Upload an image first to export from Quick 10/10 Studio.");
      return;
    }
    trackEvent("export_attempted", {
      quality: editor.quality,
      format: editor.exportFormat,
      source: "quick-studio",
    });

    const canvas = quickCanvasRef.current;
    if (!canvas) {
      pushStatus("error", "Canvas is not ready.");
      return;
    }

    const context = canvas.getContext("2d");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = currentAssetUrl;

    image.onload = () => {
      const width = Number(editor.resize?.width || image.width || 1080);
      const height = Number(editor.resize?.height || image.height || 1080);
      canvas.width = width;
      canvas.height = height;

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate((quickRotation * Math.PI) / 180);
      context.filter = quickFilterStyle;
      context.drawImage(image, -width / 2, -height / 2, width, height);
      context.restore();
      context.filter = "none";

      context.font = `${Math.max(42, Math.round(width * 0.07))}px Arial`;
      context.textAlign = "center";
      context.fillText(quickSticker, width / 2, Math.max(70, Math.round(height * 0.14)));

      if (quickCaption.trim()) {
        const barHeight = Math.max(88, Math.round(height * 0.11));
        const marginX = Math.max(30, Math.round(width * 0.07));
        const barY = height - barHeight - Math.max(20, Math.round(height * 0.04));

        context.fillStyle = "rgba(0,0,0,0.55)";
        context.fillRect(marginX, barY, width - marginX * 2, barHeight);

        context.fillStyle = "#ffffff";
        context.font = `${Math.max(22, Math.round(width * 0.035))}px Arial`;
        context.fillText(quickCaption, width / 2, barY + barHeight / 2 + 10);
      }

      const format = editor.exportFormat === "jpg" ? "jpeg" : editor.exportFormat;
      const anchor = document.createElement("a");
      anchor.download = `photo-studio-upgrade.${editor.exportFormat}`;
      anchor.href = canvas.toDataURL(`image/${format}`);
      anchor.click();

      trackEvent("export_success", {
        quality: editor.quality,
        format: editor.exportFormat,
        source: "quick-studio",
      });
      pushStatus("success", "Quick 10/10 export completed.");
    };

    image.onerror = () => {
      pushStatus("error", "Export failed due to image loading/CORS issue.");
    };
  }, [
    currentAssetUrl,
    editor.exportFormat,
    editor.quality,
    editor.resize?.height,
    editor.resize?.width,
    pushStatus,
    quickCaption,
    quickFilterStyle,
    quickRotation,
    quickSticker,
    trackEvent,
  ]);

  return (
    <div className="photostudio-shell">
      <section className="photostudio-hero">
        <div>
          <h1>Photo Studio AI + AR</h1>
          <p>
            Upload from phone/gallery/camera, edit with history, run AI tools, render templates, and publish export-ready assets.
          </p>
          <div className="photostudio-pill-row">
            <span>Plan: {planTier.toUpperCase()}</span>
            <span>Free: Basic edit + limited filters</span>
            <span>Premium: AI + AR + HD export</span>
            <span>Business: Product editing + template marketplace</span>
          </div>
        </div>
      </section>

      <nav className="photostudio-nav">
        {NAV_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {status.message ? (
        <div className={`photostudio-status ${status.type === "error" ? "error" : "success"}`}>{status.message}</div>
      ) : null}

      {tab === "home" ? (
        <section className="photostudio-card">
          <h2>Upload System</h2>
          <div
            className={`photostudio-upload-drop ${dragOver ? "drag-over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer?.files?.[0];
              if (file) {
                uploadFile(file, "drag-drop");
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <strong>Drag and drop image/video here</strong>
            <p>Or click to choose from files.</p>
            <small>Storage auto-fallback: Cloudinary/S3/local uploads.</small>
          </div>

          <div className="photostudio-inline-actions">
            <button type="button" onClick={() => galleryInputRef.current?.click()}>
              Upload from Gallery
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()}>
              Capture from Camera
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="photostudio-hidden-input"
            type="file"
            accept="image/*"
            onChange={(event) => uploadFile(event.target.files?.[0], "file-picker")}
          />
          <input
            ref={galleryInputRef}
            className="photostudio-hidden-input"
            type="file"
            accept="image/*"
            onChange={(event) => uploadFile(event.target.files?.[0], "gallery")}
          />
          <input
            ref={cameraInputRef}
            className="photostudio-hidden-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => uploadFile(event.target.files?.[0], "camera")}
          />

          <h3>Main Features</h3>
          <div className="photostudio-grid three">
            <article>
              <h3>Photo Editing</h3>
              <p>Crop, rotate, resize, brightness, contrast, saturation, history undo/redo, and before/after slider.</p>
            </article>
            <article>
              <h3>AI + AR</h3>
              <p>Enhance, background remove, object remove, upscaler, caption/hashtags, face filters and virtual try-on contracts.</p>
            </article>
            <article>
              <h3>Template System</h3>
              <p>Festival/wedding/business/social templates with multilingual support for Malayalam, Tamil, Kannada, Telugu.</p>
            </article>
          </div>
          <h3>Recommended SDK Stack</h3>
          <ul>
            {sdkList.map((sdk) => (
              <li key={sdk.name}>
                <strong>{sdk.name}</strong>: {sdk.useFor} ({(sdk.platforms || []).join(", ")})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "editor" ? (
        <section className="photostudio-card">
          <h2>Real Editor Engine</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <label>
                Operations (comma separated)
                <input
                  value={editor.operations.join(", ")}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      operations: toTagList(event.target.value),
                    }))
                  }
                />
              </label>

              <label>
                Filters (comma separated)
                <input
                  value={editor.filters.join(", ")}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      filters: toTagList(event.target.value),
                    }))
                  }
                />
              </label>

              <div className="photostudio-grid two">
                <label>
                  Rotate
                  <input
                    type="number"
                    value={editor.rotation}
                    onChange={(event) => setEditor((current) => ({ ...current, rotation: Number(event.target.value || 0) }))}
                  />
                </label>
                <label>
                  Brightness
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="2.5"
                    value={editor.brightness}
                    onChange={(event) => setEditor((current) => ({ ...current, brightness: Number(event.target.value || 1) }))}
                  />
                </label>
                <label>
                  Contrast
                  <input
                    type="number"
                    step="0.05"
                    min="0.4"
                    max="2.5"
                    value={editor.contrast}
                    onChange={(event) => setEditor((current) => ({ ...current, contrast: Number(event.target.value || 1) }))}
                  />
                </label>
                <label>
                  Saturation
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="2.5"
                    value={editor.saturation}
                    onChange={(event) => setEditor((current) => ({ ...current, saturation: Number(event.target.value || 1) }))}
                  />
                </label>
              </div>

              <div className="photostudio-grid two">
                <label>
                  Export preset
                  <select value={exportPreset} onChange={(event) => setExportPreset(event.target.value)}>
                    {EXPORT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Resize Width
                  <input
                    type="number"
                    min="200"
                    value={editor.resize.width}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        resize: { ...current.resize, width: Number(event.target.value || 1080) },
                      }))
                    }
                  />
                </label>
                <label>
                  Resize Height
                  <input
                    type="number"
                    min="200"
                    value={editor.resize.height}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        resize: { ...current.resize, height: Number(event.target.value || 1080) },
                      }))
                    }
                  />
                </label>
              </div>

              <div className="photostudio-grid two">
                <label>
                  Export format
                  <select
                    value={editor.exportFormat}
                    onChange={(event) => setEditor((current) => ({ ...current, exportFormat: event.target.value }))}
                  >
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </label>
                <label>
                  Export quality
                  <select
                    value={editor.quality}
                    onChange={(event) => setEditor((current) => ({ ...current, quality: event.target.value }))}
                  >
                    <option value="standard">Standard</option>
                    <option value="hd">HD</option>
                  </select>
                </label>
              </div>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={editor.removeWatermark}
                  onChange={(event) => setEditor((current) => ({ ...current, removeWatermark: event.target.checked }))}
                />
                Remove watermark (paid/free by plan rules)
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={exportUnlock}
                  onChange={(event) => setExportUnlock(event.target.checked)}
                />
                Unlock pay-per-HD export
              </label>

              <div className="photostudio-inline-actions">
                <button type="button" onClick={handleApplyEdit} disabled={busyKey === "edit"}>
                  {busyKey === "edit" ? "Applying..." : "Apply Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (historyIndex > 0) {
                      setHistoryIndex((current) => current - 1);
                    }
                  }}
                  disabled={historyIndex <= 0}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (historyIndex < historyStack.length - 1) {
                      setHistoryIndex((current) => current + 1);
                    }
                  }}
                  disabled={historyIndex >= historyStack.length - 1}
                >
                  Redo
                </button>
                <button type="button" onClick={handleSaveCreation} disabled={busyKey === "save-creation"}>
                  {busyKey === "save-creation" ? "Saving..." : "Save Creation"}
                </button>
              </div>
              <label>
                Save title
                <input value={saveTitle} onChange={(event) => setSaveTitle(event.target.value)} />
              </label>
            </div>

            <div>
              <h3>Filter Previews (click to apply)</h3>
              <div className="photostudio-tag-wall">
                {availableFilters.map((item) => (
                  <button
                    type="button"
                    key={item._id || item.code}
                    className={`photostudio-filter-chip ${editor.filters.includes(item.code) ? "selected" : ""} ${item.premium ? "premium" : ""}`}
                    onClick={() =>
                      setEditor((current) => ({
                        ...current,
                        filters: current.filters.includes(item.code)
                          ? current.filters.filter((entry) => entry !== item.code)
                          : [...current.filters, item.code],
                      }))
                    }
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <h3>Before / After Slider</h3>
              <div className="photostudio-before-after">
                {initialAssetUrl ? <img src={initialAssetUrl} alt="Before" /> : <p>Upload image to preview.</p>}
                {currentAssetUrl ? (
                  <img
                    src={currentAssetUrl}
                    alt="After"
                    className="after"
                    style={{ clipPath: `inset(0 ${100 - beforeAfterSplit}% 0 0)` }}
                  />
                ) : null}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={beforeAfterSplit}
                onChange={(event) => setBeforeAfterSplit(Number(event.target.value || 50))}
              />
              <p>History: {historyIndex + 1} / {historyStack.length || 0}</p>
              <p>Current URL: {currentAssetUrl || "N/A"}</p>
              <p>Available tools: {availableEditTools.join(", ")}</p>
              {currentStepLabel ? <p className="photostudio-progress-line">Processing: {currentStepLabel}...</p> : null}

              <div className="photostudio-upgrade-panel">
                <h3>Quick 10/10 Studio (Merged Upgrade)</h3>
                <p>Client-side filter + AR sticker + caption preview + one-click export.</p>

                <div className="photostudio-grid two">
                  <label>
                    Filter Preset
                    <select value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)}>
                      {Object.keys(QUICK_FILTER_PRESETS).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    AR Sticker
                    <select value={quickSticker} onChange={(event) => setQuickSticker(event.target.value)}>
                      {QUICK_STICKERS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="photostudio-grid two">
                  <label>
                    Brightness ({quickBrightness}%)
                    <input
                      type="range"
                      min="50"
                      max="160"
                      value={quickBrightness}
                      onChange={(event) => setQuickBrightness(Number(event.target.value || 100))}
                    />
                  </label>
                  <label>
                    Contrast ({quickContrast}%)
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={quickContrast}
                      onChange={(event) => setQuickContrast(Number(event.target.value || 100))}
                    />
                  </label>
                  <label>
                    Blur ({quickBlur}px)
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={quickBlur}
                      onChange={(event) => setQuickBlur(Number(event.target.value || 0))}
                    />
                  </label>
                  <label>
                    Rotate ({quickRotation}deg)
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      value={quickRotation}
                      onChange={(event) => setQuickRotation(Number(event.target.value || 0))}
                    />
                  </label>
                </div>

                <label>
                  Caption
                  <input
                    value={quickCaption}
                    onChange={(event) => setQuickCaption(event.target.value)}
                    placeholder="Add caption..."
                  />
                </label>

                <div className="photostudio-upgrade-preview">
                  {currentAssetUrl ? (
                    <>
                      <img
                        src={currentAssetUrl}
                        alt="Quick upgrade preview"
                        style={{
                          filter: quickFilterStyle,
                          transform: `rotate(${quickRotation}deg)`,
                        }}
                      />
                      <span className="photostudio-upgrade-sticker">{quickSticker}</span>
                      {quickCaption.trim() ? (
                        <div className="photostudio-upgrade-caption">{quickCaption}</div>
                      ) : null}
                    </>
                  ) : (
                    <p>Upload an image to start quick preview.</p>
                  )}
                </div>

                <div className="photostudio-inline-actions">
                  <button type="button" onClick={handleQuickBackgroundRemove}>
                    AI Background Remove
                  </button>
                  <button type="button" onClick={handleQuickExport}>
                    Export Quick 10/10 Image
                  </button>
                </div>
                <canvas ref={quickCanvasRef} className="photostudio-hidden-input" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "ar" ? (
        <section className="photostudio-card">
          <h2>AR Camera Runtime</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <label>
                AR Effect
                <select
                  value={arConfig.effectId}
                  onChange={(event) => {
                    const nextEffect = event.target.value;
                    setArConfig((current) => ({ ...current, effectId: nextEffect }));
                    trackEvent("ar_effect_selected", { effectId: nextEffect });
                  }}
                >
                  {availableArEffects.map((effect) => (
                    <option key={effect.code || effect._id} value={effect.code}>
                      {effect.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Capture mode
                <select
                  value={arConfig.recordMode}
                  onChange={(event) => setArConfig((current) => ({ ...current, recordMode: event.target.value }))}
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <button type="button" onClick={handleStartArSession} disabled={busyKey === "ar-session"}>
                {busyKey === "ar-session" ? "Starting..." : "Start AR Session"}
              </button>
              <div className="photostudio-inline-actions">
                <button type="button" onClick={startArRuntime} disabled={arRuntimeOn}>
                  {arRuntimeOn ? "AR Live" : "Start Live Camera"}
                </button>
                <button type="button" onClick={stopArRuntime} disabled={!arRuntimeOn}>
                  Stop Camera
                </button>
                <button type="button" onClick={handleCaptureArFrame} disabled={!arRuntimeOn}>
                  Capture AR Frame
                </button>
              </div>
              <small>
                Real-time AR uses built-in browser face detection when available; on older devices it runs in compatibility mode.
              </small>
            </div>
            <div>
              <h3>Live Preview</h3>
              <div className="photostudio-ar-runtime">
                <video ref={arVideoRef} className="photostudio-ar-video" playsInline muted />
                <canvas ref={arCanvasRef} className="photostudio-ar-canvas" />
                {!arRuntimeOn ? <div className="photostudio-ar-placeholder">Start Live Camera to preview AR effects</div> : null}
              </div>
              <p>Status: {arRuntimeStatus}</p>
              <p>Faces detected: {arFacesDetected}</p>
              <h3>Session</h3>
              <p>Effect: {arSession?.effectName || "N/A"}</p>
              <p>SDK: {arSession?.sdk || "N/A"}</p>
              <p>Mode: {arSession?.recordMode || "N/A"}</p>
              <p>Permissions: {(arSession?.permissionRequired || []).join(", ") || "camera"}</p>
              <p>Try-on supported: {String(arSession?.supportsTryOn || false)}</p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "studio360" ? (
        <section className="photostudio-card photostudio-360-card">
          <h2>360 Studio</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <label>
                360 Style
                <select value={studio360Style} onChange={(event) => setStudio360Style(event.target.value)}>
                  {AVAILABLE_360_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label>Choose 360 style</label>
                <div className="photostudio-360-style-grid">
                  {AVAILABLE_360_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      className={studio360Style === style.value ? "active" : ""}
                      onClick={() => setStudio360Style(style.value)}
                    >
                      <strong>{style.label}</strong>
                      <span>{style.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleGenerate360} disabled={busyKey === "ai-360"}>
                {busyKey === "ai-360" ? "Rendering 360..." : "Generate 360° Image"}
              </button>
              <p className="photostudio-360-hint">{studio360StyleAdvice}</p>
            </div>
            <div>
              <h3>Preview</h3>
              {studio360Meta ? (
                <div className="photostudio-360-meta">
                  <small>{studio360Meta.viewerType === 'equirectangular' ? 'Interactive panorama output' : '360 preview'}</small>
                  {studio360Meta.width && studio360Meta.height ? (
                    <small>{`${studio360Meta.width}×${studio360Meta.height}`}</small>
                  ) : null}
                </div>
              ) : null}
              <div className="photostudio-360-viewer">
                {studio360Result ? (
                  <div
                    className="viewer-360 interactive"
                    style={{
                      backgroundImage: `url(${studio360Result})`,
                      backgroundPosition: `${viewerPan}% 50%`,
                      backgroundSize: "auto 100%",
                      backgroundRepeat: "no-repeat",
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to pan 360 degree view"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setViewerDragStart({ x: event.clientX, pan: viewerPan });
                    }}
                    onPointerMove={(event) => {
                      if (!viewerDragStart) return;
                      const delta = event.clientX - viewerDragStart.x;
                      const nextPan = Math.max(0, Math.min(100, viewerDragStart.pan + delta * 0.12));
                      setViewerPan(nextPan);
                    }}
                    onPointerUp={() => setViewerDragStart(null)}
                    onPointerCancel={() => setViewerDragStart(null)}
                    onPointerLeave={() => setViewerDragStart(null)}
                  />
                ) : currentAssetUrl ? (
                  <div
                    className="viewer-360 viewer-360-fallback"
                    style={{ backgroundImage: `url(${currentAssetUrl})` }}
                  />
                ) : (
                  <div className="viewer-360 viewer-360-fallback" style={{ display: 'grid', placeItems: 'center', color: '#475569' }}>
                    <p>Upload a photo to preview 360 mode.</p>
                  </div>
                )}
              </div>
              {studio360Result ? (
                <>
                  <label>
                    Drag to pan.
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={viewerPan}
                      onChange={(event) => setViewerPan(Number(event.target.value))}
                    />
                  </label>
                  <div className="photostudio-360-actions">
                    <button
                      type="button"
                      onClick={() => window.open(studio360Result, "_blank")}
                    >
                      Open 360° Output
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const anchor = document.createElement('a');
                        anchor.href = studio360Result;
                        anchor.download = `photo-studio-360-${studio360Style}.jpg`;
                        anchor.click();
                      }}
                    >
                      Download 360° Panorama
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "ai" || tab === "bgremove" || tab === "collage" ? (
        <section className="photostudio-card">
          <h2>{tab === "ai" ? "AI Tools" : tab === "bgremove" ? "Background Remove" : "Collage Pipeline"}</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <div className="photostudio-inline-actions">
                <button type="button" onClick={() => runAiTool("enhance")} disabled={busyKey === "ai-enhance"}>
                  {busyKey === "ai-enhance" ? "Running..." : "AI Enhance"}
                </button>
                <button type="button" onClick={() => runAiTool("background")} disabled={busyKey === "ai-background"}>
                  {busyKey === "ai-background" ? "Running..." : "Background Remove"}
                </button>
                <button type="button" onClick={() => runAiTool("object")} disabled={busyKey === "ai-object"}>
                  {busyKey === "ai-object" ? "Running..." : "Object Remove"}
                </button>
                <button type="button" onClick={() => runAiTool("upscale")} disabled={busyKey === "ai-upscale"}>
                  {busyKey === "ai-upscale" ? "Running..." : "Upscale 2x"}
                </button>
              </div>

              <label>
                Object remove selections (left,top,width,height per line)
                <textarea rows={4} value={objectSelections} onChange={(event) => setObjectSelections(event.target.value)} />
              </label>

              <label>
                Caption / hashtag context
                <textarea rows={4} value={captionContext} onChange={(event) => setCaptionContext(event.target.value)} />
              </label>
              <button type="button" onClick={handleGenerateCaption} disabled={busyKey === "caption"}>
                {busyKey === "caption" ? "Generating..." : "Generate Caption + Hashtags"}
              </button>
            </div>
            <div>
              <h3>AI Result</h3>
              <p>Mode: {aiResult?.mode || "N/A"}</p>
              <p>Output: {aiResult?.outputUrl || aiResult?.enhancedUrl || "N/A"}</p>
              <p>Processed selections: {aiResult?.processedSelections ?? "-"}</p>
              <h3>Caption</h3>
              <p>{captionResult?.caption || "No caption generated yet."}</p>
              <p>{(captionResult?.hashtags || []).join(" ")}</p>
              <h3>Available AI Tools</h3>
              <p>{availableAiTools.join(", ")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "templates" ? (
        <section className="photostudio-card">
          <h2>Template Gallery + Renderer</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <label>
                Category
                <select value={templateCategory} onChange={(event) => setTemplateCategory(event.target.value)}>
                  {(templateCategories.length > 0 ? templateCategories : ["onam", "wedding", "product-ad"]).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select value={templateLanguage} onChange={(event) => setTemplateLanguage(event.target.value)}>
                  <option value="en">English</option>
                  <option value="ml">Malayalam</option>
                  <option value="ta">Tamil</option>
                  <option value="kn">Kannada</option>
                  <option value="te">Telugu</option>
                </select>
              </label>
              <label>
                Template
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  <option value="">Select template</option>
                  {templateResult.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} />
              </label>
              <label>
                Subtitle
                <input value={templateSubtitle} onChange={(event) => setTemplateSubtitle(event.target.value)} />
              </label>
              <button type="button" onClick={handleRenderTemplate} disabled={busyKey === "template-render"}>
                {busyKey === "template-render" ? "Rendering..." : "Render Template"}
              </button>
            </div>
            <div>
              <h3>Rendered output</h3>
              {renderedTemplate?.renderedUrl ? (
                <img className="photostudio-preview-image" src={renderedTemplate.renderedUrl} alt="Rendered template" />
              ) : (
                <p>No template rendered yet.</p>
              )}
            </div>
          </div>

          <div className="photostudio-grid three">
            {templateResult.map((template) => (
              <article key={template._id}>
                <h4>{template.name}</h4>
                <p>{template.category}</p>
                <p>{template.language?.toUpperCase()}</p>
                <p>{template.businessOnly ? "Business" : template.premium ? "Premium" : "Free"}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "my" ? (
        <section className="photostudio-card">
          <h2>My Creations</h2>
          <div className="photostudio-grid three">
            {myCreations.length === 0 ? <p>No creations saved yet.</p> : null}
            {myCreations.map((item) => (
              <article key={item._id}>
                <h3>{item.title}</h3>
                <p>Format: {item.exportFormat}</p>
                <p>Quality: {item.quality}</p>
                <p>Plan: {item.planTier}</p>
                {item.afterUrl ? <img className="photostudio-preview-image" src={item.afterUrl} alt={item.title} /> : null}
                <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                <button type="button" onClick={() => handleDeleteCreation(item._id)} disabled={busyKey === `delete-${item._id}`}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "admin" ? (
        <section className="photostudio-card">
          <h2>Admin Panel</h2>
          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <h3>Add Filter/Sticker/Frame/AR Pack</h3>
              <label>
                Pack name
                <input
                  value={adminPackForm.name}
                  onChange={(event) => setAdminPackForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Category
                <select
                  value={adminPackForm.category}
                  onChange={(event) => setAdminPackForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="filter">Filter</option>
                  <option value="sticker">Sticker</option>
                  <option value="frame">Frame</option>
                  <option value="ar-effect">AR Effect</option>
                  <option value="template">Template</option>
                </select>
              </label>
              <label>
                Tags
                <input
                  value={adminPackForm.tags}
                  onChange={(event) => setAdminPackForm((current) => ({ ...current, tags: event.target.value }))}
                />
              </label>
              <label>
                Preview URL
                <input
                  value={adminPackForm.previewUrl}
                  onChange={(event) => setAdminPackForm((current) => ({ ...current, previewUrl: event.target.value }))}
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={adminPackForm.isPremium}
                  onChange={(event) => setAdminPackForm((current) => ({ ...current, isPremium: event.target.checked }))}
                />
                Premium pack
              </label>
              <button type="button" onClick={handleCreatePack} disabled={busyKey === "create-pack"}>
                {busyKey === "create-pack" ? "Saving..." : "Create Pack"}
              </button>
            </div>

            <div className="photostudio-form">
              <h3>Add Template</h3>
              <label>
                Name
                <input
                  value={adminTemplateForm.name}
                  onChange={(event) => setAdminTemplateForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Category
                <input
                  value={adminTemplateForm.category}
                  onChange={(event) => setAdminTemplateForm((current) => ({ ...current, category: event.target.value }))}
                />
              </label>
              <label>
                Language
                <select
                  value={adminTemplateForm.language}
                  onChange={(event) => setAdminTemplateForm((current) => ({ ...current, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ml">Malayalam</option>
                  <option value="ta">Tamil</option>
                  <option value="kn">Kannada</option>
                  <option value="te">Telugu</option>
                </select>
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={adminTemplateForm.premium}
                  onChange={(event) => setAdminTemplateForm((current) => ({ ...current, premium: event.target.checked }))}
                />
                Premium
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={adminTemplateForm.businessOnly}
                  onChange={(event) =>
                    setAdminTemplateForm((current) => ({ ...current, businessOnly: event.target.checked }))
                  }
                />
                Business only
              </label>
              <button type="button" onClick={handleCreateTemplate} disabled={busyKey === "create-template"}>
                {busyKey === "create-template" ? "Saving..." : "Create Template"}
              </button>
            </div>
          </div>

          <div className="photostudio-grid two">
            <div className="photostudio-form">
              <h3>Monetization + Access</h3>
              <label>
                Free tools
                <input
                  value={planRules.freeTools.join(", ")}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, freeTools: toTagList(event.target.value) }))
                  }
                />
              </label>
              <label>
                Premium tools
                <input
                  value={planRules.premiumTools.join(", ")}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, premiumTools: toTagList(event.target.value) }))
                  }
                />
              </label>
              <label>
                Business tools
                <input
                  value={planRules.businessTools.join(", ")}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, businessTools: toTagList(event.target.value) }))
                  }
                />
              </label>
              <label>
                Pay-per-HD export price
                <input
                  type="number"
                  min="0"
                  value={planRules.payPerExportPrice}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, payPerExportPrice: Number(event.target.value || 0) }))
                  }
                />
              </label>
              <label>
                Watermark text
                <input
                  value={planRules.watermarkText}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, watermarkText: event.target.value }))
                  }
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={planRules.allowFreeWatermarkRemoval}
                  onChange={(event) =>
                    setPlanRules((current) => ({ ...current, allowFreeWatermarkRemoval: event.target.checked }))
                  }
                />
                Allow free watermark removal
              </label>
              <button type="button" onClick={handleUpdatePlanRules} disabled={busyKey === "plan-rules"}>
                {busyKey === "plan-rules" ? "Updating..." : "Update Rules"}
              </button>
            </div>

            <div>
              <h3>Template Approvals</h3>
              <div className="photostudio-grid">
                {adminTemplates.slice(0, 8).map((template) => (
                  <article key={template._id}>
                    <h4>{template.name}</h4>
                    <p>{template.category}</p>
                    <p>{template.approved ? "Approved" : "Pending"}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <h3>Asset Packs</h3>
          <div className="photostudio-grid three">
            {adminPacks.map((pack) => (
              <article key={pack._id}>
                <h4>{pack.name}</h4>
                <p>{pack.category}</p>
                <p>{pack.premium ? "Premium" : "Free"}</p>
                <button type="button" onClick={() => handleDeletePack(pack._id)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {paywallState.open ? (
        <section className="photostudio-card photostudio-paywall">
          <h2>Unlock Premium Output</h2>
          <p>{paywallState.message}</p>
          <p>Pay-per-HD unlock: Rs.{planRules.payPerExportPrice || 29}</p>
          <div className="photostudio-inline-actions">
            <button
              type="button"
              onClick={() => {
                setExportUnlock(true);
                closePaywall();
                pushStatus("success", "HD unlock enabled for this session. Retry your action.");
              }}
            >
              Unlock HD For This Export
            </button>
            <button type="button" onClick={closePaywall}>
              Continue With Free Mode
            </button>
          </div>
          <small>Code: {paywallState.code}</small>
        </section>
      ) : null}

      <section className="photostudio-card">
        <h2>Monetization Snapshot</h2>
        <div className="photostudio-grid three">
          <article>
            <h3>Free</h3>
            <p>{(monetization.free?.includes || []).join(", ") || "Basic edit + limited filters"}</p>
          </article>
          <article>
            <h3>Premium</h3>
            <p>{(monetization.premium?.includes || []).join(", ") || "AI tools + HD export + AR filters"}</p>
          </article>
          <article>
            <h3>Business</h3>
            <p>{(monetization.business?.includes || []).join(", ") || "Product editing + branding templates"}</p>
            <p>Pay-per-HD export: Rs.{monetization.payPerExportPrice ?? planRules.payPerExportPrice}</p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default PhotoStudioAIAR;
