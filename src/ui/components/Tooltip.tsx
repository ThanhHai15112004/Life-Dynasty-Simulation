// [0] Tooltip đơn giản: hiện khi rê chuột hoặc chạm giữ
import { useState, type ReactNode } from 'react';

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen((o) => !o)}>
      {children}
      {open && <span className="tip-box">{content}</span>}
    </span>
  );
}
