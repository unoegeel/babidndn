package com.gdgoc.babi_order.clientevent.repository;

import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientEventRepository extends JpaRepository<ClientEvent, Long> {
    boolean existsByEventId(String eventId);
}
