import { adminMenuService } from "../services/admin/menuService";
import { uploadWithPresignedUrl, validateImageFile } from "./presignedImageUpload";

export function validateMenuImageFile(file: File): string | null {
  return validateImageFile(file);
}

/**
 * 크롭된 Blob을 S3 Presigned URL로 업로드하고 공개 imageUrl을 반환합니다.
 */
export async function uploadMenuImageBlob(blob: Blob): Promise<string> {
  return uploadWithPresignedUrl(blob, "image/jpeg", (contentType) =>
    adminMenuService.createImageUploadUrl(contentType),
  );
}
