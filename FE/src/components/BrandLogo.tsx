import logo from "../assets/logo.png";

interface BrandLogoProps {
  /** px 단위 너비 */
  width?: number;
  className?: string;
}

/** 바비든든 로고 (피그마 에셋) */
export default function BrandLogo({ width = 150, className }: BrandLogoProps) {
  return (
    <img
      src={logo}
      alt="바비든든"
      width={width}
      className={className}
      style={{ width, height: "auto" }}
    />
  );
}
