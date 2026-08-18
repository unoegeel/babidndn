package com.gdgoc.babi_order.savedmenu.repository;

import com.gdgoc.babi_order.savedmenu.entity.SavedMenu;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SavedMenuRepository extends JpaRepository<SavedMenu, Long> {

    @EntityGraph(attributePaths = {"menu", "options", "options.menuOption", "options.menuOption.menu"})
    List<SavedMenu> findAllByClientKeyOrderByCreatedAtDescIdDesc(String clientKey);

    @EntityGraph(attributePaths = {"menu", "options", "options.menuOption", "options.menuOption.menu"})
    Optional<SavedMenu> findWithDetailsById(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SavedMenu saved set saved.menu = null where saved.menu.id = :menuId")
    int detachMenu(@Param("menuId") Long menuId);
}
