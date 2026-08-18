import { useEffect, useRef, useState, type FormEvent } from "react";
import ImageCropModal from "../../ImageCropModal";
import { uploadMenuImageBlob, validateMenuImageFile } from "../../../services/admin/menuImageUpload";
import type { Menu, MenuCategory, MenuBadge } from "../../../types/admin";

/** 신규 등록 / 기존 메뉴 수정 공용 폼 */
export function MenuForm({
  mode,
  menu,
  categories,
  defaultCategory,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  menu?: Menu;
  categories: MenuCategory[];
  defaultCategory: MenuCategory;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    price: number;
    category: MenuCategory;
    toppingAvailable: boolean;
    imageUrl?: string | null;
    badge: MenuBadge;
  }) => void;
  /** 수정 모드에서만 사용하는 메뉴 삭제 핸들러 */
  onDelete?: () => void;
}) {
  const [name, setName] = useState(menu?.name ?? "");
  const [price, setPrice] = useState(menu ? String(menu.price) : "");
  const [category, setCategory] = useState<MenuCategory>(
    menu?.category ?? defaultCategory,
  );
  const [topping, setTopping] = useState(
    menu?.toppingAvailable === false ? "불가능" : "가능",
  );
  const [badge, setBadge] = useState<MenuBadge>(menu?.badge ?? "NONE");
  const [imageUrl, setImageUrl] = useState<string | null>(menu?.imageUrl ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 좁은 화면에서는 폼이 목록 아래에 배치되므로, 열릴 때 화면 안으로 스크롤
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    const error = validateMenuImageFile(file);
    if (error) {
      alert(error);
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    try {
      const url = await uploadMenuImageBlob(blob);
      setImageUrl(url);
    } catch (err) {
      console.error("메뉴 이미지 업로드 실패:", err);
      alert(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || uploading) return;
    onSubmit({
      name: name.trim(),
      price: Number(price),
      category,
      toppingAvailable: topping === "가능",
      imageUrl,
      badge,
    });
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex w-full shrink-0 flex-col rounded-[25px] border border-black/50 bg-canvas p-[24px] lg:w-[340px] lg:overflow-auto"
      >
        <h2 className="text-[26px] font-medium tracking-wide text-black">
          {mode === "edit" ? "메뉴 수정" : "새 메뉴 등록"}
        </h2>

        {/* 사진 첨부: 태블릿 flex 레이아웃에서 높이가 줄어들지 않도록 shrink-0 + min-h 고정 */}
        <label
          className={`relative mt-[20px] flex h-[200px] min-h-[200px] w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-[8px] overflow-hidden rounded-[25px] border-2 border-dashed border-black/40 bg-black/[0.03] text-black/55 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              onFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="메뉴 미리보기"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
              />
              <span className="pointer-events-none relative z-10 rounded bg-black/60 px-3 py-1 text-[13px] font-medium text-white">
                {uploading ? "업로드 중…" : "사진 변경"}
              </span>
            </>
          ) : (
            <div className="pointer-events-none relative z-10 flex flex-col items-center gap-[8px]">
              <PhotoIcon />
              <span className="text-[18px] font-medium">
                {uploading ? "업로드 중…" : "사진 첨부"}
              </span>
              <span className="text-[14px]">JPG, PNG (최대 5MB)</span>
            </div>
          )}
        </label>
        {imageUrl && (
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            disabled={uploading}
            className="mt-2 self-end text-[13px] font-medium text-danger"
          >
            사진 제거
          </button>
        )}

        <FormLabel>메뉴명</FormLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 참치마요 컵밥"
          className={fieldControlClass}
        />

        <FormLabel>가격</FormLabel>
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="예) 6800"
            className={`${fieldControlClass} ${noSpinnerClass} pr-[48px]`}
          />
          <span className="pointer-events-none absolute right-[20px] top-1/2 -translate-y-1/2 text-[15px] text-black/50">
            원
          </span>
        </div>

        <FormLabel>카테고리</FormLabel>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MenuCategory)}
            className={`${fieldControlClass} appearance-none pr-[48px]`}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>

        <FormLabel>토핑 선택</FormLabel>
        <div className="relative">
          <select
            value={topping}
            onChange={(e) => setTopping(e.target.value)}
            className={`${fieldControlClass} appearance-none pr-[48px]`}
          >
            <option value="가능">가능</option>
            <option value="불가능">불가능</option>
          </select>
          <SelectChevron />
        </div>

        <FormLabel>메뉴 배지</FormLabel>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "NONE" as const, label: "없음" },
              { value: "POPULAR" as const, label: "인기" },
              { value: "BEST" as const, label: "베스트" },
              { value: "RECOMMENDED" as const, label: "추천" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBadge(option.value)}
              className={`h-9 rounded-[8px] border px-3 text-[13px] font-medium ${
                badge === option.value
                  ? "border-black bg-black text-white"
                  : "border-black/40 bg-canvas text-black"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "edit" && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-[28px] h-[48px] w-full rounded-[10px] border border-danger bg-canvas text-[15px] font-medium text-danger"
          >
            메뉴 삭제
          </button>
        )}

        <div className={`${mode === "edit" && onDelete ? "mt-[12px]" : "mt-[28px]"} flex gap-[16px]`}>
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] flex-1 rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium text-black"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="h-[48px] flex-[1.2] rounded-[10px] bg-black text-[15px] font-medium text-canvas disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </form>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={(blob) => {
            void handleCropConfirm(blob);
          }}
        />
      )}
    </>
  );
}

function FormLabel({ children }: { children: string }) {
  return (
    <label className="mt-[24px] mb-[10px] block text-[20px] font-medium text-black">
      {children}
    </label>
  );
}

/** 메뉴명·가격·카테고리·토핑 입력칸 공통 높이/패딩 (가격 기준 48px) */
const fieldControlClass =
  "box-border h-[48px] min-h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[24px] text-[15px] leading-none outline-none placeholder:text-black/50 focus:border-black";

/** number input 스피너(up/down) 숨김 */
const noSpinnerClass =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-[18px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-black/50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}
