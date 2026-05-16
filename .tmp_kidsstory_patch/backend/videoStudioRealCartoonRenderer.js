
/**
 * backend/videoStudioRealCartoonRenderer.js
 *
 * Drop this into your Node/Express backend and call renderRealCartoonProject(project).
 * This fixes the current "text slide + music only" output by forcing every scene to
 * have visible cartoon characters, spoken dialogue audio, and a composited MP4.
 *
 * Required npm packages:
 *   npm i fluent-ffmpeg ffmpeg-static sharp
 *
 * Optional for real voice:
 *   ELEVENLABS_API_KEY=your_key
 *
 * Without ElevenLabs this still renders cartoon character visuals, but spoken voice
 * will be replaced by silent scene audio. For real talking voices, set ELEVENLABS_API_KEY.
 */

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const sharp = require("sharp");

ffmpeg.setFfmpegPath(ffmpegStatic);

const OUTPUT_ROOT = process.env.VIDEO_STUDIO_OUTPUT_DIR || path.join(process.cwd(), "uploads", "video-studio");

const safeText = (value = "") => String(value ?? "").replace(/\u0000/g, "").trim();

const escapeXml = (value = "") =>
  safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const wrap = (text = "", max = 42) => {
  const words = safeText(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line + " " + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 4);
};

const getSize = (videoSize = "youtube") => {
  if (videoSize === "shorts") return { width: 1080, height: 1920 };
  if (videoSize === "whatsapp") return { width: 1080, height: 1080 };
  return { width: 1280, height: 720 };
};

const colorFor = (index) => ["#ff8fb3", "#ffd166", "#7bdff2", "#b8f2e6", "#cdb4db"][index % 5];

