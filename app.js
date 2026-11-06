/* =========================================================================
 * 手账本 · 自介页编辑器
 * 纯前端 SVG 画布，无外部依赖，本地即可运行
 * ========================================================================= */

/* ---------------- 工具函数 ---------------- */
const $ = (sel) => document.querySelector(sel);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const uid = () => 'el-' + Math.random().toString(36).slice(2, 9);
const normAngle = (a) => ((a % 360) + 360) % 360;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}



/* ---------------- 页面尺寸 / 背景 / 字体 ---------------- */
const PAGE_SIZES = [
  { label: '竖版 · 自介 (1000×1400)', w: 1000, h: 1400 },
  { label: '手账窄页 (900×1300)', w: 900, h: 1300 },
  { label: '方形 (1200×1200)', w: 1200, h: 1200 },
  { label: '横版 (1400×1000)', w: 1400, h: 1000 },
];

const BG_PRESETS = [
  { id: 'paper', name: '奶油纸', color: '#fdf6e3', pattern: null },
  { id: 'white', name: '纯白', color: '#ffffff', pattern: null },
  { id: 'pink', name: '樱花粉', color: '#ffe9ec', pattern: null },
  { id: 'mint', name: '薄荷绿', color: '#e8f4ec', pattern: null },
  { id: 'blue', name: '天空蓝', color: '#e7f2f8', pattern: null },
  { id: 'lilac', name: '香芋紫', color: '#f0eaf7', pattern: null },
  { id: 'grid', name: '方格', color: '#ffffff', pattern: 'grid' },
  { id: 'dots', name: '点阵', color: '#ffffff', pattern: 'dots' },
  { id: 'lines', name: '横线', color: '#ffffff', pattern: 'lines' },
  { id: 'kraft', name: '牛皮纸', color: '#e8d7b4', pattern: 'lines' },
];

const FONTS = [
  { label: '楷体', value: '"Kaiti SC","STKaiti","KaiTi","SimKai",serif' },
  { label: '宋体', value: '"Songti SC","SimSun",serif' },
  { label: '黑体', value: '"PingFang SC","Microsoft YaHei",sans-serif' },
  { label: '圆体', value: '"Yuanti SC","Microsoft YaHei",sans-serif' },
  { label: '手写', value: '"Segoe Print","Comic Sans MS","Chalkboard SE",cursive' },
  { label: '等宽', value: '"Cascadia Mono",Consolas,monospace' },
];

/* ---------------- 资产：形状 ---------------- */
const SHAPES = [
  { kind: 'text', name: '文字', icon: 'text' },
  { kind: 'rect', name: '矩形', icon: 'rect' },
  { kind: 'roundrect', name: '圆角矩形', icon: 'roundrect' },
  { kind: 'circle', name: '圆形', icon: 'circle' },
  { kind: 'ellipse', name: '椭圆', icon: 'ellipse' },
  { kind: 'star', name: '星形', icon: 'star' },
  { kind: 'heart', name: '爱心', icon: 'heart' },
  { kind: 'banner', name: '横幅', icon: 'banner' },
  { kind: 'tape', name: '胶带条', icon: 'tape' },
];

const FRAMES = [
  { kind: 'polaroid', name: '拍立得' },
  { kind: 'white', name: '白边相框' },
  { kind: 'tape', name: '胶带相框' },
  { kind: 'circle', name: '圆形相框' },
  { kind: 'double', name: '双层相框' },
];

const STICKERS = [
  { kind: 'flower', name: '小花' },
  { kind: 'star', name: '星星' },
  { kind: 'heart', name: '爱心' },
  { kind: 'smile', name: '笑脸' },
  { kind: 'sparkle', name: '闪光' },
  { kind: 'bubble', name: '气泡' },
  { kind: 'ribbon', name: '蝴蝶结' },
  { kind: 'washi', name: '纸胶带' },
  { kind: 'dots', name: '波点' },
  { kind: 'moon', name: '月亮' },
];

/* 100×100 基准的 path 内容 */
const PATH_STAR = 'M50 6 L61.2 38.5 L95 38.8 L67.6 58.4 L78.4 92.2 L50 70.6 L21.6 92.2 L32.4 58.4 L5 38.8 L38.8 38.5 Z';
const PATH_HEART = 'M50 86 C22 62 10 45 10 30 C10 18 20 9 31 9 C40 9 47 14 50 22 C53 14 60 9 69 9 C80 9 90 18 90 30 C90 45 78 62 50 86 Z';
const PATH_SPARKLE = 'M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z';
const PATH_BANNER = 'M8 10 H92 L87 25 L92 40 H8 Z';
const PATH_MOON = 'M63 5 A45 45 0 1 0 63 95 A35 35 0 1 1 63 5 Z';

function shapeInner(kind, o) {
  const fill = o.fill || '#ef8b98';
  const stroke = o.stroke || 'none';
  const sw = o.strokeWidth == null ? 2 : o.strokeWidth;
  const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"`;
  switch (kind) {
    case 'rect': return `<rect x="-50" y="-50" width="100" height="100" ${attrs}/>`;
    case 'roundrect': return `<rect x="-50" y="-50" width="100" height="100" rx="${o.rx == null ? 18 : o.rx}" ${attrs}/>`;
    case 'circle': return `<circle cx="0" cy="0" r="50" ${attrs}/>`;
    case 'ellipse': return `<ellipse cx="0" cy="0" rx="50" ry="50" ${attrs}/>`;
    case 'star': return `<path d="${PATH_STAR}" ${attrs}/>`;
    case 'heart': return `<path d="${PATH_HEART}" ${attrs}/>`;
    case 'banner': return `<path d="${PATH_BANNER}" ${attrs}/>`;
    case 'tape': return `<g opacity="0.9"><rect x="-46" y="-14" width="92" height="28" rx="5" ${attrs}/>` +
      `<rect x="-46" y="-14" width="92" height="28" rx="5" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 4"/></g>`;
    case 'text': return `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="30" fill="${fill}">T</text>`;
    default: return `<rect x="-50" y="-50" width="100" height="100" ${attrs}/>`;
  }
}

/* ---------------- 资产：相框 ---------------- */
function frameGeo(kind, w, h) {
  const m = Math.min(w, h);
  switch (kind) {
    case 'polaroid':
      return {
        slot: { x: -w * 0.5 + w * 0.06, y: -h * 0.5 + h * 0.05, w: w * 0.88, h: h * 0.72, rx: 4, shape: 'rect' },
        deco: [],
      };
    case 'white':
      return {
        slot: { x: -w * 0.5 + w * 0.09, y: -h * 0.5 + h * 0.09, w: w * 0.82, h: h * 0.82, rx: 6, shape: 'rect' },
        deco: [],
      };
    case 'tape':
      return {
        slot: { x: -w * 0.5 + w * 0.04, y: -h * 0.5 + h * 0.04, w: w * 0.92, h: h * 0.92, rx: 6, shape: 'rect' },
        deco: ['tape'],
      };
    case 'circle':
      return {
        slot: { x: 0, y: 0, w: m * 0.84, h: m * 0.84, rx: m * 0.42, shape: 'circle' },
        deco: ['circle'],
      };
    case 'double':
      return {
        slot: { x: -w * 0.5 + w * 0.12, y: -h * 0.5 + h * 0.12, w: w * 0.76, h: h * 0.76, rx: 4, shape: 'rect' },
        deco: ['double'],
      };
    default:
      return {
        slot: { x: -w * 0.4, y: -h * 0.4, w: w * 0.8, h: h * 0.8, rx: 4, shape: 'rect' },
        deco: [],
      };
  }
}

