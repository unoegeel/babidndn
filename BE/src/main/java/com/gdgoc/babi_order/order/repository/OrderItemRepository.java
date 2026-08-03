package com.gdgoc.babi_order.order.repository;

import com.gdgoc.babi_order.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update OrderItem item set item.menu = null where item.menu.id = :menuId")
    int detachMenu(@Param("menuId") Long menuId);
}
