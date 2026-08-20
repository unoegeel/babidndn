package com.gdgoc.babi_order.clientevent.support;

import tools.jackson.databind.ObjectMapper;

public final class ClientEventJsonSize {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private ClientEventJsonSize() {
    }

    public static int estimateBytes(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsBytes(value).length;
        } catch (Exception ex) {
            return ClientEventMetadataValidator.MAX_METADATA_BYTES + 1;
        }
    }
}
