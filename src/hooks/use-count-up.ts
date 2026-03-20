import { useEffect, useRef, useState } from "react";

/**
 * Simple count-up animation hook
 * Animates a number from previous value to the target value
 * Never flashes to 0 on re-renders
 */
export function useCountUp(
  targetValue: number,
  duration: number = 800
): number {
  const [count, setCount] = useState(targetValue);
  const prevValueRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const startValue =
      prevValueRef.current !== null ? prevValueRef.current : targetValue;
    prevValueRef.current = targetValue;

    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(
        startValue + (targetValue - startValue) * easeOutCubic
      );

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(targetValue); // Ensure we end exactly at target
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, duration]);

  return count;
}
