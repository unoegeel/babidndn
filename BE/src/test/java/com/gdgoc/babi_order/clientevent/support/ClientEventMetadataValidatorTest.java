package com.gdgoc.babi_order.clientevent.support;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ClientEventMetadataValidatorTest {

    @Test
    void acceptsPrimitiveMetadata() {
        Map<String, Object> metadata = Map.of(
                "menuId", 1,
                "quantity", 2,
                "paid", true
        );

        Map<String, Object> normalized = ClientEventMetadataValidator.validateAndNormalize(metadata);

        assertThat(normalized).containsEntry("menuId", 1);
        assertThat(normalized).containsEntry("quantity", 2);
    }

    @Test
    void rejectsNestedObjectMetadata() {
        Map<String, Object> metadata = Map.of("nested", Map.of("menuId", 1));

        assertThatThrownBy(() -> ClientEventMetadataValidator.validateAndNormalize(metadata))
                .hasMessageContaining("metadata.nested");
    }

    @Test
    void rejectsOverlongStringValue() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("note", "x".repeat(501));

        assertThatThrownBy(() -> ClientEventMetadataValidator.validateAndNormalize(metadata))
                .hasMessageContaining("문자열 길이");
    }
}
