package com.gdgoc.babi_order.dev.error;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.backenderror.repository.BackendErrorRepository;
import com.gdgoc.babi_order.clienterror.ClientErrorSource;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorPageResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.transaction.TestTransaction;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(DeveloperErrorService.class)
class DeveloperErrorServiceTest {

    private static final Instant T1 = Instant.parse("2026-08-19T10:00:00Z");
    private static final Instant T2 = Instant.parse("2026-08-19T11:00:00Z");
    private static final Instant T3 = Instant.parse("2026-08-19T12:00:00Z");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private DeveloperErrorService developerErrorService;

    @Autowired
    private ClientErrorRepository clientErrorRepository;

    @Autowired
    private BackendErrorRepository backendErrorRepository;

    @Test
    void listReturnsEmptyPageWhenNoErrors() {
        DeveloperErrorPageResponse page = developerErrorService.list(
                null, null, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isZero();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void listReturnsFrontendErrorsOnly() {
        persistClientError("req-fe", T2);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                DeveloperErrorSource.FRONTEND, null, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().getSource()).isEqualTo(DeveloperErrorSource.FRONTEND);
        assertThat(page.getContent().getFirst().getId()).startsWith("frontend-");
    }

    @Test
    void listReturnsBackendErrorsOnly() {
        persistBackendError("req-be", 500, T1);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                DeveloperErrorSource.BACKEND, null, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getSource()).isEqualTo(DeveloperErrorSource.BACKEND);
        assertThat(page.getContent().getFirst().getStatus()).isEqualTo(500);
    }

    @Test
    void listMergesFrontendAndBackendSortedByCreatedAtDesc() {
        persistClientError("req-fe", T1);
        persistBackendError("req-be", 500, T3);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                null, null, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting("source")
                .containsExactly(DeveloperErrorSource.BACKEND, DeveloperErrorSource.FRONTEND);
    }

    @Test
    void listHandlesNullCreatedAtWithoutFailure() {
        ClientError error = new ClientError(
                "req-null", null, ClientErrorSource.WINDOW, "TypeError", "boom",
                null, null, "/user", null, null, null, T1
        );
        setField(error, "createdAt", null);
        entityManager.persist(error);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                null, null, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void listFiltersByStatusForBackendOnly() {
        persistBackendError("req-500", 500, T1);
        persistBackendError("req-404", 404, T2);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                null, 500, null, null, null, null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getStatus()).isEqualTo(500);
    }

    @Test
    void listFiltersByRequestId() {
        persistClientError("target-id", T1);
        persistClientError("other-id", T2);
        entityManager.flush();

        DeveloperErrorPageResponse page = developerErrorService.list(
                null, null, null, null, "target-id", null, 0, 50
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getRequestId()).isEqualTo("target-id");
    }

    @Test
    void listSupportsPagination() {
        for (int i = 0; i < 3; i++) {
            persistClientError("req-" + i, T1.plusSeconds(i));
        }
        entityManager.flush();

        DeveloperErrorPageResponse page0 = developerErrorService.list(
                null, null, null, null, null, null, 0, 2
        );
        DeveloperErrorPageResponse page1 = developerErrorService.list(
                null, null, null, null, null, null, 1, 2
        );

        assertThat(page0.getTotalElements()).isEqualTo(3);
        assertThat(page0.getContent()).hasSize(2);
        assertThat(page1.getContent()).hasSize(1);
    }

    private void persistClientError(String requestId, Instant createdAt) {
        ClientError error = new ClientError(
                requestId, null, ClientErrorSource.WINDOW, "TypeError", "boom",
                null, null, "/user/cart", null, "Chrome", "Mac", createdAt
        );
        setField(error, "createdAt", createdAt);
        entityManager.persist(error);
    }

    private void persistBackendError(String requestId, int status, Instant createdAt) {
        BackendError error = new BackendError(
                requestId, "GET", "/api/test", status,
                "java.lang.RuntimeException", "failed", null, 10L, null
        );
        setField(error, "createdAt", createdAt);
        entityManager.persist(error);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
