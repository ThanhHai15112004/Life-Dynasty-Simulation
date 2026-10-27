// Vẽ thẻ đời / giấy khai sinh ra ảnh PNG (canvas) để lưu hoặc chia sẻ — bố cục ở đây, kích thước & màu ở display.life_card
import type { BirthCardView, LifeCardView } from '@core/index';
import type { T } from '../context';

export interface CardStyle {
  width: number;
  height: number;
  colors: { background: string; text: string; muted: string; accent: string; cells: string[]; dead_cell: string };
}

const SERIF = "'Noto Serif', Georgia, 'Times New Roman', serif";
const SANS = "'Be Vietnam Pro', system-ui, sans-serif";

/** Ngắt dòng theo bề rộng; trả về y sau đoạn vừa vẽ. */
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 99): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lineH;
      line = w;
      if (++lines >= maxLines) return y;
    } else line = test;
  }
  if (line) {
    g.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function frame(style: CardStyle): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; pad: number } {
  const canvas = document.createElement('canvas');
  canvas.width = style.width;
  canvas.height = style.height;
  const g = canvas.getContext('2d')!;
  const pad = Math.round(style.width * 0.07);
  g.fillStyle = style.colors.background;
  g.fillRect(0, 0, style.width, style.height);
  g.strokeStyle = style.colors.accent;
  g.lineWidth = 4;
  g.strokeRect(pad / 2, pad / 2, style.width - pad, style.height - pad);
  g.textBaseline = 'top';
  return { canvas, g, pad };
}

function cellColor(style: CardStyle, satisfaction: number): string {
  const cells = style.colors.cells;
  const i = Math.min(cells.length - 1, Math.floor((satisfaction / 100) * cells.length));
  return cells[Math.max(0, i)];
}

function footer(g: CanvasRenderingContext2D, style: CardStyle, pad: number, t: T): void {
  g.fillStyle = style.colors.muted;
  g.font = `24px ${SANS}`;
  g.textAlign = 'center';
  g.fillText(t('card.footer'), style.width / 2, style.height - pad - 12);
  g.textAlign = 'left';
}

function fmtYear(year: number, t: T): string {
  return year < 0 ? t('year.bce', { year: Math.abs(year) }) : String(year);
}

/** Thẻ đời cuối đời: tên, năm sinh–mất, văn bia, bản đồ đời, dấu mốc, bạn cùng lứa. */
export function drawLifeCard(card: LifeCardView, style: CardStyle, t: T): HTMLCanvasElement {
  const { canvas, g, pad } = frame(style);
  const W = style.width - pad * 2;
  const x = pad;
  let y = pad + 20;
  const c = style.colors;

  g.fillStyle = c.accent;
  g.font = `600 26px ${SANS}`;
  const headerText = card.eraName ? `${t('card.life_title').toUpperCase()} · ${card.eraName.toUpperCase()}` : t('card.life_title').toUpperCase();
  g.fillText(headerText, x, y);
  y += 46;
  g.fillStyle = c.text;
  g.font = `700 64px ${SERIF}`;
  y = wrap(g, card.name, x, y, W, 72, 2);
  g.font = `30px ${SANS}`;
  g.fillStyle = c.muted;
  const yearsText =
    card.calendarStyle === 'bce_ce'
      ? t('card.years_ce', {
          byear: fmtYear(card.birth.year, t),
          dyear: fmtYear(card.death.year, t),
        })
      : t('card.years', {
          bcan: t(`canchi.can.${card.birth.can}`),
          bchi: t(`canchi.chi.${card.birth.chi}`),
          byear: fmtYear(card.birth.year, t),
          dcan: t(`canchi.can.${card.death.can}`),
          dchi: t(`canchi.chi.${card.death.chi}`),
          dyear: fmtYear(card.death.year, t),
        });
  g.fillText(yearsText, x, y + 6);
  y += 50;
  g.fillStyle = c.text;
  g.font = `600 34px ${SANS}`;
  g.fillText(t('card.age_cause', { age: card.age, cause: card.causeName }), x, y);
  y += 50;
  g.font = `28px ${SANS}`;
  g.fillStyle = c.muted;
  const placeLabel = card.polityName ? `${card.settlementName} (${card.polityName})` : card.settlementName;
  g.fillText(t('card.origin', { origin: card.originName.toLowerCase(), village: placeLabel }), x, y);
  y += 40;
  const sub = [card.careerName ? t('card.career', { career: card.careerName }) : '', card.generation > 1 ? t('card.generation', { n: card.generation }) : '']
    .filter(Boolean)
    .join(' · ');
  if (sub) {
    g.fillText(sub, x, y);
    y += 40;
  }

  // Văn bia
  if (card.epitaph) {
    y += 16;
    g.fillStyle = c.accent;
    g.font = `italic 38px ${SERIF}`;
    y = wrap(g, `“${card.epitaph}”`, x, y, W, 50, 3);
  }

  // Bản đồ đời: mỗi ô một năm, ô còn lại tới tuổi thọ kỳ vọng để trống viền
  y += 24;
  const total = Math.max(card.cells.length, card.expectedLifespan);
  const perRow = 20;
  const gap = 6;
  const size = Math.floor((W - gap * (perRow - 1)) / perRow);
  for (let i = 0; i < total; i++) {
    const cx = x + (i % perRow) * (size + gap);
    const cy = y + Math.floor(i / perRow) * (size + gap);
    if (i < card.cells.length) {
      g.fillStyle = cellColor(style, card.cells[i]);
      g.fillRect(cx, cy, size, size);
    } else {
      g.strokeStyle = c.muted;
      g.lineWidth = 1.5;
      g.strokeRect(cx + 1, cy + 1, size - 2, size - 2);
    }
  }
  y += Math.ceil(total / perRow) * (size + gap) + 6;
  g.fillStyle = c.muted;
  g.font = `22px ${SANS}`;
  g.fillText(t('card.life_map', { n: card.expectedLifespan }), x, y);
  y += 44;

  // Dấu mốc
  g.fillStyle = c.text;
  g.font = `26px ${SANS}`;
  for (const h of card.highlights) {
    if (y > style.height - pad - 320) break;
    y = wrap(g, `• ${h}`, x, y, W, 34, 2) + 6;
  }

  // Bạn cùng lứa
  if (card.peers.length > 0) {
    y += 10;
    g.fillStyle = c.accent;
    g.font = `600 24px ${SANS}`;
    g.fillText(t('card.peers_title').toUpperCase(), x, y);
    y += 38;
    g.font = `24px ${SANS}`;
    for (const p of card.peers) {
      if (y > style.height - pad - 70) break;
      g.fillStyle = p.alive ? c.text : c.muted;
      const line = p.alive ? t('card.peer_alive', { name: p.name, label: p.label, age: p.age }) : t('card.peer_dead', { name: p.name, label: p.label, age: p.age });
      y = wrap(g, line, x, y, W, 32, 1);
    }
  }
  footer(g, style, pad, t);
  return canvas;
}

