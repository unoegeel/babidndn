package com.gdgoc.babi_order.clienterror.repository;

import com.gdgoc.babi_order.clienterror.entity.ClientError;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ClientErrorRepository extends JpaRepository<ClientError, Long>, JpaSpecificationExecutor<ClientError> {
}
