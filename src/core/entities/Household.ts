// [0] Thực thể: Hộ gia đình — đơn vị giữ tiền, thóc, nợ, nhà, ruộng (GDD 02 §2)

/** Một dòng sổ sách; category là khóa tra nhãn trong data/lang (ledger.<category>). */
export interface LedgerEntry {
  category: string;
  money: number;
  food: number;
}

export interface LedgerYear {
  year: number;
  entries: LedgerEntry[];
  closing: { money: number; food: number; debt: number };
}

export interface Household {
  id: string;
  memberIds: string[];
  money: number;
  /** Thóc trong kho (đơn vị hiển thị lấy từ data/lang). */
  food: number;
  debt: number;
  livingStandard: string;
  /** Số lượng sở hữu theo loại tài sản (sào ruộng, con trâu, căn nhà...). */
  properties: Record<string, number>;
  ledger: LedgerEntry[];
}

/** Ghi một khoản vào sổ năm nay, gộp theo danh mục. */
export function addLedger(h: Household, category: string, money: number, food: number): void {
  if (money === 0 && food === 0) return;
  const row = h.ledger.find((e) => e.category === category);
  if (row) {
    row.money += money;
    row.food += food;
  } else {
    h.ledger.push({ category, money, food });
  }
}
