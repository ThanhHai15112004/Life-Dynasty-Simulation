// [2] Thực thể: Tổ chức Fractal & Ủy quyền (Phase 10 — GDD 03 §10)
export type OrganizationFactorKey = 'treasury' | 'morale' | 'security' | 'investment' | 'influence';

export interface OrganizationFactors {
  /** Ngân quỹ tổ chức (quan). */
  treasury: number;
  /** Lòng người / Sĩ khí nội bộ (0..100). */
  morale: number;
  /** An ninh / Phòng vệ / Kỷ luật (0..100). */
  security: number;
  /** Đầu tư hạ tầng / Phát triển dài hạn (0..100). */
  investment: number;
  /** Ảnh hưởng đối ngoại / Thế lực vùng (0..100). */
  influence: number;
}

export type DelegationPolicy = 'balanced' | 'treasury' | 'morale' | 'security' | 'expansion';

export interface OrganizationDelegation {
  /** ID NPC được ủy quyền quản lý (null = người chơi tự điều hành). */
  deputyId: string | null;
  /** Trọng tâm ủy quyền: cân bằng, ngân quỹ, lòng người, an ninh, hoặc khuếch trương. */
  policy: DelegationPolicy;
  /** Điểm trung thành của người được ủy quyền (0..100). */
  deputyLoyalty: number;
  /** Số tháng đã ủy quyền liên tục. */
  monthsDelegated: number;
}

export interface OrganizationState {
  id: string;
  name: string;
  kind: 'village_council' | 'merchant_guild' | 'outlaw_stronghold' | 'prefecture_office';
  settlementId: string;
  /** Người đứng đầu tổ chức hiện tại (characterId hoặc 'player'). */
  leaderId: string;
  /** Bậc của người chơi trong tổ chức (-1 = chưa gia nhập, 0 = Thành viên, 1 = Chấp sự, 2 = Phó hội/Hương mục, 3 = Thủ lĩnh). */
  playerRank: number;
  /** Điểm cống hiến của người chơi trong tổ chức. */
  playerContribution: number;
  /** 5 yếu tố quản lý Fractal dùng chung cho mọi cấp độ tổ chức. */
  factors: OrganizationFactors;
  /** Trạng thái ủy quyền khi người chơi làm Thủ lĩnh hoặc Phó thủ lĩnh. */
  delegation: OrganizationDelegation;
}
