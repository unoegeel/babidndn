package com.gdgoc.babi_order.contact.service;

import com.gdgoc.babi_order.contact.config.ContactMailProperties;
import com.gdgoc.babi_order.contact.dto.ContactInquiryRequest;
import com.gdgoc.babi_order.contact.exception.ContactApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContactInquiryService {

    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter SENT_AT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JavaMailSender mailSender;
    private final ContactMailProperties mailProperties;

    public void send(ContactInquiryRequest request) {
        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (!StringUtils.hasText(content)) {
            throw new ContactApiException(
                    HttpStatus.BAD_REQUEST,
                    "EMPTY_CONTENT",
                    "문의 내용을 입력해 주세요.");
        }

        String from = mailProperties.getFrom();
        String to = mailProperties.getTo();
        if (!StringUtils.hasText(from) || !StringUtils.hasText(to)) {
            throw new ContactApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "MAIL_NOT_CONFIGURED",
                    "메일 발송 설정이 되어 있지 않습니다.");
        }

        String sentAt = LocalDateTime.now(STORE_ZONE).format(SENT_AT);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("[바비오더 서비스 문의] " + sentAt);
        message.setText(
                "바비오더 서비스 문의가 접수되었습니다.\n\n"
                        + "접수 시각: " + sentAt + " (Asia/Seoul)\n\n"
                        + "-------- 문의 내용 --------\n"
                        + content
                        + "\n----------------------------\n");

        try {
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("서비스 문의 메일 발송 실패", ex);
            throw new ContactApiException(
                    HttpStatus.BAD_GATEWAY,
                    "MAIL_SEND_FAILED",
                    "문의 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }
}
