import { useCallback, useEffect, useState } from "react";

export const useResizePanel = ({
  minPercent,
  maxPercent,
  defaultWidthPercent,
  panelRef,
}: {
  minPercent?: number;
  maxPercent?: number;
  defaultWidthPercent?: number;
  panelRef: React.RefObject<HTMLDivElement>;
}) => {
  const [width, setWidth] = useState(defaultWidthPercent);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const container = panelRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const offsetX = e.clientX - containerRect.left;
      const newWidthPercent = (offsetX / containerRect.width) * 100;

      const clampedWidth = Math.min(
        Math.max(newWidthPercent, minPercent),
        maxPercent
      );
      setWidth(clampedWidth);
    },
    [isResizing, panelRef, minPercent, maxPercent]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return { width, handleMouseDown };
};