function frameInner(kind, fill, photo, clipId, w, h) {
  const geo = frameGeo(kind, w, h);
  const slot = geo.slot;
  let clipShape, slotEl;
  if (slot.shape === 'circle') {
    clipShape = `<circle cx="${slot.x}" cy="${slot.y}" r="${slot.rx}"/>`;
    slotEl = clipShape;
  } else {
    clipShape = `<rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="${slot.rx}"/>`;
    slotEl = clipShape;
  }

  const photoEl = photo
    ? `<image href="${photo}" x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
    : `<g clip-path="url(#${clipId})">
         <rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" fill="#f2e9dc"/>
         <path d="M${slot.x} ${slot.y} L${slot.x + slot.w} ${slot.y + slot.h} M${slot.x + slot.w} ${slot.y} L${slot.x} ${slot.y + slot.h}" stroke="#e2d5c2" stroke-width="2"/>
         <text x="${slot.x + slot.w / 2}" y="${slot.y + slot.h / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.max(16, m(w, h) * 0.08)}" fill="#bfa98f">🖼 放入照片</text>
       </g>`;

  let parts = `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>`;

  if (kind === 'polaroid') {
    parts += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="${fill || '#ffffff'}" stroke="#e6d8c4" stroke-width="2"/>`;
  } else if (kind === 'white') {
    parts += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="${fill || '#ffffff'}" stroke="#e6d8c4" stroke-width="2"/>`;
  } else if (kind === 'double') {
    parts += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="${fill || '#ffffff'}"/>`;
    parts += `<rect x="${-w / 2 + 8}" y="${-h / 2 + 8}" width="${w - 16}" height="${h - 16}" rx="6" fill="none" stroke="#e6d8c4" stroke-width="3"/>`;
  } else if (kind === 'circle') {
    parts += `<circle cx="0" cy="0" r="${m(w, h) / 2}" fill="${fill || '#ffffff'}" stroke="#e6d8c4" stroke-width="2"/>`;
  }

  parts += photoEl;

  if (geo.deco.includes('tape')) {
    const t = Math.max(18, m(w, h) * 0.12);
    parts += `<g fill="#f6c445" opacity="0.85">
      <rect x="${-t / 2}" y="${-h / 2 - 4}" width="${t}" height="${t * 0.6}" rx="3" transform="rotate(18 ${-t / 2 + t / 2} ${-h / 2 - 4 + t * 0.3})"/>
      <rect x="${w / 2 - t / 2}" y="${-h / 2 - 4}" width="${t}" height="${t * 0.6}" rx="3" transform="rotate(-14 ${w / 2} ${-h / 2 - 4 + t * 0.3})"/>
      <rect x="${-t / 2}" y="${h / 2 - t * 0.6 + 4}" width="${t}" height="${t * 0.6}" rx="3" transform="rotate(-16 ${-t / 2 + t / 2} ${h / 2 + 4})"/>
      <rect x="${w / 2 - t / 2}" y="${h / 2 - t * 0.6 + 4}" width="${t}" height="${t * 0.6}" rx="3" transform="rotate(12 ${w / 2} ${h / 2 + 4})"/>
    </g>`;
  }
  return parts;
}

/* ---------------- 资产：贴纸 ---------------- */
function stickerInner(kind, fill) {
  const f = fill || '#ef8b98';
  switch (kind) {
    case 'flower':
      return `<g fill="${f}">${[0, 72, 144, 216, 288].map((a) =>
        `<ellipse cx="50" cy="33" rx="11" ry="21" transform="rotate(${a} 50 50)"/>`).join('')}</g>` +
        `<circle cx="50" cy="50" r="11" fill="#f6c445"/>`;
    case 'star': return `<path d="${PATH_STAR}" fill="${f}"/>`;
    case 'heart': return `<path d="${PATH_HEART}" fill="${f}"/>`;
    case 'smile':
      return `<circle cx="50" cy="50" r="45" fill="#ffd66b"/>` +
        `<circle cx="36" cy="42" r="4.5" fill="#4b3a33"/>` +
        `<circle cx="64" cy="42" r="4.5" fill="#4b3a33"/>` +
        `<path d="M33 58 Q50 74 67 58" fill="none" stroke="#4b3a33" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="27" cy="56" r="6" fill="#ffb3b8" opacity="0.85"/>` +
        `<circle cx="73" cy="56" r="6" fill="#ffb3b8" opacity="0.85"/>`;
    case 'sparkle': return `<path d="${PATH_SPARKLE}" fill="${f}"/>`;
    case 'bubble':
      return `<path d="M10 14 h80 a10 10 0 0 1 10 10 v44 a10 10 0 0 1 -10 10 H52 L36 92 L42 78 H10 a10 10 0 0 1 -10 -10 V24 a10 10 0 0 1 10 -10 Z" fill="${f}"/>` +
        `<circle cx="38" cy="52" r="4" fill="#ffffff" opacity="0.9"/><circle cx="50" cy="52" r="4" fill="#ffffff" opacity="0.9"/><circle cx="62" cy="52" r="4" fill="#ffffff" opacity="0.9"/>`;
    case 'ribbon':
      return `<path d="M50 46 Q26 30 22 22 Q38 22 50 38 Z" fill="${f}"/>` +
        `<path d="M50 46 Q74 30 78 22 Q62 22 50 38 Z" fill="${f}"/>` +
        `<path d="M50 46 Q28 62 30 78 Q46 70 50 52 Z" fill="${f}" opacity="0.75"/>` +
        `<path d="M50 46 Q72 62 70 78 Q54 70 50 52 Z" fill="${f}" opacity="0.75"/>` +
        `<rect x="42" y="38" width="16" height="14" rx="4" fill="#ffffff" opacity="0.9"/>`;
    case 'washi':
      return `<g opacity="0.9"><rect x="6" y="40" width="88" height="20" rx="4" fill="${f}" transform="rotate(-10 50 50)"/>` +
        `<rect x="6" y="40" width="88" height="20" rx="4" fill="none" stroke="#ffffff" stroke-dasharray="4 4" stroke-width="2" transform="rotate(-10 50 50)"/></g>`;
    case 'dots':
      return `<g fill="${f}"><circle cx="22" cy="22" r="10"/><circle cx="78" cy="22" r="10"/>` +
        `<circle cx="22" cy="78" r="10"/><circle cx="78" cy="78" r="10"/><circle cx="50" cy="50" r="14" opacity="0.7"/></g>`;
    case 'moon': return `<path d="${PATH_MOON}" fill="${f}"/>`;
    default: return `<circle cx="50" cy="50" r="45" fill="${f}"/>`;
  }
}

/* ---------------- 状态 ---------------- */
const STORAGE_KEY = 'syau-scrapbook-v2';

let state = {
  page: { w: 1000, h: 1400, bg: { color: '#fdf6e3', pattern: null } },
  pages: [{ items: [] }],
  currentPage: 0,
  lastPage: 0,
};

const stage = $('#stage');
const svgNS = 'http://www.w3.org/2000/svg';

function currentPageData() { return state.pages[state.currentPage]; }
function currentItems() { return currentPageData().items; }
function getItem(id) { return currentItems().find((i) => i.id === id); }

function defaultName(type) {
  switch (type) {
    case 'shape': return '形状';
    case 'frame': return '相框';
    case 'sticker': return '贴纸';
    case 'image': return '照片';
    case 'text': return '文字';
    default: return '元素';
  }
}

function createItem(partial) {
  const item = {
    id: uid(),
    type: 'shape',
    name: '元素',
    x: state.page.w / 2,
    y: state.page.h / 2,
    w: 160,
    h: 120,
    rotation: 0,
    hidden: false,
    ...partial,
  };
  if (!partial || !partial.name) item.name = defaultName(item.type);
  currentItems().push(item);
  return item;
}

