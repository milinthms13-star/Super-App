const encodeSvg = (svgMarkup) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizeStickerCopy = (value, fallback = '') =>
  String(value || fallback).trim().slice(0, 32);

const makeSticker = ({
  id,
  label,
  text,
  category,
  palette = ['#0ea5e9', '#06b6d4'],
  tags = [],
  animated = false,
  trending = false,
}) => {
  const [fromColor, toColor] = palette;
  const stickerName = normalizeStickerCopy(label, 'Sticker');
  const stickerText = normalizeStickerCopy(text, stickerName) || 'Sticker';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${fromColor}" />
      <stop offset="100%" stop-color="${toColor}" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" rx="52" ry="52" width="300" height="300" fill="url(#g)" />
  <rect x="24" y="24" rx="42" ry="42" width="272" height="272" fill="rgba(255,255,255,0.08)" />
  <text x="160" y="172" text-anchor="middle" dominant-baseline="middle"
    font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">
    ${escapeXml(stickerText)}
  </text>
</svg>`;

  return {
    id,
    name: stickerName,
    text: stickerText,
    category,
    type: 'image',
    url: encodeSvg(svg),
    animated,
    trending,
    tags,
  };
};

export const createSticker = (stickerDefinition) => makeSticker(stickerDefinition);

export const STICKER_CATEGORIES = [
  { id: 'reactions', label: 'Reactions', icon: '💥' },
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'malayalam', label: 'Malayalam', icon: '🌴' },
  { id: 'funny', label: 'Funny', icon: '😂' },
  { id: 'greetings', label: 'Greetings', icon: '👋' },
  { id: 'celebration', label: 'Celebration', icon: '🎉' },
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'cute', label: 'Cute', icon: '🐣' },
  { id: 'food', label: 'Food', icon: '🍲' },
  { id: 'mood', label: 'Mood', icon: '🌈' },
  { id: 'festival', label: 'Festival', icon: '🪔' },
  { id: 'nilahub', label: 'NilaHub', icon: '✨' },
];

export const STICKERS = [
  makeSticker({
    id: 'react-wow',
    label: 'Wow',
    text: 'WOW',
    category: 'reactions',
    palette: ['#0284c7', '#0ea5e9'],
    tags: ['wow', 'reaction', 'impressed'],
    trending: true,
  }),
  makeSticker({
    id: 'react-yes',
    label: 'Yes',
    text: 'YES',
    category: 'reactions',
    palette: ['#16a34a', '#22c55e'],
    tags: ['yes', 'approve', 'done'],
  }),
  makeSticker({
    id: 'react-nope',
    label: 'Nope',
    text: 'NOPE',
    category: 'reactions',
    palette: ['#dc2626', '#ef4444'],
    tags: ['no', 'reject'],
  }),
  makeSticker({
    id: 'love-missyou',
    label: 'Miss You',
    text: 'MISS YOU',
    category: 'love',
    palette: ['#db2777', '#f472b6'],
    tags: ['love', 'miss', 'heart'],
    trending: true,
  }),
  makeSticker({
    id: 'love-xoxo',
    label: 'XOXO',
    text: 'XOXO',
    category: 'love',
    palette: ['#be185d', '#ec4899'],
    tags: ['love', 'romance'],
  }),
  makeSticker({
    id: 'mal-aiyyo',
    label: 'Aiyyo',
    text: 'AIYYO',
    category: 'malayalam',
    palette: ['#7c3aed', '#a78bfa'],
    tags: ['aiyyo', 'malayalam', 'expression'],
    trending: true,
  }),
  makeSticker({
    id: 'mal-pwoli',
    label: 'Pwoli',
    text: 'PWOLI',
    category: 'malayalam',
    palette: ['#0f766e', '#14b8a6'],
    tags: ['pwoli', 'awesome', 'malayalam'],
  }),
  makeSticker({
    id: 'mal-sheri',
    label: 'Sheri',
    text: 'SHERI',
    category: 'malayalam',
    palette: ['#0f766e', '#2dd4bf'],
    tags: ['sheri', 'okay', 'malayalam'],
  }),
  makeSticker({
    id: 'mal-sceneilla',
    label: 'Scene Illa',
    text: 'SCENE ILLA',
    category: 'malayalam',
    palette: ['#1d4ed8', '#38bdf8'],
    tags: ['scene illa', 'chill', 'malayalam'],
  }),
  makeSticker({
    id: 'mal-kidilan',
    label: 'Kidilan',
    text: 'KIDILAN',
    category: 'malayalam',
    palette: ['#ea580c', '#fb923c'],
    tags: ['kidilan', 'super', 'malayalam'],
  }),
  makeSticker({
    id: 'mal-nanni',
    label: 'Nanni',
    text: 'NANNI',
    category: 'malayalam',
    palette: ['#16a34a', '#86efac'],
    tags: ['nanni', 'thanks', 'malayalam'],
  }),
  makeSticker({
    id: 'mal-machane',
    label: 'Machane',
    text: 'MACHANE',
    category: 'malayalam',
    palette: ['#1d4ed8', '#60a5fa'],
    tags: ['machane', 'bro', 'malayalam'],
  }),
  makeSticker({
    id: 'fun-lol',
    label: 'LOL',
    text: 'LOL',
    category: 'funny',
    palette: ['#f59e0b', '#fbbf24'],
    tags: ['laugh', 'lol', 'funny'],
  }),
  makeSticker({
    id: 'fun-rofl',
    label: 'ROFL',
    text: 'ROFL',
    category: 'funny',
    palette: ['#f97316', '#fb7185'],
    tags: ['funny', 'rofl'],
  }),
  makeSticker({
    id: 'greet-hi',
    label: 'Hi',
    text: 'HELLO',
    category: 'greetings',
    palette: ['#0ea5e9', '#6366f1'],
    tags: ['hello', 'hi', 'greetings'],
  }),
  makeSticker({
    id: 'greet-welcome',
    label: 'Welcome',
    text: 'WELCOME',
    category: 'greetings',
    palette: ['#22c55e', '#3b82f6'],
    tags: ['welcome', 'greetings'],
  }),
  makeSticker({
    id: 'celebrate-congrats',
    label: 'Congrats',
    text: 'CONGRATS',
    category: 'celebration',
    palette: ['#ec4899', '#f59e0b'],
    tags: ['congrats', 'celebration'],
    trending: true,
  }),
  makeSticker({
    id: 'celebrate-party',
    label: 'Party',
    text: 'PARTY',
    category: 'celebration',
    palette: ['#7c3aed', '#ec4899'],
    tags: ['party', 'celebrate'],
  }),
  makeSticker({
    id: 'work-urgent',
    label: 'Urgent',
    text: 'URGENT',
    category: 'work',
    palette: ['#dc2626', '#f97316'],
    tags: ['work', 'urgent', 'task'],
  }),
  makeSticker({
    id: 'work-done',
    label: 'Done',
    text: 'DONE',
    category: 'work',
    palette: ['#16a34a', '#10b981'],
    tags: ['done', 'complete'],
  }),
  makeSticker({
    id: 'cute-aww',
    label: 'Aww',
    text: 'AWW',
    category: 'cute',
    palette: ['#f472b6', '#fbcfe8'],
    tags: ['cute', 'aww'],
  }),
  makeSticker({
    id: 'cute-hug',
    label: 'Hug',
    text: 'HUG',
    category: 'cute',
    palette: ['#a78bfa', '#c4b5fd'],
    tags: ['hug', 'cute'],
  }),
  makeSticker({
    id: 'food-yummy',
    label: 'Yummy',
    text: 'YUMMY',
    category: 'food',
    palette: ['#f97316', '#facc15'],
    tags: ['food', 'yummy'],
  }),
  makeSticker({
    id: 'food-teatime',
    label: 'Tea Time',
    text: 'TEA TIME',
    category: 'food',
    palette: ['#16a34a', '#84cc16'],
    tags: ['tea', 'food'],
  }),
  makeSticker({
    id: 'mood-chill',
    label: 'Chill',
    text: 'CHILL',
    category: 'mood',
    palette: ['#0284c7', '#06b6d4'],
    tags: ['mood', 'chill'],
  }),
  makeSticker({
    id: 'mood-hyped',
    label: 'Hyped',
    text: 'HYPED',
    category: 'mood',
    palette: ['#7c2d12', '#f97316'],
    tags: ['mood', 'hyped'],
  }),
  makeSticker({
    id: 'festival-onam',
    label: 'Happy Onam',
    text: 'HAPPY ONAM',
    category: 'festival',
    palette: ['#f59e0b', '#22c55e'],
    tags: ['onam', 'festival'],
  }),
  makeSticker({
    id: 'festival-eid',
    label: 'Eid Mubarak',
    text: 'EID MUBARAK',
    category: 'festival',
    palette: ['#0ea5e9', '#16a34a'],
    tags: ['eid', 'festival'],
  }),
  makeSticker({
    id: 'nilahub-order',
    label: 'Order Placed',
    text: 'ORDER PLACED',
    category: 'nilahub',
    palette: ['#1d4ed8', '#0ea5e9'],
    tags: ['order', 'ecommerce', 'globemart'],
    trending: true,
  }),
  makeSticker({
    id: 'nilahub-driver',
    label: 'Driver Arrived',
    text: 'DRIVER ARRIVED',
    category: 'nilahub',
    palette: ['#0891b2', '#14b8a6'],
    tags: ['driver', 'swiftride'],
  }),
];

export const getStickerById = (stickerId) =>
  STICKERS.find((sticker) => sticker.id === stickerId) || null;
