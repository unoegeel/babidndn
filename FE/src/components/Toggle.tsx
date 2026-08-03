interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

/**
 * 판매중/품절 토글 (피그마: 72x36 rounded pill, knob 30px)
 * - on(판매중): 초록 rgba(34,197,94,0.75), knob 우측
 * - off(품절): 빨강 rgba(239,68,68,0.75), knob 좌측
 */
export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-[30px] w-[60px] shrink-0 rounded-full transition-colors"
      style={{
        backgroundColor: checked
          ? "rgba(34,197,94,0.75)"
          : "rgba(239,68,68,0.75)",
      }}
    >
      <span
        className="absolute top-1/2 size-[24px] -translate-y-1/2 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? "33px" : "3px" }}
      />
    </button>
  );
}
