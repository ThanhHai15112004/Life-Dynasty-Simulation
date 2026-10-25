// [0] Khóa các mẫu nhật ký do hệ thống mô phỏng tự sinh (nội dung chữ nằm ở data/events/ambient/he_thong.yaml)
export const SystemLog = {
  Birthday: 'sys.sinh_nhat',
  LifeStage: 'sys.giai_doan_doi',
  SkillUp: 'sys.ky_nang_tang',
  Tax: 'sys.nop_thue',
  Borrow: 'sys.vay_nang_lai',
  FamilyDeath: 'sys.nguoi_than_mat',
  VillageDeath: 'sys.nguoi_lang_mat',
  VillageNewRole: 'sys.nguoi_lang_moi',
  BecameHead: 'sys.lam_chu_ho',
  GameStart: 'sys.khoi_dau',
  AutoSellFood: 'sys.ban_thoc_tieu',
  Seized: 'sys.bi_xiet_no',
  Starving: 'sys.doi_kem',
  Married: 'sys.ket_hon',
  ChildBorn: 'sys.sinh_con',
  DiseaseCaught: 'sys.mac_benh',
  DiseaseRecovered: 'sys.khoi_benh',
  AmbitionMilestone: 'sys.dat_moc_tham_vong',
  CareerChanged: 'sys.chuyen_nghe',
  CareerPromoted: 'sys.thang_bac_nghe',
  ExamPassed: 'sys.do_khoa_cu',
  MourningStarted: 'sys.bat_dau_cu_tang',
} as const;

/** Khóa danh mục sổ sách (nhãn ở data/lang: ledger.<khóa>). */
export const Ledger = {
  Food: 'an_uong',
  Living: 'sinh_hoat',
  Livestock: 'nuoi_gia_suc',
  Harvest: 'thu_hoach',
  Tax: 'thue',
  Interest: 'lai_no',
  Upkeep: 'bao_tri',
  OtherIncome: 'thu_khac',
  BuyFood: 'mua_thoc',
  SellFood: 'ban_thoc',
  Borrow: 'vay',
  RepayDebt: 'tra_no',
  BuyProperty: 'mua_tai_san',
  SellProperty: 'ban_tai_san',
  Event: 'su_kien',
  Wages: 'lam_thue',
  Career: 'luong_nghe',
} as const;

/** Loại dòng nhật ký không đến từ mẫu ambient. */
export const LogKind = {
  Decision: 'quyet_dinh',
  Memory: 'ky_uc',
  Digest: 'tong_hop',
  System: 'he_thong',
} as const;
