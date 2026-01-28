import React, { useEffect, useRef, useState } from "react";

type SlideModalProps = {
  open: boolean;
  onClose: () => void;
  pages: React.ReactNode[]; // 2ページ想定（増えても動く）
  initialIndex?: number;
  title?: string;
};

export function HorizontalSlideModal({
  open,
  onClose,
  pages,
  initialIndex = 0,
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
        aria-label="close overlay"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl w-full">
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

          {/* 左矢印ボタン */}
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIndex((v) => Math.max(0, v - 1));
              }}
              className="absolute left-14 top-33 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center transition hover:scale-110 active:scale-95"
              aria-label="Previous page"
            >
              ‹
            </button>
          )}

          {/* 右矢印ボタン */}
          {index < pageCount - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIndex((v) => Math.min(pageCount - 1, v + 1));
              }}
              className="absolute right-14 top-33 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center transition hover:scale-110 active:scale-95"
              aria-label="Next page"
            >
              ›
            </button>
          )}

          {/* dots */}
          <div className="flex items-center justify-center gap-2 pb-4 pt-2">
            {Array.from({ length: pageCount }).map((_, i) => {
              const active = i === index;
              return (
                <span
                  key={i}
                  className={[
                    "h-2 w-2 rounded-full transition-colors",
                    active ? "bg-zinc-300" : "bg-zinc-500",
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
