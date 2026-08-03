package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.config.AwsS3Properties;
import com.gdgoc.babi_order.menu.dto.response.MenuImageUploadUrlResponse;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MenuImageServiceTest {

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private PresignedPutObjectRequest presignedPutObjectRequest;

    private MenuImageService menuImageService;

    @BeforeEach
    void setUp() {
        AwsS3Properties awsS3Properties = new AwsS3Properties();
        awsS3Properties.setRegion("ap-northeast-2");
        awsS3Properties.setBucket("babi-order-images");
        menuImageService = new MenuImageService(s3Presigner, awsS3Properties);
    }

    @Test
    void createUploadUrlReturnsPresignedUploadUrlAndPublicImageUrl() throws Exception {
        given(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class)))
                .willReturn(presignedPutObjectRequest);
        given(presignedPutObjectRequest.url())
                .willReturn(new URI("https://babi-order-images.s3.ap-northeast-2.amazonaws.com/menu/test.jpg?X-Amz-Signature=abc").toURL());

        MenuImageUploadUrlResponse response = menuImageService.createUploadUrl("image/jpeg");

        assertThat(response.getUploadUrl()).contains("X-Amz-Signature=abc");
        assertThat(response.getImageUrl())
                .startsWith("https://babi-order-images.s3.ap-northeast-2.amazonaws.com/menu/")
                .endsWith(".jpg");
    }

    @Test
    void createUploadUrlThrowsExceptionWhenContentTypeIsUnsupported() {
        assertThatThrownBy(() -> menuImageService.createUploadUrl("application/pdf"))
                .isInstanceOf(MenuApiException.class)
                .hasMessageContaining("application/pdf");
    }
}
