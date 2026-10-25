// [0] Thanh chỉ số kèm mô tả bằng lời; rê chuột xem modifier nguồn (minh bạch kiểu lai — GDD 08 §6.4)
import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

export function StatBar({ label, value, max, word, tone, detail }: { label: string; value: number; max: number; word: string; tone: 'good' | 'bad'; detail?: ReactNode }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = (
    <div className="stat">
      <div className="stat-head">
        <span>{label}</span>
        <span className="stat-word">{word}</span>
      </div>
      <div className="stat-track">
        <div className={`stat-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
  return detail ? <Tooltip content={detail}>{bar}</Tooltip> : bar;
}