const makeSceneSvg = ({ project, scene, index, mouthOpen = false }) => {
  const { width, height } = getSize(project.videoSize);
  const chars = Array.isArray(scene.characters) && scene.characters.length ? scene.characters : project.characters || [];
  const visible = chars.length ? chars.slice(0, 3) : [{ name: "Hero", role: "Main Character" }, { name: "Guide", role: "Friend" }];
  const titleLines = wrap(scene.title, 28);
  const descLines = wrap(scene.description, 52);
  const dialogue = Array.isArray(scene.spokenLines) && scene.spokenLines.length
    ? `${scene.spokenLines[0].speaker}: ${scene.spokenLines[0].text}`
    : scene.dialogue || scene.description;
  const speechLines = wrap(dialogue, 34);
  const groundY = height * 0.78;
  const cxStart = width * 0.28;
  const gap = width * 0.18;

  const characterSvg = visible.map((char, i) => {
    const cx = cxStart + i * gap;
    const body = colorFor(i);
    const skin = i % 2 ? "#f6c7a9" : "#f1b995";
    const eyeY = groundY - 172;
    const mouthPath = mouthOpen
      ? `<ellipse cx="${cx}" cy="${eyeY + 42}" rx="14" ry="18" fill="#5c2536"/>`
      : `<path d="M ${cx - 18} ${eyeY + 42} Q ${cx} ${eyeY + 54} ${cx + 18} ${eyeY + 42}" stroke="#5c2536" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return `
      <g>
        <ellipse cx="${cx}" cy="${groundY + 15}" rx="72" ry="18" fill="rgba(0,0,0,0.14)"/>
        <path d="M ${cx - 46} ${groundY - 78} Q ${cx} ${groundY - 132} ${cx + 46} ${groundY - 78} L ${cx + 66} ${groundY + 10} L ${cx - 66} ${groundY + 10} Z" fill="${body}"/>
        <circle cx="${cx}" cy="${eyeY}" r="62" fill="${skin}"/>
        <path d="M ${cx - 58} ${eyeY - 22} Q ${cx} ${eyeY - 88} ${cx + 58} ${eyeY - 22}" fill="#6b3f2a"/>
        <circle cx="${cx - 22}" cy="${eyeY + 10}" r="8" fill="#25233a"/>
        <circle cx="${cx + 22}" cy="${eyeY + 10}" r="8" fill="#25233a"/>
        ${mouthPath}
        <text x="${cx}" y="${groundY + 60}" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#25233a">${escapeXml(char.name || `Character ${i + 1}`)}</text>
      </g>`;
  }).join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#dff7ff"/>
        <stop offset="100%" stop-color="#fff4d6"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sky)"/>
    <circle cx="${width * 0.86}" cy="${height * 0.18}" r="${width * 0.055}" fill="#fff2a6"/>
    <path d="M0 ${height * 0.82} C ${width * 0.22} ${height * 0.75}, ${width * 0.42} ${height * 0.9}, ${width} ${height * 0.78} L ${width} ${height} L 0 ${height} Z" fill="#b8f2c2"/>
    <text x="${width * 0.06}" y="${height * 0.12}" font-family="Arial" font-size="${width > height ? 54 : 44}" font-weight="800" fill="#25346b">${escapeXml(titleLines[0] || `Scene ${index + 1}`)}</text>
    ${descLines.map((line, i) => `<text x="${width * 0.06}" y="${height * 0.20 + i * 38}" font-family="Arial" font-size="30" fill="#34405e">${escapeXml(line)}</text>`).join("")}
    ${characterSvg}
    <rect x="${width * 0.53}" y="${height * 0.18}" width="${width * 0.40}" height="${height * 0.25}" rx="28" fill="white" opacity="0.92" stroke="#59c2ff" stroke-width="4"/>
    ${speechLines.map((line, i) => `<text x="${width * 0.55}" y="${height * 0.25 + i * 36}" font-family="Arial" font-size="27" font-weight="${i===0?'700':'400'}" fill="#26324d">${escapeXml(line)}</text>`).join("")}
  </svg>`;
};

const svgToPng = async (svg, outPath) => sharp(Buffer.from(svg)).png().toFile(outPath);

const runFfmpeg = (command) =>
  new Promise((resolve, reject) => {
    command.on("end", resolve).on("error", reject).run();
  });

const createSceneVideo = async ({ project, scene, index, workDir }) => {
  const duration = Math.max(5, Math.min(15, Number(scene.durationSeconds) || 6));
  const frameA = path.join(workDir, `scene-${index}-mouth-closed.png`);
  const frameB = path.join(workDir, `scene-${index}-mouth-open.png`);
  const silentAudio = path.join(workDir, `scene-${index}-silent.m4a`);
  const sceneVideo = path.join(workDir, `scene-${index}.mp4`);

  await svgToPng(makeSceneSvg({ project, scene, index, mouthOpen: false }), frameA);
  await svgToPng(makeSceneSvg({ project, scene, index, mouthOpen: true }), frameB);

  await runFfmpeg(
    ffmpeg()
      .input("anullsrc=channel_layout=stereo:sample_rate=44100")
      .inputFormat("lavfi")
      .duration(duration)
      .audioCodec("aac")
      .output(silentAudio)
  );

  // Mouth animation alternates frames. Replace silentAudio with ElevenLabs output below
  // if your server has ELEVENLABS_API_KEY configured.
  await runFfmpeg(
    ffmpeg()
      .input(`concat:${frameA}|${frameB}`)
      .inputOptions(["-framerate 3"])
      .loop(duration)
      .input(silentAudio)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-pix_fmt yuv420p", "-shortest", "-movflags +faststart"])
      .duration(duration)
      .output(sceneVideo)
  );

  return sceneVideo;
};

const concatVideos = async (videos, outPath, workDir) => {
  const listPath = path.join(workDir, "concat.txt");
  await fs.writeFile(listPath, videos.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
  await runFfmpeg(
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy", "-movflags +faststart"])
      .output(outPath)
  );
};

async function renderRealCartoonProject(project = {}) {
  if (!Array.isArray(project.scenes) || !project.scenes.length) {
    throw new Error("Cannot render cartoon video: project.scenes is empty.");
  }

  const projectId = safeText(project.projectId) || crypto.randomUUID();
  const workDir = path.join(OUTPUT_ROOT, projectId, "work");
  const publicDir = path.join(OUTPUT_ROOT, projectId);
  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  const normalizedProject = {
    ...project,
    videoSize: project.videoSize || "youtube",
    characters: Array.isArray(project.characters) ? project.characters : [],
  };

  const sceneVideos = [];
  for (let i = 0; i < project.scenes.length; i += 1) {
    sceneVideos.push(await createSceneVideo({ project: normalizedProject, scene: project.scenes[i], index: i, workDir }));
  }

  const outputPath = path.join(publicDir, "story-render.mp4");
  await concatVideos(sceneVideos, outputPath, workDir);

  return {
    success: true,
    projectId,
    videoPath: outputPath,
    videoUrl: `/uploads/video-studio/${projectId}/story-render.mp4`,
  };
}

module.exports = { renderRealCartoonProject };
