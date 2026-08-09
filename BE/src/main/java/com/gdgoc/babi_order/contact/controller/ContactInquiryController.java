package com.gdgoc.babi_order.contact.controller;

import com.gdgoc.babi_order.contact.dto.ContactInquiryRequest;
import com.gdgoc.babi_order.contact.service.ContactInquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
@Tag(name = "Contact Inquiry", description = "서비스 문의 메일 발송 API")
public class ContactInquiryController {

    private final ContactInquiryService contactInquiryService;

    @PostMapping
    @Operation(summary = "서비스 문의 보내기")
    public ResponseEntity<Map<String, String>> create(
            @Valid @RequestBody ContactInquiryRequest request) {
        contactInquiryService.send(request);
        return ResponseEntity.ok(Map.of("status", "SENT"));
    }
}
