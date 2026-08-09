package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.config.AwsS3Properties;
import com.gdgoc.babi_order.menu.dto.response.MenuImageUploadUrlResponse;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MenuImageService {

    private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "menu/";
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    private final S3Presigner s3Presigner;
    private final AwsS3Properties awsS3Properties;

    public MenuImageUploadUrlResponse createUploadUrl(String contentType) {
        return createUploadUrl(contentType, KEY_PREFIX);
    }

    /** 팝업도 menu/ prefix 사용 — IAM이 menu/* PutObject만 허용하는 환경 대응 */
    public MenuImageUploadUrlResponse createPopupUploadUrl(String contentType) {
        return createUploadUrl(contentType, KEY_PREFIX);
    }

    public MenuImageUploadUrlResponse createUploadUrl(String contentType, String keyPrefix) {
        String extension = EXTENSIONS_BY_CONTENT_TYPE.get(contentType);
        if (extension == null) {
            throw new MenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "UNSUPPORTED_IMAGE_TYPE",
                    "지원하지 않는 이미지 형식입니다. contentType=" + contentType
            );
        }

        String key = keyPrefix + UUID.randomUUID() + "." + extension;
        String bucket = awsS3Properties.getBucket();

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(UPLOAD_URL_TTL)
                        .putObjectRequest(putObjectRequest)
                        .build());

        String imageUrl = "https://%s.s3.%s.amazonaws.com/%s"
                .formatted(bucket, awsS3Properties.getRegion(), key);

        return MenuImageUploadUrlResponse.builder()
                .uploadUrl(presignedRequest.url().toString())
                .imageUrl(imageUrl)
                .build();
    }
}
