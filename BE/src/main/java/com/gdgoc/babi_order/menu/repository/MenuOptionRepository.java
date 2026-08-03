package com.gdgoc.babi_order.menu.repository;

import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuOptionRepository extends JpaRepository<MenuOption, Long> {

    List<MenuOption> findAllByMenuIdOrderByDisplayOrderAscIdAsc(Long menuId);

    boolean existsByMenuIdAndName(Long menuId, String name);

    boolean existsByMenuIdAndNameAndIdNot(Long menuId, String name, Long id);

    void deleteAllByMenuId(Long menuId);

    List<MenuOption> findAllByMenuIdAndGroupTypeIn(
            Long menuId, List<OptionGroupType> groupTypes);
}
