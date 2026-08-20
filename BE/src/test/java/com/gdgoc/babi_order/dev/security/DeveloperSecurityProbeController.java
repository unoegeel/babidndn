package com.gdgoc.babi_order.dev.security;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Developer Security 테스트 전용 probe.
 * src/test 범위에서만 component scan 되며 운영 코드에 포함되지 않는다.
 */
@RestController
@RequestMapping("/api/dev")
public class DeveloperSecurityProbeController {

    @GetMapping("/__security-probe")
    public ResponseEntity<Void> probe() {
        return ResponseEntity.noContent().build();
    }
}
