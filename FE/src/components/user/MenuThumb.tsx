/** 메뉴 썸네일 — imageUrl 이 있으면 표시, 없으면 플레이스홀더 */
export default function MenuThumb({
  src,
  alt,
  className = "",
  placeholderClassName = "text-gray-400 font-bold text-xs",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />;
  }
  return <span className={placeholderClassName}>사진</span>;
}
