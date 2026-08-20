package com.gdgoc.babi_order.clientevent.repository;

import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ClientEventRepository extends JpaRepository<ClientEvent, Long>, JpaSpecificationExecutor<ClientEvent> {
    boolean existsByEventId(String eventId);
}
