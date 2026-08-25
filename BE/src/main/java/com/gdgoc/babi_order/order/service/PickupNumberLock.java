package com.gdgoc.babi_order.order.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Serializes pickup-number allocation across concurrent payment activations.
 * <ul>
 *   <li>In-JVM {@link ReentrantLock} — single-instance (current prod/dev docker)</li>
 *   <li>MySQL session {@code GET_LOCK} via the <em>same</em> transaction-bound JDBC
 *       connection ({@link DataSourceUtils}) — multi-instance safety without schema change</li>
 * </ul>
 * Named locks are connection-scoped (not transaction-scoped). Acquire and release must
 * use one physical connection held for the Spring transaction lifetime; release runs in
 * {@code afterCompletion}, which fires before
 * {@code AbstractPlatformTransactionManager#cleanupAfterCompletion} unbinds the connection.
 */
@Slf4j
@Component
public class PickupNumberLock {

    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");
    private static final int MYSQL_LOCK_TIMEOUT_SECONDS = 5;

    private final ReentrantLock localLock = new ReentrantLock();
    private final boolean mysqlNamedLockEnabled;
    private final DataSource dataSource;

    public PickupNumberLock(
            DataSource dataSource,
            @Value("${spring.datasource.url:}") String datasourceUrl
    ) {
        this.dataSource = dataSource;
        String url = datasourceUrl == null ? "" : datasourceUrl.toLowerCase();
        // MODE=MySQL in H2 URLs must not enable GET_LOCK
        this.mysqlNamedLockEnabled = url.startsWith("jdbc:mysql:");
    }

    public <T> T executeExclusive(Supplier<T> action) {
        localLock.lock();
        boolean mysqlHeld = false;
        boolean deferredRelease = false;
        try {
            mysqlHeld = tryAcquireMysqlLock();
            T result = action.get();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                final boolean releaseMysql = mysqlHeld;
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        // Still before cleanupAfterCompletion — transactional connection remains bound.
                        releaseLocks(releaseMysql);
                    }
                });
                deferredRelease = true;
                mysqlHeld = false;
            }
            return result;
        } finally {
            if (!deferredRelease) {
                releaseLocks(mysqlHeld);
            }
        }
    }

    private void releaseLocks(boolean mysqlHeld) {
        try {
            if (mysqlHeld) {
                releaseMysqlLock();
            }
        } finally {
            if (localLock.isHeldByCurrentThread()) {
                localLock.unlock();
            }
        }
    }

    private String lockName() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        return "babi:pickup:" + today;
    }

    /**
     * Acquires MySQL named lock on the Spring transaction-bound connection.
     * {@link DataSourceUtils#getConnection} returns the same physical connection JPA uses
     * while a transaction is active; the connection is not closed here (Spring owns release).
     *
     * @return true if GET_LOCK returned 1
     * @throws DataAccessResourceFailureException on timeout (0), error (NULL), or SQL failure
     *         when MySQL locks are required — never silently continue without the lock
     */
    private boolean tryAcquireMysqlLock() {
        if (!mysqlNamedLockEnabled) {
            return false;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException(
                    "Pickup MySQL GET_LOCK requires an active Spring transaction so acquire/release share one connection"
            );
        }
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try (PreparedStatement statement = connection.prepareStatement("SELECT GET_LOCK(?, ?)")) {
            statement.setString(1, lockName());
            statement.setInt(2, MYSQL_LOCK_TIMEOUT_SECONDS);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    throw new DataAccessResourceFailureException(
                            "MySQL GET_LOCK returned no row for " + lockName()
                    );
                }
                int code = resultSet.getInt(1);
                if (resultSet.wasNull()) {
                    throw new DataAccessResourceFailureException(
                            "MySQL GET_LOCK returned NULL (error) for " + lockName()
                    );
                }
                if (code == 1) {
                    return true;
                }
                if (code == 0) {
                    throw new DataAccessResourceFailureException(
                            "MySQL GET_LOCK timed out for " + lockName()
                    );
                }
                throw new DataAccessResourceFailureException(
                        "MySQL GET_LOCK unexpected result " + code + " for " + lockName()
                );
            }
        } catch (SQLException exception) {
            throw new DataAccessResourceFailureException(
                    "MySQL GET_LOCK failed for " + lockName(),
                    exception
            );
        }
    }

    /**
     * Releases on the same transaction-bound connection obtained via {@link DataSourceUtils}.
     * RELEASE_LOCK: 1 = released, 0 = not held by this connection, NULL = unknown name.
     */
    private void releaseMysqlLock() {
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try (PreparedStatement statement = connection.prepareStatement("SELECT RELEASE_LOCK(?)")) {
            statement.setString(1, lockName());
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    log.warn("MySQL RELEASE_LOCK returned no row for {}", lockName());
                    return;
                }
                int code = resultSet.getInt(1);
                if (resultSet.wasNull()) {
                    log.warn("MySQL RELEASE_LOCK returned NULL (lock name unknown) for {}", lockName());
                    return;
                }
                if (code == 1) {
                    log.debug("MySQL RELEASE_LOCK released {}", lockName());
                } else if (code == 0) {
                    log.warn(
                            "MySQL RELEASE_LOCK returned 0 (lock not held by this connection) for {}",
                            lockName()
                    );
                } else {
                    log.warn("MySQL RELEASE_LOCK unexpected result {} for {}", code, lockName());
                }
            }
        } catch (SQLException exception) {
            log.warn("MySQL RELEASE_LOCK failed for {}: {}", lockName(), exception.toString());
        }
    }
}
