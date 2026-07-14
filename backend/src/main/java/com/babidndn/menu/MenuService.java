package com.babidndn.menu;
import com.babidndn.category.*;import com.babidndn.common.NotFoundException;import org.springframework.stereotype.Service;import java.util.List;
@Service
public class MenuService {
 private final MenuRepository menus; private final CategoryRepository categories;
 public MenuService(MenuRepository menus, CategoryRepository categories){this.menus=menus;this.categories=categories;}
 public List<Menu> findAll(){return menus.findAll();}
 public Menu create(MenuRequest r){Category c=categories.findById(r.categoryId()).orElseThrow(()->new NotFoundException("category not found"));return menus.save(new Menu(r.name(),r.price(),c,r.description(),r.imageUrl(),r.soldOut()));}
 public Menu update(Long id, MenuRequest r){Menu m=menus.findById(id).orElseThrow(()->new NotFoundException("menu not found"));Category c=categories.findById(r.categoryId()).orElseThrow(()->new NotFoundException("category not found"));m.update(r.name(),r.price(),c,r.description(),r.imageUrl(),r.soldOut());return menus.save(m);} 
 public void delete(Long id){menus.deleteById(id);} }
