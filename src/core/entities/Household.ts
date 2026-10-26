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
  /** [1.5] Tài sản ròng lúc chốt sổ và lúc mở sổ đầu năm (thóc tính theo giá gốc). */
  netWorth: number;
  openNetWorth: number;
  /** [1.5] Thu nhập cả năm: tổng các khoản "làm ra" (balance.economy.income_ledgers), thóc quy ra tiền. */
  income: number;
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
  /** [2] ID hộ cha mẹ gốc khi đã tách hộ ra ở riêng. */
  parentHouseholdId?: string | null;
  /** [2] Năm tách ra ở riêng. */
  splitFromYear?: number;
  /** [2] Đã phân chia thừa kế của hộ gốc này chưa. */
  inheritanceSettled?: boolean;
}

/** [1.5] Một năm sổ riêng của người chơi (túi tiền riêng khi chưa làm chủ hộ). */
export interface PurseYear {
  year: number;
  entries: LedgerEntry[];
  netWorth: number;
  openNetWorth: number;
  income: number;
}

/** [1.5] Túi tiền riêng của người chơi khi chưa làm chủ hộ (kiểu 1in8b); làm chủ hộ thì gộp vào gia sản. */
export interface Purse {
  money: number;
  ledger: LedgerEntry[];
  history: PurseYear[];
  /** Tiền trong túi lúc mở sổ đầu năm. */
  openMoney: number;
}

/** Ghi một khoản vào sổ năm nay (của hộ hoặc túi riêng), gộp theo danh mục. */
export function addLedger(h: { ledger: LedgerEntry[] }, category: string, money: number, food: number): void {
  if (money === 0 && food === 0) return;
  const row = h.ledger.find((e) => e.category === category);
  if (row) {
    row.money += money;
    row.food += food;
  } else {
    h.ledger.push({ category, money, food });
  }
}
