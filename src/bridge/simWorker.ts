// [9] Web Worker chạy lõi mô phỏng @core tách biệt khỏi luồng vẽ chính khi tua nhanh hoặc tick nặng.
// Vì @core thuần TypeScript (Zero DOM/Phaser/React), GameSession chạy nguyên vẹn trong Worker.
import { loadContent } from '@content/ContentLoader';
import { viteRawFiles } from '@content/sources/viteSource';
import { GameSession, type Command } from '@core/index';

export type SimWorkerRequest =
  | { id: number; type: 'load'; saveText: string }
  | { id: number; type: 'tickBatch'; months: number; autoMinor: boolean }
  | { id: number; type: 'dispatch'; command: Command };

export type SimWorkerResponse =
  | { id: number; ok: true; saveText: string; elapsedMs: number }
  | { id: number; ok: false; error: string };

/** Khởi tạo trình lắng nghe nếu tệp này đang chạy trong ngữ cảnh Web Worker. */
function initWorkerScope(): void {
  const g = globalThis as unknown as {
    onmessage?: ((ev: MessageEvent<SimWorkerRequest>) => void) | null;
    postMessage?: (msg: SimWorkerResponse) => void;
    document?: unknown;
  };
  if (typeof g.postMessage !== 'function' || typeof g.document !== 'undefined') {
    return;
  }

  let content: ReturnType<typeof loadContent> | null = null;
  let session: GameSession | null = null;

  const ensureContent = () => {
    if (!content) content = loadContent(viteRawFiles());
    return content;
  };

  g.onmessage = (ev: MessageEvent<SimWorkerRequest>) => {
    const req = ev.data;
    const t0 = performance.now();
    try {
      const bundle = ensureContent();
      if (req.type === 'load') {
        session = GameSession.load(bundle, req.saveText);
      } else if (req.type === 'tickBatch') {
        if (!session) throw new Error('Worker session not initialized');
        for (let i = 0; i < req.months; i++) {
          if (session.state.gameOver || session.state.pending) break;
          if (session.state.minor) {
            if (req.autoMinor) session.autoResolveMinor();
            else break;
          }
          session.tickMonth();
        }
      } else if (req.type === 'dispatch') {
        if (!session) throw new Error('Worker session not initialized');
        session.dispatch(req.command);
      }
      g.postMessage?.({
        id: req.id,
        ok: true,
        saveText: session ? session.serialize() : '',
        elapsedMs: Number((performance.now() - t0).toFixed(2)),
      });
    } catch (e) {
      g.postMessage?.({
        id: req.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };
}

initWorkerScope();
