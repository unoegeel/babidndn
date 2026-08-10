import { adminPopupAdService } from "../services/popupAdService";
import { uploadWithPresignedUrl, validateImageFile } from "./presignedImageUpload";

export function validatePopupAdImageFile(file: File): string | null {
  return validateImageFile(file);
}

/** 원본 이미지를 S3 Presigned URL로 업로드하고 공개 imageUrl을 반환합니다. */
export async function uploadPopupAdImageFile(file: File): Promise<string> {
  const contentType = file.type || "image/jpeg";
  return uploadWithPresignedUrl(file, contentType, (ct) =>
    adminPopupAdService.createImageUploadUrl(ct),
  );
}
