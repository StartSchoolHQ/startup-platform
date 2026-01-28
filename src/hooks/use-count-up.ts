import { useEffect, useState } from "react";

/**
 * Simple count-up animation hook
 * Animates a number from 0 to the target value
 */
export function useCountUp(
  targetValue: number,
  duration: number = 800
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Reset when target changes
    setCount(0);

    // Skip animation for 0
    if (targetValue === 0) {
      return;
    }

    const startTime = Date.now();
    const startValue = 0;

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
        requestAnimationFrame(animate);
      } else {
        setCount(targetValue); // Ensure we end exactly at target
      }
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [targetValue, duration]);

  return count;
}
