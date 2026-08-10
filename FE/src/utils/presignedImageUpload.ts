const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** JPG/PNG/WEBP/GIF, 최대 5MB */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_BYTES) {
    return "이미지 용량은 최대 5MB까지 가능합니다.";
  }
  return null;
}

type PresignedUploadUrl = {
  uploadUrl: string;
  imageUrl: string;
};

/**
 * Presigned URL 발급 후 PUT 업로드하고 공개 imageUrl을 반환합니다.
 * 엔드포인트는 requestUploadUrl 콜백으로 주입합니다.
 */
export async function uploadWithPresignedUrl(
  body: Blob,
  contentType: string,
  requestUploadUrl: (contentType: string) => Promise<PresignedUploadUrl>,
): Promise<string> {
  const { uploadUrl, imageUrl } = await requestUploadUrl(contentType);

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!putRes.ok) {
    throw new Error(`이미지 업로드에 실패했습니다. (${putRes.status})`);
  }

  return imageUrl;
}
