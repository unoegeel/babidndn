package com.gdgoc.babi_order.order.repository;

import com.gdgoc.babi_order.order.entity.OrderItemOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update OrderItemOption itemOption set itemOption.menuOption = null "
            + "where itemOption.menuOption.id = :menuOptionId")
    int detachMenuOption(@Param("menuOptionId") Long menuOptionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update OrderItemOption itemOption set itemOption.menuOption = null "
            + "where itemOption.menuOption.menu.id = :menuId")
    int detachMenuOptionsByMenu(@Param("menuId") Long menuId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update OrderItemOption itemOption set itemOption.menuOption = null "
            + "where itemOption.menuOption.id in :menuOptionIds")
    int detachMenuOptions(@Param("menuOptionIds") List<Long> menuOptionIds);
}
