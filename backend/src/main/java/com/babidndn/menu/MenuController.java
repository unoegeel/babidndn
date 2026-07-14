package com.babidndn.menu;
import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController
public class MenuController { private final MenuService service; public MenuController(MenuService service){this.service=service;}
 @GetMapping("/api/menus") public List<Menu> menus(){return service.findAll();}
 @PostMapping("/api/admin/menus") public Menu create(@Valid @RequestBody MenuRequest request){return service.create(request);} 
 @PatchMapping("/api/admin/menus/{id}") public Menu update(@PathVariable Long id,@Valid @RequestBody MenuRequest request){return service.update(id,request);} 
 @DeleteMapping("/api/admin/menus/{id}") public void delete(@PathVariable Long id){service.delete(id);} }
