// [0] Điền token {duong.dan} vào mẫu văn bản lấy từ dữ liệu. Token không phân giải được giữ nguyên để dễ phát hiện lỗi.
export type TokenLookup = (path: string) => string | number | undefined;

const TOKEN = /\{([a-zA-Z0-9_.]+)\}/g;

export function fillTemplate(template: string, lookup: TokenLookup): string {
  return template.replace(TOKEN, (whole, path: string) => {
    const v = lookup(path);
    return v === undefined ? whole : String(v);
  });
}

export function templateTokens(template: string): string[] {
  return [...template.matchAll(TOKEN)].map((m) => m[1]);
}

/** Tra chuỗi trong gói ngôn ngữ, điền tham số; thiếu khóa thì trả lại chính khóa. */
export function translate(pack: Record<string, string>, key: string, params: Record<string, string | number> = {}): string {
  const raw = pack[key];
  if (raw === undefined) return key;
  return fillTemplate(raw, (p) => params[p]);
}