/* ---------------- 元素渲染 ---------------- */
function renderItem(item) {
  const t = `translate(${item.x} ${item.y}) rotate(${item.rotation})`;
  const wrap = `<g class="layer" data-id="${item.id}" transform="${t}">`;

  if (item.type === 'text') {
    const txt = item.text || {};
    const fs = txt.fontSize || 48;
    const fill = txt.fill || '#4b3a33';
    const weight = txt.bold ? 700 : 400;
    const fontFamily = txt.fontFamily || FONTS[0].value;
    const content = (txt.content == null || txt.content === '') ? '文字' : txt.content;
    const lines = String(content).split('\n');
    const lineH = fs * 1.3;
    const startY = -((lines.length - 1) * lineH) / 2;
    const tspans = lines.map((l, i) =>
      `<tspan x="0" y="${startY + i * lineH}">${esc(l)}</tspan>`).join('');
    return `${wrap}<text text-anchor="middle" font-size="${fs}" font-weight="${weight}" fill="${fill}" font-family="${esc(fontFamily)}">${tspans}</text></g>`;
  }

  if (item.type === 'shape') {
    const s = item.shape || {};
    // rect 系列用原生坐标，path 系列用 100×100 基准缩放
    if (['rect', 'roundrect', 'circle', 'ellipse'].includes(s.kind)) {
      const fill = s.fill || '#ef8b98';
      const stroke = s.stroke || 'none';
      const sw = s.strokeWidth == null ? 2 : s.strokeWidth;
      const w = item.w, h = item.h;
      let inner;
      if (s.kind === 'rect') inner = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      else if (s.kind === 'roundrect') inner = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${s.rx == null ? Math.min(w, h) * 0.16 : s.rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      else if (s.kind === 'circle') inner = `<circle cx="0" cy="0" r="${Math.min(w, h) / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      else inner = `<ellipse cx="0" cy="0" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      return `${wrap}${inner}</g>`;
    }
    const scaleContent = `<g transform="translate(${-item.w / 2} ${-item.h / 2}) scale(${item.w / 100} ${item.h / 100})">${shapeInner(s.kind, s)}</g>`;
    return `${wrap}${scaleContent}</g>`;
  }

  if (item.type === 'sticker') {
    const s = item.sticker || {};
    return `${wrap}<g transform="translate(${-item.w / 2} ${-item.h / 2}) scale(${item.w / 100} ${item.h / 100})">${stickerInner(s.kind, s.fill)}</g></g>`;
  }

  if (item.type === 'image') {
    const im = item.image || {};
    return `${wrap}<image href="${im.src}" x="${-item.w / 2}" y="${-item.h / 2}" width="${item.w}" height="${item.h}" preserveAspectRatio="xMidYMid slice"/></g>`;
  }

  if (item.type === 'frame') {
    const f = item.frame || {};
    return `${wrap}${frameInner(f.kind, f.fill, f.photo, 'clip-' + item.id, item.w, item.h)}</g>`;
  }

  return `${wrap}<rect x="${-item.w / 2}" y="${-item.h / 2}" width="${item.w}" height="${item.h}" fill="#ef8b98"/></g>`;
}

function m(w, h) { return Math.min(w, h); }

/* ---------------- 背景渲染 ---------------- */
function renderBackground() {
  const bg = state.page.bg || { color: '#fdf6e3', pattern: null };
  let defs = '';
  if (bg.pattern) {
    const c = '#e7dcc9';
    let inner = '';
    if (bg.pattern === 'grid') inner = `<path d="M40 0 H0 V40" fill="none" stroke="${c}" stroke-width="1"/>`;
    else if (bg.pattern === 'dots') inner = `<circle cx="20" cy="20" r="2.5" fill="${c}"/>`;
    else if (bg.pattern === 'lines') inner = `<line x1="0" y1="40" x2="40" y2="40" stroke="${c}" stroke-width="1.2"/>`;
    defs = `<defs><pattern id="bgPattern" width="40" height="40" patternUnits="userSpaceOnUse">${inner}</pattern></defs>`;
  }
  const fill = bg.pattern ? `url(#bgPattern)` : bg.color;
  return {
    defs,
    rect: `<rect id="bgRect" x="0" y="0" width="${state.page.w}" height="${state.page.h}" fill="${bg.color}"/>` +
      (bg.pattern ? `<rect x="0" y="0" width="${state.page.w}" height="${state.page.h}" fill="${fill}"/>` : ''),
  };
}

/* ---------------- 画布重绘 ---------------- */
function redraw() {
  const bg = renderBackground();
  const layers = currentItems().filter((i) => !i.hidden).map(renderItem).join('');
  stage.innerHTML = bg.defs + bg.rect + layers + `<g id="selection-ui"></g>`;
  renderSelection();
}

function screenScale() {
  const ctm = stage.getScreenCTM && stage.getScreenCTM();
  return (ctm && ctm.a) || 1;
}

function renderSelection() {
  const ui = $('#selection-ui');
  if (!ui) return;
  const sel = state.selection ? getItem(state.selection) : null;
  if (!sel || sel.hidden) { ui.innerHTML = ''; return; }
  const scale = screenScale();
  const hs = Math.max(7, 12 / scale);
  const sw = 1.6 / scale;
  const w = sel.w, h = sel.h;
  const pts = {
    nw: [-w / 2, -h / 2], n: [0, -h / 2], ne: [w / 2, -h / 2], e: [w / 2, 0],
    se: [w / 2, h / 2], s: [0, h / 2], sw: [-w / 2, h / 2], w: [-w / 2, 0],
  };
  const handles = Object.entries(pts).map(([d, [x, y]]) =>
    `<rect class="handle ${d}" data-h="${d}" x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="${hs * 0.25}"/>`).join('');
  const rotY = -h / 2 - 26 / scale;
  const rotR = hs / 2 + 2;
  ui.innerHTML =
    `<g transform="translate(${sel.x} ${sel.y}) rotate(${sel.rotation})">` +
    `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="#e06a7a" stroke-width="${sw}" stroke-dasharray="${6 / scale} ${4 / scale}"/>` +
    handles +
    `<line x1="0" y1="${-h / 2}" x2="0" y2="${rotY}" stroke="#e06a7a" stroke-width="${sw}"/>` +
    `<circle class="rot-handle" data-h="rot" cx="0" cy="${rotY}" r="${rotR}" fill="#e06a7a" stroke="#fff" stroke-width="${sw}"/>` +
    `</g>`;
}

/* ---------------- 选中 ---------------- */
function select(id) {
  state.selection = id || null;
  redraw();
  renderLayers();
  renderProps();
}

/* ---------------- 图层列表 ---------------- */
function renderLayers() {
  const list = $('#layersList');
  if (!list) return;
  const items = currentItems();
  if (items.length === 0) {
    list.innerHTML = `<p class="empty-note">还没有元素，从左侧添加。</p>`;
    return;
  }
  // 倒序：最上层在最上面
  list.innerHTML = [...items].map((item, idx) => {
    const arrIdx = items.length - 1 - idx;
    const target = items[arrIdx];
    const icon = target.type === 'text' ? '🔤' :
      target.type === 'image' ? '🖼' :
      target.type === 'frame' ? '📷' :
      target.type === 'sticker' ? '✨' : '🟦';
    return `<div class="layer-item ${target.id === state.selection ? 'selected' : ''} ${target.hidden ? 'hidden-item' : ''}" data-id="${target.id}">
      <span class="layer-icon">${icon}</span>
      <span class="layer-name">${esc(target.name)}</span>
      <span class="layer-eye" data-eye="${target.id}" title="显示/隐藏">${target.hidden ? '🙈' : '👁'}</span>
    </div>`;
  }).join('');
}

/* ---------------- 属性面板 ---------------- */
function renderProps() {
  const body = $('#propsBody');
  const sel = state.selection ? getItem(state.selection) : null;
  if (!sel) {
    body.innerHTML = `<p class="empty-note">未选中元素。<br>点击画布上的元素即可编辑。</p>`;
    return;
  }

  const colorField = (field, value, label) =>
    `<div class="prop-row"><label>${label}</label><input type="color" data-field="${field}" value="${value || '#ef8b98'}"></div>`;

  let html = `
    <div class="prop-row"><label>名称</label><input type="text" data-field="name" value="${esc(sel.name)}"></div>
    <div class="prop-row"><label>位置 / 尺寸 / 旋转</label>
      <div class="prop-inline">
        <input type="number" data-field="x" value="${Math.round(sel.x)}" title="X"><span>×</span>
        <input type="number" data-field="y" value="${Math.round(sel.y)}" title="Y">
      </div>
      <div class="prop-inline" style="margin-top:6px">
        <input type="number" data-field="w" value="${Math.round(sel.w)}" title="宽"><span>×</span>
        <input type="number" data-field="h" value="${Math.round(sel.h)}" title="高">
      </div>
      <div class="prop-inline" style="margin-top:6px">
        <input type="range" data-field="rotation" min="0" max="360" value="${Math.round(normAngle(sel.rotation))}" title="旋转">
        <span class="prop-hint">${Math.round(normAngle(sel.rotation))}°</span>
      </div>
    </div>`;

  if (sel.type === 'shape') {
    const s = sel.shape || {};
    html += colorField('fill', s.fill, '填充色');
    html += `<div class="prop-row"><label>描边</label><div class="prop-inline">
      <input type="color" data-field="stroke" value="${s.stroke && s.stroke !== 'none' ? s.stroke : '#4b3a33'}">
      <input type="number" data-field="strokeWidth" value="${s.strokeWidth == null ? 2 : s.strokeWidth}" min="0" max="30" title="描边粗细">
      </div></div>`;
  } else if (sel.type === 'sticker') {
    const s = sel.sticker || {};
    html += colorField('fill', s.fill, '主色调');
  } else if (sel.type === 'frame') {
    const f = sel.frame || {};
    html += colorField('fill', f.fill, '边框色');
    html += `<div class="prop-row"><label>照片</label>
      <div class="prop-actions">
        <button class="btn" data-action="frame-photo">${f.photo ? '🔄 换照片' : '🖼 放入照片'}</button>
        ${f.photo ? `<button class="btn" data-action="frame-clear">移除照片</button>` : ''}
      </div></div>`;
  } else if (sel.type === 'image') {
    html += `<div class="prop-row"><label>图片</label>
      <div class="prop-actions">
        <button class="btn" data-action="recrop">✂ 重新裁剪</button>
      </div>
      <p class="prop-hint">拖动角落可缩放；按住 Shift 等比缩放。</p></div>`;
  } else if (sel.type === 'text') {
    const t = sel.text || {};
    html += `<div class="prop-row"><label>文字内容</label><textarea data-field="content">${esc(t.content || '')}</textarea></div>`;
    html += colorField('fill', t.fill, '文字颜色');
    html += `<div class="prop-row"><label>字号</label><input type="range" data-field="fontSize" min="12" max="300" value="${t.fontSize || 48}"></div>`;
    html += `<div class="prop-row"><label>字体</label><select data-field="fontFamily">
      ${FONTS.map((f) => `<option value="${esc(f.value)}" ${(t.fontFamily || FONTS[0].value) === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
      </select></div>`;
    html += `<div class="prop-row"><label><input type="checkbox" data-field="bold" ${t.bold ? 'checked' : ''}> 加粗</label></div>`;
  }

  html += `<div class="prop-actions" style="margin-top:12px">
    <button class="btn" data-action="front">⤒ 置顶</button>
    <button class="btn" data-action="back">⤓ 置底</button>
    <button class="btn" data-action="dup">⧉ 复制</button>
    <button class="btn" data-action="del">🗑 删除</button>
  </div>`;

  body.innerHTML = html;
}

/* ---------------- 画布交互 ---------------- */
let canvasOp = null;

function svgPoint(e) {
  const ctm = stage.getScreenCTM && stage.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function svgToLocal(e, item) {
  const p = svgPoint(e);
  const dx = p.x - item.x, dy = p.y - item.y;
  const rad = item.rotation * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

function onStagePointerDown(e) {
  if (isFlipping) return;
  const handle = e.target.closest('.handle');
  if (handle && state.selection) {
    e.preventDefault();
    if (handle.dataset.h === 'rot') startRotate(e);
    else startResize(e, handle.dataset.h);
    return;
  }
  const layer = e.target.closest('.layer');
  if (layer) {
    e.preventDefault();
    const id = layer.dataset.id;
    if (state.selection !== id) select(id);
    startDrag(e, id);
    return;
  }
  // 空白
  if (state.selection) select(null);
}

function startDrag(e, id) {
  const item = getItem(id);
  if (!item) return;
  canvasOp = { type: 'drag', item, startP: svgPoint(e), startC: { x: item.x, y: item.y } };
  stage.classList.add('dragging');
}

function startResize(e, dir) {
  const item = getItem(state.selection);
  if (!item) return;
  const hx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0;
  const hy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
  canvasOp = {
    type: 'resize', item, hx, hy,
    startW: item.w, startH: item.h,
    startC: { x: item.x, y: item.y },
    rot: item.rotation * Math.PI / 180,
    anchor: { x: -hx * item.w / 2, y: -hy * item.h / 2 },
  };
}

function startRotate(e) {
  const item = getItem(state.selection);
  if (!item) return;
  const p = svgToLocal(e, item);
  canvasOp = { type: 'rotate', item, startAngle: Math.atan2(p.y, p.x), startRot: item.rotation };
}

function handleCanvasMove(e) {
  if (!canvasOp) return;
  const op = canvasOp;
  if (op.type === 'drag') {
    const p = svgPoint(e);
    op.item.x = op.startC.x + (p.x - op.startP.x);
    op.item.y = op.startC.y + (p.y - op.startP.y);
  } else if (op.type === 'resize') {
    const p = svgToLocal(e, op.item);
    const a = op.anchor;
    const cos = Math.cos(op.rot), sin = Math.sin(op.rot);
    let halfW, halfH, cxLocal = 0, cyLocal = 0;
    const isCorner = op.hx !== 0 && op.hy !== 0;

    if (isCorner && e.shiftKey) {
      const origDiag = Math.hypot(op.startW, op.startH);
      const curDiag = Math.hypot(p.x - a.x, p.y - a.y);
      const s = Math.max(0.08, curDiag / origDiag);
      halfW = Math.max(6, op.startW / 2 * s);
      halfH = Math.max(6, op.startH / 2 * s);
      op.item.w = halfW * 2; op.item.h = halfH * 2;
      cxLocal = op.hx * (op.item.w - op.startW) / 2;
      cyLocal = op.hy * (op.item.h - op.startH) / 2;
    } else {
      if (op.hx !== 0) { halfW = Math.max(6, Math.abs(p.x - a.x) / 2); cxLocal = (a.x + p.x) / 2; }
      else { halfW = op.startW / 2; }
      if (op.hy !== 0) { halfH = Math.max(6, Math.abs(p.y - a.y) / 2); cyLocal = (a.y + p.y) / 2; }
      else { halfH = op.startH / 2; }
      op.item.w = halfW * 2; op.item.h = halfH * 2;
    }
    op.item.x = op.startC.x + cxLocal * cos - cyLocal * sin;
    op.item.y = op.startC.y + cxLocal * sin + cyLocal * cos;
  } else if (op.type === 'rotate') {
    const p = svgToLocal(e, op.item);
    const ang = Math.atan2(p.y, p.x) * 180 / Math.PI;
    op.item.rotation = normAngle(op.startRot + (ang - op.startAngle * 180 / Math.PI));
  }
  redraw();
}

function handleCanvasUp() {
  if (!canvasOp) return;
  canvasOp = null;
  stage.classList.remove('dragging');
  renderProps();
  scheduleSave();
}

/* ---------------- 图层操作 ---------------- */
function zIndexAction(action) {
  const id = state.selection;
  if (!id) return;
  const items = currentItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const [item] = items.splice(idx, 1);
  if (action === 'front') items.push(item);
  else if (action === 'back') items.unshift(item);
  else if (action === 'up') items.splice(Math.min(idx + 1, items.length), 0, item);
  else if (action === 'down') items.splice(Math.max(idx - 1, 0), 0, item);
  redraw();
  renderLayers();
  scheduleSave();
}

function duplicateSelection() {
  const id = state.selection;
  const src = id && getItem(id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' 副本';
  copy.x += 24; copy.y += 24;
  currentItems().push(copy);
  select(copy.id);
  scheduleSave();
}

function deleteSelection() {
  const id = state.selection;
  if (!id) return;
  state.pages[state.currentPage].items = currentItems().filter((i) => i.id !== id);
  state.selection = null;
  redraw();
  renderLayers();
  renderProps();
  scheduleSave();
}

/* ---------------- 翻页 ---------------- */
let isFlipping = false;

function updatePager() {
  const info = $('#pagerInfo');
  if (info) info.textContent = `${state.currentPage + 1} / ${state.pages.length}`;
  const prev = $('#btnPrevPage'), next = $('#btnNextPage'), del = $('#btnDelPage');
  if (prev) prev.disabled = state.currentPage <= 0;
  if (next) next.disabled = state.currentPage >= state.pages.length - 1;
  if (del) del.disabled = state.pages.length <= 1;
}

function goToPage(idx, animate = true) {
  const n = state.pages.length;
  if (n === 0) return;
  idx = clamp(idx, 0, n - 1);
  if (idx === state.currentPage) return;
  if (isFlipping) return;

  if (animate) {
    isFlipping = true;
    stage.classList.add('flip-out');
    setTimeout(() => {
      state.currentPage = idx;
      state.lastPage = idx;
      state.selection = null;
      redraw();
      renderLayers();
      renderProps();
      updatePager();
      scheduleSave();
      stage.classList.remove('flip-out');
      stage.classList.add('flip-in');
      setTimeout(() => {
        stage.classList.remove('flip-in');
        isFlipping = false;
      }, 260);
    }, 190);
  } else {
    state.currentPage = idx;
    state.lastPage = idx;
    state.selection = null;
    redraw();
    renderLayers();
    renderProps();
    updatePager();
    scheduleSave();
  }
}

function addPage() {
  state.pages.push({ items: [] });
  goToPage(state.pages.length - 1, false);
  renderLayers();
  renderProps();
}

function delPage() {
  if (state.pages.length <= 1) return;
  const idx = state.currentPage;
  state.pages.splice(idx, 1);
  state.currentPage = clamp(idx, 0, state.pages.length - 1);
  state.selection = null;
  redraw();
  renderLayers();
  renderProps();
  updatePager();
  scheduleSave();
}

function toggleHidden(id) {
  const item = getItem(id);
  if (!item) return;
  item.hidden = !item.hidden;
  redraw();
  renderLayers();
  renderProps();
  scheduleSave();
}

/* ---------------- 属性面板事件 ---------------- */
function onPropInput(e) {
  const sel = state.selection ? getItem(state.selection) : null;
  if (!sel) return;
  const el = e.target;
  const field = el.dataset.field;
  if (!field) return;
  const val = el.type === 'checkbox' ? el.checked : el.value;

  const num = () => { const v = parseFloat(val); return isNaN(v) ? null : v; };

  if (field === 'name') sel.name = val;
  else if (field === 'x') { const v = num(); if (v !== null) sel.x = v; }
  else if (field === 'y') { const v = num(); if (v !== null) sel.y = v; }
  else if (field === 'w') { const v = num(); if (v !== null) sel.w = Math.max(10, v); }
  else if (field === 'h') { const v = num(); if (v !== null) sel.h = Math.max(10, v); }
  else if (field === 'rotation') { const v = num(); if (v !== null) sel.rotation = v; }
  else if (field === 'fill') { const key = sel.type === 'text' ? 'text' : sel.type === 'sticker' ? 'sticker' : sel.type === 'frame' ? 'frame' : 'shape'; sel[key] = sel[key] || {}; sel[key].fill = val; }
  else if (field === 'stroke') { const key = 'shape'; sel[key] = sel[key] || {}; sel[key].stroke = val; }
  else if (field === 'strokeWidth') { const v = num(); if (v !== null) { sel.shape = sel.shape || {}; sel.shape.strokeWidth = v; } }
  else if (field === 'content') { sel.text = sel.text || {}; sel.text.content = val; }
  else if (field === 'fontSize') { const v = num(); if (v !== null) { sel.text = sel.text || {}; sel.text.fontSize = v; } }
  else if (field === 'fontFamily') { sel.text = sel.text || {}; sel.text.fontFamily = val; }
  else if (field === 'bold') { sel.text = sel.text || {}; sel.text.bold = val; }

  redraw();
  scheduleSave();
}

function onPropClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  switch (action) {
    case 'front': zIndexAction('front'); break;
    case 'back': zIndexAction('back'); break;
    case 'dup': duplicateSelection(); break;
    case 'del': deleteSelection(); break;
    case 'recrop': startRecrop(); break;
    case 'frame-photo': startFramePhoto(); break;
    case 'frame-clear': { const sel = getItem(state.selection); if (sel && sel.frame) { sel.frame.photo = null; redraw(); renderProps(); scheduleSave(); } break; }
  }
}

/* ---------------- 素材面板 ---------------- */
function assetCard(title, innerSvg) {
  return `<div class="asset-card" data-asset>
    <svg viewBox="0 0 100 100">${innerSvg}</svg>
    <span class="asset-name">${esc(title)}</span>
  </div>`;
}

function renderAssetGrids() {
  $('#shapesGrid').innerHTML = SHAPES.map((s) =>
    assetCard(s.name, s.kind === 'text' ? shapeInner('text', { fill: '#4b3a33' }) : shapeInner(s.kind, { fill: '#ef8b98' }))).join('');

  $('#framesGrid').innerHTML = FRAMES.map((f) => {
    const w = 60, h = 60;
    const clipId = 'preview-clip-' + f.kind;
    return assetCard(f.name, frameInner(f.kind, '#ffffff', null, clipId, w, h));
  }).join('');

  $('#stickersGrid').innerHTML = STICKERS.map((s) =>
    assetCard(s.name, stickerInner(s.kind, '#ef8b98'))).join('');
}

/* ---------------- 素材点击添加 ---------------- */
function onAssetGridClick(e) {
  const card = e.target.closest('[data-asset]');
  if (!card) return;
  const name = card.querySelector('.asset-name').textContent;

  if ($('#shapesGrid').contains(card)) {
    const shape = SHAPES.find((s) => s.name === name);
    if (!shape) return;
    if (shape.kind === 'text') {
      const item = createItem({ type: 'text', name: '文字', w: 240, h: 120, text: { content: '点击这里修改文字', fontSize: 52, fill: '#4b3a33', fontFamily: FONTS[0].value, bold: false } });
      select(item.id);
    } else {
      const w = shape.kind === 'circle' ? 140 : 180;
      const h = shape.kind === 'circle' ? 140 : shape.kind === 'banner' ? 90 : shape.kind === 'tape' ? 220 : 120;
      const item = createItem({ type: 'shape', name: shape.name, w, h, shape: { kind: shape.kind, fill: '#ef8b98', stroke: 'none', strokeWidth: 2 } });
      select(item.id);
    }
    scheduleSave();
  } else if ($('#framesGrid').contains(card)) {
    const frame = FRAMES.find((f) => f.name === name);
    if (!frame) return;
    const item = createItem({ type: 'frame', name: frame.name, w: 260, h: 260, frame: { kind: frame.kind, fill: '#ffffff', photo: null } });
    select(item.id);
    scheduleSave();
  } else if ($('#stickersGrid').contains(card)) {
    const st = STICKERS.find((s) => s.name === name);
    if (!st) return;
    const item = createItem({ type: 'sticker', name: st.name, w: 110, h: 110, sticker: { kind: st.kind, fill: '#ef8b98' } });
    select(item.id);
    scheduleSave();
  }
}

/* ---------------- 上传 & 裁剪 ---------------- */
const cropState = {
  img: null, naturalW: 0, naturalH: 0,
  imgX: 0, imgY: 0, displayW: 0, displayH: 0,
  box: { x: 0, y: 0, w: 0, h: 0 },
  ratio: null,
  mode: 'new', // new | recrop | frame
  targetId: null,
};

let cropOp = null;
let pendingFrameTarget = null;

const cropViewport = $('#cropViewport');
const cropImage = $('#cropImage');
const cropBox = $('#cropBox');

function openCropModal(src, opts = {}) {
  cropState.mode = opts.mode || 'new';
  cropState.targetId = opts.targetId || null;
  cropState.ratio = null;
  $('#cropRatios .active')?.classList.remove('active');
  $('#cropRatios [data-ratio="free"]')?.classList.add('active');

  loadImage(src).then((img) => {
    cropState.img = img;
    cropState.naturalW = img.naturalWidth;
    cropState.naturalH = img.naturalHeight;
    cropImage.src = src;
    $('#cropModal').hidden = false;
    requestAnimationFrame(() => layoutCropImage(opts.initialCrop));
  }).catch(() => {
    alert('图片加载失败，请换一张试试。');
  });
}

function layoutCropImage(initialCrop) {
  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;
  const maxW = vw * 0.88, maxH = vh * 0.88;
  const scale = Math.min(maxW / cropState.naturalW, maxH / cropState.naturalH, 1);
  cropState.displayW = cropState.naturalW * scale;
  cropState.displayH = cropState.naturalH * scale;
  cropState.imgX = (vw - cropState.displayW) / 2;
  cropState.imgY = (vh - cropState.displayH) / 2;

  cropImage.style.width = cropState.displayW + 'px';
  cropImage.style.height = cropState.displayH + 'px';
  cropImage.style.left = cropState.imgX + 'px';
  cropImage.style.top = cropState.imgY + 'px';

  if (initialCrop) {
    const c = initialCrop;
    cropState.box = {
      x: cropState.imgX + (c.x / cropState.naturalW) * cropState.displayW,
      y: cropState.imgY + (c.y / cropState.naturalH) * cropState.displayH,
      w: (c.w / cropState.naturalW) * cropState.displayW,
      h: (c.h / cropState.naturalH) * cropState.displayH,
    };
  } else {
    cropState.box = { x: cropState.imgX, y: cropState.imgY, w: cropState.displayW, h: cropState.displayH };
  }
  renderCropBox();
}

function renderCropBox() {
  const b = cropState.box;
  cropBox.style.left = b.x + 'px';
  cropBox.style.top = b.y + 'px';
  cropBox.style.width = b.w + 'px';
  cropBox.style.height = b.h + 'px';
}

function onCropPointerDown(e) {
  const handle = e.target.closest('.crop-handle');
  const rect = cropViewport.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  if (handle) {
    e.preventDefault();
    const dir = handle.dataset.h;
    const hx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0;
    const hy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
    const b = cropState.box;
    let ax, ay;
    ax = hx === -1 ? b.x + b.w : hx === 1 ? b.x : b.x + b.w / 2;
    ay = hy === -1 ? b.y + b.h : hy === 1 ? b.y : b.y + b.h / 2;
    cropOp = { type: 'resize', hx, hy, ax, ay, startP: { x: px, y: py }, startBox: { ...b } };
  } else if (e.target.closest('#cropBox')) {
    e.preventDefault();
    cropOp = { type: 'move', startP: { x: px, y: py }, startBox: { ...cropState.box } };
  }
}

function handleCropMove(e) {
  if (!cropOp) return;
  const rect = cropViewport.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const imgL = cropState.imgX, imgT = cropState.imgY;
  const imgR = cropState.imgX + cropState.displayW, imgB = cropState.imgY + cropState.displayH;
  const op = cropOp;

  if (op.type === 'move') {
    const dx = px - op.startP.x, dy = py - op.startP.y;
    let nx = op.startBox.x + dx, ny = op.startBox.y + dy;
    nx = clamp(nx, imgL, imgR - op.startBox.w);
    ny = clamp(ny, imgT, imgB - op.startBox.h);
    cropState.box = { x: nx, y: ny, w: op.startBox.w, h: op.startBox.h };
  } else {
    let left, top, right, bottom;
    if (op.hx !== 0) { left = Math.min(op.ax, px); right = Math.max(op.ax, px); }
    else { left = op.startBox.x; right = op.startBox.x + op.startBox.w; }
    if (op.hy !== 0) { top = Math.min(op.ay, py); bottom = Math.max(op.ay, py); }
    else { top = op.startBox.y; bottom = op.startBox.y + op.startBox.h; }

    left = clamp(left, imgL, imgR); top = clamp(top, imgT, imgB);
    right = clamp(right, imgL, imgR); bottom = clamp(bottom, imgT, imgB);

    if (cropState.ratio) {
      let w = right - left, h = bottom - top;
      const r = cropState.ratio;
      if (w / h > r) {
        const newW = h * r;
        if (op.hx === -1) left = right - newW; else right = left + newW;
      } else {
        const newH = w / r;
        if (op.hy === -1) top = bottom - newH; else bottom = top + newH;
      }
      left = clamp(left, imgL, imgR); right = clamp(right, imgL, imgR);
      top = clamp(top, imgT, imgB); bottom = clamp(bottom, imgT, imgB);
    }
    cropState.box = { x: left, y: top, w: Math.max(4, right - left), h: Math.max(4, bottom - top) };
  }
  renderCropBox();
}

function handleCropUp() {
  cropOp = null;
}

function computeCropRect() {
  const s = cropState;
  const sx = (s.box.x - s.imgX) / s.displayW * s.naturalW;
  const sy = (s.box.y - s.imgY) / s.displayH * s.naturalH;
  const sw = s.box.w / s.displayW * s.naturalW;
  const sh = s.box.h / s.displayH * s.naturalH;
  const x = clamp(sx, 0, s.naturalW), y = clamp(sy, 0, s.naturalH);
  const w = clamp(sw, 1, s.naturalW - x), h = clamp(sh, 1, s.naturalH - y);
  return { x, y, w, h };
}

function produceCroppedDataUrl() {
  const s = cropState;
  const c = computeCropRect();
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(c.w, c.h));
  const outW = Math.max(1, Math.round(c.w * scale));
  const outH = Math.max(1, Math.round(c.h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s.img, c.x, c.y, c.w, c.h, 0, 0, outW, outH);
  return canvas.toDataURL('image/png');
}

function applyCrop() {
  const s = cropState;
  const crop = computeCropRect();
  const dataUrl = produceCroppedDataUrl();
  const origSrc = cropImage.src;

  if (s.mode === 'frame' && s.targetId) {
    const item = getItem(s.targetId);
    if (item && item.frame) { item.frame.photo = dataUrl; select(s.targetId); scheduleSave(); }
  } else if (s.mode === 'recrop' && s.targetId) {
    const item = getItem(s.targetId);
    if (item && item.image) {
      item.image.src = dataUrl;
      item.image.crop = crop;
      if (!item.image.origSrc) item.image.origSrc = origSrc;
      // 保持显示宽高比
      if (crop.w > 0) item.h = item.w * (crop.h / crop.w);
      select(s.targetId);
      scheduleSave();
    }
  } else {
    // 新图片
    const baseW = 260;
    const item = createItem({
      type: 'image', name: '照片', w: baseW, h: baseW * (crop.h / crop.w),
      image: { src: dataUrl, crop, origSrc: origSrc },
    });
    select(item.id);
    scheduleSave();
  }
  closeCropModal();
}

function closeCropModal() {
  $('#cropModal').hidden = true;
  cropState.img = null;
  cropOp = null;
}

function startRecrop() {
  const sel = getItem(state.selection);
  if (!sel || !sel.image) return;
  const src = sel.image.origSrc || sel.image.src;
  openCropModal(src, { mode: 'recrop', targetId: sel.id, initialCrop: sel.image.crop || null });
}

function startFramePhoto() {
  const sel = getItem(state.selection);
  if (!sel || !sel.frame) return;
  pendingFrameTarget = sel.id;
  $('#fileInput').click();
}

function onFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  readFileAsDataURL(file).then((dataUrl) => {
    if (pendingFrameTarget) {
      openCropModal(dataUrl, { mode: 'frame', targetId: pendingFrameTarget });
      pendingFrameTarget = null;
    } else {
      openCropModal(dataUrl, { mode: 'new' });
    }
  }).catch(() => alert('读取文件失败。'));
}

function addUploadItem(src, name) {
  const list = $('#uploadList');
  const div = document.createElement('div');
  div.className = 'upload-item';
  div.innerHTML = `<img class="upload-thumb" src="${src}" alt=""><span class="u-name">${esc(name)}</span>`;
  div.addEventListener('click', () => openCropModal(src, { mode: 'new' }));
  list.prepend(div);
}

function handleDrop(e) {
  e.preventDefault();
  $('#dropzone').classList.remove('drag');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  readFileAsDataURL(file).then((dataUrl) => {
    addUploadItem(dataUrl, file.name);
    openCropModal(dataUrl, { mode: 'new' });
  });
}

/* ---------------- 导出 ---------------- */
function exportSvgClone() {
  const node = stage.cloneNode(true);
  const ui = node.querySelector('#selection-ui');
  if (ui) ui.remove();
  node.setAttribute('width', state.page.w);
  node.setAttribute('height', state.page.h);
  node.setAttribute('viewBox', `0 0 ${state.page.w} ${state.page.h}`);
  return node;
}

function downloadBlob(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

async function renderPngDataUrl() {
  const node = exportSvgClone();
  const xml = new XMLSerializer().serializeToString(node);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = state.page.w * scale;
    canvas.height = state.page.h * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function exportPng() {
  try {
    const dataUrl = await renderPngDataUrl();
    downloadDataUrl(dataUrl, '手账-自介.png');
  } catch (err) {
    console.error(err);
    alert('导出失败：' + (err && err.message ? err.message : err));
  }
}

async function publishToCommunity() {
  try {
    const dataUrl = await renderPngDataUrl();
    const res = await fetch('/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '我的自介页', image: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      alert('请先登录社区，再发布作品。');
      location.href = '/community.html';
      return;
    }
    if (!res.ok) { alert((data && data.error) || '发布失败'); return; }
    alert('发布成功！🎉');
    location.href = '/community.html';
  } catch (err) {
    console.error(err);
    alert('发布失败：请确认已通过「node server.js」启动服务端（不能直接双击打开本页）。');
  }
}

function exportHtml() {
  const node = exportSvgClone();
  const svg = new XMLSerializer().serializeToString(node);
  const bg = state.page.bg || { color: '#fdf6e3' };
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>我的自介页</title>
<style>
  html,body{margin:0;padding:0;background:${bg.color};}
  .page{max-width:${state.page.w}px;margin:24px auto;}
  .page svg{width:100%;height:auto;display:block;box-shadow:0 10px 40px rgba(0,0,0,.18);}
</style>
</head>
<body>
<div class="page">${svg}</div>
</body>
</html>`;
  downloadBlob(html, '手账-自介.html', 'text/html');
}

function saveProject() {
  const data = JSON.stringify({ version: 2, page: state.page, pages: state.pages, lastPage: state.lastPage });
  downloadBlob(data, '手账-项目.json', 'application/json');
  flashSave('已导出项目');
}

function loadProjectFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data) throw new Error('bad format');
      state.page = data.page || state.page;
      if (Array.isArray(data.pages)) {
        state.pages = data.pages.map((p) => ({ items: Array.isArray(p.items) ? p.items : [] }));
      } else if (Array.isArray(data.items)) {
        state.pages = [{ items: data.items }];
      } else {
        throw new Error('bad format');
      }
      state.lastPage = data.lastPage || 0;
      state.currentPage = 0;
      state.selection = null;
      applyPageSizeToStage();
      redraw();
      renderLayers();
      renderProps();
      updatePager();
      scheduleSave();
      flashSave('项目已导入');
    } catch (err) {
      alert('导入失败：文件格式不正确。');
    }
  };
  r.onerror = () => alert('读取文件失败。');
  r.readAsText(file);
}

