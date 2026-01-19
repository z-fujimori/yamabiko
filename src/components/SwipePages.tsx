import { useState } from "react";

export function SwipePages() {
  const [page, setPage] = useState(0);

  return (
    <div className="overflow-hidden h-screen">
      <div
        className="flex h-full transition-transform duration-300"
        style={{ transform: `translateX(-${page * 100}vw)` }}
      >
        {["Page 1", "Page 2", "Page 3"].map((p, i) => (
          <div
            key={i}
            className="w-screen flex items-center justify-center text-3xl"
          >
            {p}
          </div>
        ))}
      </div>

      {/* 操作ボタン */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button onClick={() => setPage(0)}>1</button>
        <button onClick={() => setPage(1)}>2</button>
        <button onClick={() => setPage(2)}>3</button>
      </div>
    </div>
  );
}
