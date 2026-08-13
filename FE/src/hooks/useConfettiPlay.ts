import { useCallback, useRef, useState } from "react";

/**
 * Shell 레벨 confetti 재생 상태와 제어 API만 담당한다.
 * READY 판정·readyCall·navigation은 호출부 책임이다.
 */
export function useConfettiPlay() {
  const [confettiPlay, setConfettiPlay] = useState<{ playKey: string } | null>(null);
  const confettiOnDoneRef = useRef<(() => void) | null>(null);

  const startConfetti = useCallback((playKey: string, onDone?: () => void) => {
    confettiOnDoneRef.current = onDone ?? null;
    setConfettiPlay({ playKey });
  }, []);

  const stopConfetti = useCallback(() => {
    confettiOnDoneRef.current = null;
    setConfettiPlay(null);
  }, []);

  const finishConfetti = useCallback(() => {
    const onDone = confettiOnDoneRef.current;
    confettiOnDoneRef.current = null;
    setConfettiPlay(null);
    onDone?.();
  }, []);

  return {
    confettiPlay,
    startConfetti,
    stopConfetti,
    finishConfetti,
  };
}