/* ---------------- 背景弹窗 ---------------- */
function renderBgModal() {
  const grid = $('#bgGrid');
  grid.innerHTML = BG_PRESETS.map((b) => {
    const bgStyle = b.pattern
      ? `background-color:${b.color};background-image:${b.pattern === 'grid' ? 'linear-gradient(#e7dcc9 1px,transparent 1px),linear-gradient(90deg,#e7dcc9 1px,transparent 1px)' : b.pattern === 'dots' ? 'radial-gradient(#e7dcc9 2px,transparent 2px)' : 'repeating-linear-gradient(#e7dcc9 0 1px,transparent 1px 40px)'};background-size:40px 40px;`
      : `background-color:${b.color};`;
    return `<div class="bg-swatch ${state.page.bg.color === b.color && state.page.bg.pattern === b.pattern ? 'selected' : ''}" data-id="${b.id}" style="${bgStyle}">
      <span class="bg-name">${b.name}</span>
    </div>`;
  }).join('') + `
    <div class="bg-swatch" id="bgCustomSwatch" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);">
      <span class="bg-name">自定义</span>
      <input type="color" id="bgCustomColor" value="#fdf6e3" hidden>
    </div>`;
}

function applyBg(bg) {
  state.page.bg = { color: bg.color, pattern: bg.pattern };
  redraw();
  scheduleSave();
}

