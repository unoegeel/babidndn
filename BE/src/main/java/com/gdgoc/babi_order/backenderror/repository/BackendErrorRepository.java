package com.gdgoc.babi_order.backenderror.repository;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BackendErrorRepository extends JpaRepository<BackendError, Long>, JpaSpecificationExecutor<BackendError> {
}
