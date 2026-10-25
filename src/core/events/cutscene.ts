// [1] Xếp hoạt cảnh (micro-cutscene) vào hàng đợi; @bridge lấy ra sau mỗi tháng / mỗi lệnh để Phaser vẽ
import type { SimContext } from '../systems/context';

export function queueCutscene(ctx: SimContext, id: string | undefined): void {
  if (id) ctx.state.cutscenes.push(id);
}