/* ---------------- 页面尺寸 ---------------- */
function applyPageSizeToStage() {
  stage.setAttribute('viewBox', `0 0 ${state.page.w} ${state.page.h}`);
}

/* ---------------- 自动保存 ---------------- */
let saveTimer = null;
function scheduleSave() {
  flashSave('保存中…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, page: state.page, pages: state.pages, lastPage: state.lastPage }));
      flashSave('已自动保存');
    } catch (err) {
      flashSave('保存失败');
    }
  }, 400);
}

function flashSave(text) {
  const el = $('#saveState');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '.55'; }, 1200);
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data) return false;
    state.page = data.page || state.page;
    if (Array.isArray(data.pages)) {
      state.pages = data.pages.map((p) => ({ items: Array.isArray(p.items) ? p.items : [] }));
    } else if (Array.isArray(data.items)) {
      // 旧版单页数据自动迁移
      state.pages = [{ items: data.items }];
    } else {
      return false;
    }
    state.lastPage = data.lastPage || 0;
    state.currentPage = 0; // 固定打开首页
    return true;
  } catch (err) {
    return false;
  }
}

/* ---------------- 示例内容（首次打开） ---------------- */
function seedDemo() {
  state.pages = [
    { items: [] },
    { items: [] },
    { items: [] },
  ];
  const cx = state.page.w / 2, cy = state.page.h / 2;
  // 第 1 页：封面
  state.currentPage = 0;
  createItem({ type: 'text', name: '标题', x: cx, y: 200, w: 640, h: 130, text: { content: '嗨，这是我的自介页 👋', fontSize: 84, fill: '#4b3a33', fontFamily: FONTS[0].value, bold: true } });
  createItem({ type: 'frame', name: '我的照片', x: cx, y: cy + 120, w: 420, h: 480, frame: { kind: 'polaroid', fill: '#ffffff', photo: null } });
  createItem({ type: 'sticker', name: '小花', x: cx + 320, y: 260, w: 120, h: 120, sticker: { kind: 'flower', fill: '#ef8b98' } });
  createItem({ type: 'sticker', name: '星星', x: cx - 320, y: 260, w: 100, h: 100, sticker: { kind: 'star', fill: '#f6c445' } });

  // 第 2 页：自我介绍
  state.currentPage = 1;
  createItem({ type: 'text', name: '关于我', x: cx, y: 180, w: 500, h: 100, text: { content: '关于我 ✨', fontSize: 76, fill: '#4b3a33', fontFamily: FONTS[0].value, bold: true } });
  createItem({ type: 'shape', name: '圆角矩形', x: cx, y: 560, w: 640, h: 360, shape: { kind: 'roundrect', fill: '#ffe9ec', stroke: 'none', strokeWidth: 2 } });
  createItem({ type: 'text', name: '介绍', x: cx, y: 560, w: 560, h: 200, text: { content: '喜欢 ACG 和做手账\n把想说的话都贴在这里\n\n画风 / 音乐 / 小动物', fontSize: 46, fill: '#7a5a4a', fontFamily: FONTS[0].value, bold: false } });
  createItem({ type: 'sticker', name: '爱心', x: cx + 360, y: 860, w: 110, h: 110, sticker: { kind: 'heart', fill: '#ef8b98' } });
  createItem({ type: 'sticker', name: '笑脸', x: cx - 360, y: 860, w: 110, h: 110, sticker: { kind: 'smile', fill: '#ffd66b' } });

  // 第 3 页：贴纸角
  state.currentPage = 2;
  createItem({ type: 'text', name: '谢谢观看', x: cx, y: 200, w: 500, h: 100, text: { content: '谢谢观看 💌', fontSize: 76, fill: '#4b3a33', fontFamily: FONTS[0].value, bold: true } });
  createItem({ type: 'sticker', name: '小花', x: cx - 260, y: 520, w: 140, h: 140, sticker: { kind: 'flower', fill: '#ef8b98' } });
  createItem({ type: 'sticker', name: '闪光', x: cx, y: 520, w: 120, h: 120, sticker: { kind: 'sparkle', fill: '#f6c445' } });
  createItem({ type: 'sticker', name: '月亮', x: cx + 260, y: 520, w: 120, h: 120, sticker: { kind: 'moon', fill: '#7fb6c9' } });
  createItem({ type: 'sticker', name: '蝴蝶结', x: cx, y: 900, w: 160, h: 160, sticker: { kind: 'ribbon', fill: '#ef8b98' } });

  state.currentPage = 0;
  state.lastPage = 0;
}