/** Giấy khai sinh đầu đời: nơi sinh, gia cảnh, tỷ lệ xuất thân, những đứa trẻ cùng năm. */
export function drawBirthCard(card: BirthCardView, style: CardStyle, t: T): HTMLCanvasElement {
  const { canvas, g, pad } = frame(style);
  const W = style.width - pad * 2;
  const x = pad;
  let y = pad + 20;
  const c = style.colors;
  g.fillStyle = c.accent;
  g.font = `600 26px ${SANS}`;
  const headerText = card.eraName ? `${t('card.birth_title').toUpperCase()} · ${card.eraName.toUpperCase()}` : t('card.birth_title').toUpperCase();
  g.fillText(headerText, x, y);
  y += 46;
  g.fillStyle = c.text;
  g.font = `700 64px ${SERIF}`;
  y = wrap(g, card.name, x, y, W, 72, 2);
  g.font = `30px ${SANS}`;
  g.fillStyle = c.muted;
  const subTitle = card.polityName ? `${t(`birth.sex.${card.sex}`)} · ${card.polityName} (${card.regionLabel})` : t(`birth.sex.${card.sex}`);
  g.fillText(subTitle, x, y + 6);
  y += 52;
  g.fillStyle = c.text;
  g.font = `30px ${SANS}`;
  const bornLine =
    card.calendarStyle === 'bce_ce'
      ? t('birth.born_ce', { year: fmtYear(card.birthYear, t), village: card.settlementName })
      : t('birth.born', { can: t(`canchi.can.${card.can}`), chi: t(`canchi.chi.${card.chi}`), year: fmtYear(card.birthYear, t), village: card.settlementName });
  y = wrap(g, bornLine, x, y, W, 40);
  if (card.polityName) {
    y += 10;
    g.font = `26px ${SANS}`;
    g.fillStyle = c.muted;
    y = wrap(g, t('birth.world_share', { polity: card.polityName, region: card.regionLabel, pct: card.worldPopSharePct }), x, y, W, 36);
  }
  y += 14;
  g.font = `italic 34px ${SERIF}`;
  g.fillStyle = c.accent;
  y = wrap(g, t('birth.origin', { origin: card.originName.toLowerCase(), pct: card.originSharePct }), x, y, W, 46);
  y += 14;
  g.font = `28px ${SANS}`;
  g.fillStyle = c.text;
  for (const p of card.parents) {
    g.fillText(t(`birth.parent.${p.relation}`, { name: p.name, age: p.age }), x, y);
    y += 40;
  }
  const wealthLine = card.lexicon?.land
    ? t('birth.wealth_lex', {
        farmland: card.farmland,
        land: card.lexicon.land,
        money: Math.round(card.money),
        currency: card.lexicon.currency,
      })
    : t('birth.wealth', { farmland: card.farmland, money: Math.round(card.money) });
  y = wrap(g, wealthLine, x, y, W, 38);
  y = wrap(g, t('birth.expectancy', { n: card.lifeExpectancy }), x, y, W, 38);
  y = wrap(g, t('birth.demographics', { survival: card.childSurvivalPct, literacy: card.literacyPct }), x, y, W, 38);
  if (card.peers.length > 0) {
    y += 24;
    g.fillStyle = c.accent;
    g.font = `600 24px ${SANS}`;
    g.fillText(t('birth.peers_title').toUpperCase(), x, y);
    y += 40;
    g.fillStyle = c.text;
    g.font = `28px ${SANS}`;
    for (const p of card.peers) {
      g.fillText(`${p.name} — ${p.label}`, x, y);
      y += 42;
    }
  }
  footer(g, style, pad, t);
  return canvas;
}

/** Lưu ảnh về máy. */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = fileName;
  a.click();
}

/** Chia sẻ qua Web Share (điện thoại); trình duyệt không hỗ trợ thì lưu ảnh. */
export async function shareCanvas(canvas: HTMLCanvasElement, fileName: string, title: string): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return;
    } catch {
      // Người chơi hủy chia sẻ: không làm gì thêm
      return;
    }
  }
  downloadCanvas(canvas, fileName);
}

/** Tên file ảnh: bỏ dấu, nối gạch ngang. */
export function cardFileName(prefix: string, name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${prefix}-${slug}.png`;
}
