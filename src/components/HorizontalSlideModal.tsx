import React, { useEffect, useRef, useState } from "react";

type SlideModalProps = {
  open: boolean;
  onClose: () => void;
  pages: React.ReactNode[];
  initialIndex?: number;
  title?: string;
};

export function HorizontalSlideModal({
  open,
  onClose,
  pages,
  initialIndex = 0,
  title = "ヘルプ",
}: SlideModalProps) {
  const pageCount = pages.length;

  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(pageCount - 1, initialIndex))
  );
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  // ドラッグ追従中は transition を切る
  const transition = dragging ? "none" : "transform 220ms ease";

  // openになったら初期ページへ
  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, Math.min(pageCount - 1, initialIndex)));
      setDragX(0);
      setDragging(false);
    }
  }, [open, initialIndex, pageCount]);

  // ESCで閉じる
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((v) => Math.max(0, v - 1));
      if (e.key === "ArrowRight") setIndex((v) => Math.min(pageCount - 1, v + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pageCount]);

  const startXRef = useRef<number | null>(null);
  const lastXRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  // pointer events（スマホ/PC共通）
  const onPointerDown = (e: React.PointerEvent) => {
    // ボタン等の操作と競合したい場合は、ハンドル部分だけに付けてください
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    setDragging(true);
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startXRef.current == null) return;

    const dx = e.clientX - startXRef.current;
    setDragX(dx);

    // 速度推定
    const now = performance.now();
    const dt = Math.max(1, now - lastTRef.current);
    const vx = (e.clientX - lastXRef.current) / dt; // px/ms
    velocityRef.current = vx;

    lastXRef.current = e.clientX;
    lastTRef.current = now;
  };

  const onPointerUp = () => {
    if (startXRef.current == null) return;

    const dx = dragX;
    const vx = velocityRef.current;

    // 切り替え条件：距離 or 速度
    const DIST = 80; // px
    const VEL = 0.6; // px/ms  (≈ 600px/s)

    let next = index;
    if (dx < -DIST || vx < -VEL) next = Math.min(pageCount - 1, index + 1);
    if (dx > DIST || vx > VEL) next = Math.max(0, index - 1);

    setIndex(next);

    // スナップ戻し
    setDragX(0);
    setDragging(false);
    startXRef.current = null;
  };

  if (!open) return null;

  // 현재 페이지 + 드래그分を混ぜた translateX
  // -index*100% に px の dragX を足す形
  const trackStyle: React.CSSProperties = {
    width: `${pageCount * 100}%`,
    transform: `translateX(calc(${-index * (100 / pageCount)}% + ${dragX}px))`,
    transition,
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="ヘルプを閉じる"
      />

      {/* modal */}
      <div role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl w-full">
        {/* slider area */}
        <div
          className="relative select-none" // 縦スクロールは許可、横ドラッグは自前
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* track */}
          <div className="flex" style={trackStyle}>
            {pages.map((p, i) => (
              <div
                key={i}
                className="w-full shrink-0"
                style={{ width: `${100 / pageCount}%` }}
              >
                <div className="p-4">{p}</div>
              </div>
            ))}
          </div>

        </div>
        <div className="flex items-center justify-center gap-3 pb-2 text-xs text-white">
          <button type="button" disabled={index === 0}
            onClick={() => setIndex((v) => Math.max(0, v - 1))}
            className="rounded-full bg-white/90 text-gray-800 w-7 h-7 disabled:opacity-30"
            aria-label="前のページ">‹</button>
          <span aria-live="polite">{index + 1} / {pageCount}</span>
          <button type="button" disabled={index === pageCount - 1}
            onClick={() => setIndex((v) => Math.min(pageCount - 1, v + 1))}
            className="rounded-full bg-white/90 text-gray-800 w-7 h-7 disabled:opacity-30"
            aria-label="次のページ">›</button>
          <button type="button" onClick={onClose}
            className="rounded-full border border-white/60 px-3 py-1">閉じる（Esc）</button>
        </div>
      </div>
    </div>
  );
}