/* ---------------- 键盘 ---------------- */
function onKeyDown(e) {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (!state.selection) return;
  const item = getItem(state.selection);
  if (!item) return;

  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); }
  else if (e.key === 'Escape') { select(null); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); }
  else {
    const step = e.shiftKey ? 10 : 1;
    let moved = false;
    if (e.key === 'ArrowLeft') { item.x -= step; moved = true; }
    else if (e.key === 'ArrowRight') { item.x += step; moved = true; }
    else if (e.key === 'ArrowUp') { item.y -= step; moved = true; }
    else if (e.key === 'ArrowDown') { item.y += step; moved = true; }
    if (moved) { e.preventDefault(); redraw(); renderProps(); scheduleSave(); }
  }
}

/* ---------------- 初始化 ---------------- */
function init() {
  // 页面尺寸下拉
  const sizeSel = $('#pageSize');
  sizeSel.innerHTML = PAGE_SIZES.map((p, i) =>
    `<option value="${i}" ${p.w === state.page.w && p.h === state.page.h ? 'selected' : ''}>${p.label}</option>`).join('');
  sizeSel.addEventListener('change', () => {
    const p = PAGE_SIZES[parseInt(sizeSel.value, 10)];
    state.page.w = p.w; state.page.h = p.h;
    applyPageSizeToStage();
    redraw();
    scheduleSave();
  });

  const restored = loadSaved();
  if (!restored) seedDemo();

  applyPageSizeToStage();
  renderAssetGrids();
  redraw();
  renderLayers();
  renderProps();
  updatePager();

  // 素材点击（事件委托）
  $('#shapesGrid').addEventListener('click', onAssetGridClick);
  $('#framesGrid').addEventListener('click', onAssetGridClick);
  $('#stickersGrid').addEventListener('click', onAssetGridClick);

  // 画布交互
  stage.addEventListener('pointerdown', onStagePointerDown);
  window.addEventListener('pointermove', (e) => {
    if (canvasOp) handleCanvasMove(e);
    if (cropOp) handleCropMove(e);
  });
  window.addEventListener('pointerup', () => {
    if (canvasOp) handleCanvasUp();
    if (cropOp) handleCropUp();
  });

  // 图层面板
  $('#layersList').addEventListener('click', (e) => {
    const eye = e.target.closest('[data-eye]');
    if (eye) { toggleHidden(eye.dataset.eye); return; }
    const row = e.target.closest('.layer-item');
    if (row) select(row.dataset.id);
  });

  $('#btnFront').addEventListener('click', () => zIndexAction('front'));
  $('#btnBack').addEventListener('click', () => zIndexAction('back'));
  $('#btnUp').addEventListener('click', () => zIndexAction('up'));
  $('#btnDown').addEventListener('click', () => zIndexAction('down'));
  $('#btnDuplicate').addEventListener('click', duplicateSelection);
  $('#btnDelete').addEventListener('click', deleteSelection);

  // 翻页
  $('#btnPrevPage').addEventListener('click', () => goToPage(state.currentPage - 1));
  $('#btnNextPage').addEventListener('click', () => goToPage(state.currentPage + 1));
  $('#btnAddPage').addEventListener('click', addPage);
  $('#btnDelPage').addEventListener('click', delPage);

  // 属性面板
  $('#propsBody').addEventListener('input', onPropInput);
  $('#propsBody').addEventListener('change', (e) => {
    onPropInput(e);
    if (e.target.dataset && e.target.dataset.field === 'rotation') renderProps();
  });
  $('#propsBody').addEventListener('click', onPropClick);

  // 标签页
  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add('active');
  });

  // 上传
  $('#btnUpload').addEventListener('click', () => { pendingFrameTarget = null; $('#fileInput').click(); });
  $('#fileInput').addEventListener('change', onFileSelected);
  $('#dropzone').addEventListener('click', () => { pendingFrameTarget = null; $('#fileInput').click(); });
  $('#dropzone').addEventListener('dragover', (e) => { e.preventDefault(); $('#dropzone').classList.add('drag'); });
  $('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('drag'));
  $('#dropzone').addEventListener('drop', handleDrop);

  // 裁剪弹窗
  cropViewport.addEventListener('pointerdown', onCropPointerDown);
  $('#btnCropApply').addEventListener('click', applyCrop);
  $('#btnCropReset').addEventListener('click', () => { cropState.box = { x: cropState.imgX, y: cropState.imgY, w: cropState.displayW, h: cropState.displayH }; renderCropBox(); });
  $('#cropRatios').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ratio]');
    if (!btn) return;
    document.querySelectorAll('#cropRatios [data-ratio]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const r = btn.dataset.ratio;
    if (r === 'free') cropState.ratio = null;
    else {
      const [a, b] = r.split(':').map(Number);
      cropState.ratio = a / b;
      // 应用当前框
      const box = cropState.box;
      if (box.w / box.h > cropState.ratio) box.w = box.h * cropState.ratio;
      else box.h = box.w / cropState.ratio;
      renderCropBox();
    }
  });

  // 弹窗关闭
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { $('#' + btn.dataset.close).hidden = true; cropOp = null; pendingFrameTarget = null; });
  });

  // 背景弹窗
  $('#btnBg').addEventListener('click', () => { renderBgModal(); $('#bgModal').hidden = false; });
  $('#bgGrid').addEventListener('click', (e) => {
    if (e.target.closest('#bgCustomSwatch')) { $('#bgCustomColor').click(); return; }
    const sw = e.target.closest('.bg-swatch');
    if (!sw) return;
    const preset = BG_PRESETS.find((b) => b.id === sw.dataset.id);
    if (preset) applyBg(preset);
    renderBgModal();
  });
  $('#bgGrid').addEventListener('input', (e) => {
    if (e.target.id === 'bgCustomColor') applyBg({ color: e.target.value, pattern: null });
  });

  // 导出
  $('#btnExportPng').addEventListener('click', exportPng);
  $('#btnExportHtml').addEventListener('click', exportHtml);
  $('#btnPublish').addEventListener('click', publishToCommunity);
  $('#btnSaveProject').addEventListener('click', saveProject);
  $('#btnLoadProject').addEventListener('click', () => $('#jsonInput').click());
  $('#jsonInput').addEventListener('change', loadProjectFile);

  // 顶部导航：登录按钮
  const navAuth = $('#navAuth');
  navAuth.addEventListener('click', () => {
    if (Auth.user) { location.href = '/community.html'; }
    else { Auth.open('login'); }
  });
  Auth.init((user) => {
    navAuth.textContent = user ? (user.username || user.email) : '登录';
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', () => {
    if (!$('#cropModal').hidden && cropState.img) layoutCropImage(computeCropRect());
  });

  // 可爱加载页：给足展示时间后淡出
  setTimeout(() => {
    const loader = $('#loader');
    if (loader) {
      loader.classList.add('hide');
      setTimeout(() => loader.remove(), 700);
    }
    showLastPageTip();
  }, 1400);
}

/* 打开固定首页后，提示上次翻到的页码（可点击跳转） */
function showLastPageTip() {
  const tip = $('#lastPageTip');
  if (!tip) return;
  const last = state.lastPage || 0;
  if (state.pages.length > 1 && last > 0 && last < state.pages.length) {
    tip.textContent = `上次翻到第 ${last + 1} 页 · 点我跳转`;
    tip.hidden = false;
    tip.onclick = () => {
      goToPage(last, false);
      hideLastPageTip();
    };
    setTimeout(hideLastPageTip, 5000);
  } else {
    tip.hidden = true;
  }
}

function hideLastPageTip() {
  const tip = $('#lastPageTip');
  if (!tip) return;
  tip.classList.add('hide');
  setTimeout(() => { tip.hidden = true; tip.classList.remove('hide'); }, 520);
}

document.addEventListener('DOMContentLoaded', init);
