import { adminPopupAdService } from "../services/popupAdService";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validatePopupAdImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_BYTES) {
    return "이미지 용량은 최대 5MB까지 가능합니다.";
  }
  return null;
}

/** 원본 이미지를 S3 Presigned URL로 업로드하고 공개 imageUrl을 반환합니다. */
export async function uploadPopupAdImageFile(file: File): Promise<string> {
  const contentType = file.type || "image/jpeg";
  const { uploadUrl, imageUrl } = await adminPopupAdService.createImageUploadUrl(contentType);

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`이미지 업로드에 실패했습니다. (${putRes.status})`);
  }

  return imageUrl;
}
