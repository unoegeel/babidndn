package com.gdgoc.babi_order.savedmenu.repository;

import com.gdgoc.babi_order.savedmenu.entity.SavedMenuOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SavedMenuOptionRepository extends JpaRepository<SavedMenuOption, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SavedMenuOption option set option.menuOption = null "
            + "where option.menuOption.id = :menuOptionId")
    int detachMenuOption(@Param("menuOptionId") Long menuOptionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SavedMenuOption option set option.menuOption = null "
            + "where option.menuOption.menu.id = :menuId")
    int detachMenuOptionsByMenu(@Param("menuId") Long menuId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SavedMenuOption option set option.menuOption = null "
            + "where option.menuOption.id in :menuOptionIds")
    int detachMenuOptions(@Param("menuOptionIds") List<Long> menuOptionIds);
}
