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

/** [6] Một cơ nghiệp đang hoạt động của hộ gia đình (sạp, cửa hiệu, hiệu buôn, lò gốm, xưởng mộc, thuyền buôn, quán rượu). */
export interface VentureHolding {
  id: string;
  /** Quy mô mở rộng nội bộ (1..3). */
  stage: number;
  /** Tình trạng cơ nghiệp (0..100: >=75 Thịnh vượng, 45..74 Bình thường, 25..44 Sa sút, <25 Sắp phá sản). */
  health: number;
  /** Số thợ thuê ngoài để bù nhân lực thiếu. */
  hiredWorkers: number;
  /** Doanh thu năm gần nhất (hoặc ước tính năm đầu). */
  lastRevenueYear: number;
  /** Chi phí năm gần nhất (nguyên liệu + lương thợ + tổn thất rủi ro). */
  lastUpkeepYear: number;
  /** Lợi nhuận ròng năm gần nhất. */
  lastProfitYear: number;
  /** Số năm thua lỗ liên tiếp. */
  yearsLoss: number;
  /** Năm thành lập. */
  foundedYear: number;
}

/** [6] Khoản vay hoặc cho vay gắn với NPC cụ thể (ân tình, thù oán, đòi nợ qua sự kiện). */
export interface NpcLoan {
  id: string;
  /** 'borrowed': hộ mình vay của NPC; 'lent': hộ mình cho NPC vay. */
  kind: 'borrowed' | 'lent';
  npcId: string;
  principal: number;
  amount: number;
  interestRate: number;
  startYear: number;
  dueYear: number;
  overdueYears: number;
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
  /** [6] Các cơ nghiệp kinh doanh/sản xuất thuộc sở hữu của hộ. */
  ventures?: VentureHolding[];
  /** [6] Các khoản vay và cho vay gắn với NPC cụ thể. */
  loans?: NpcLoan[];
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
