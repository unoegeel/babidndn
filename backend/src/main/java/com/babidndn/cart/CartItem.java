package com.babidndn.cart;
import com.babidndn.menu.Menu;import jakarta.persistence.*;
@Entity
public class CartItem { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(optional=false) private Menu menu; private int quantity; private String optionSummary; private int optionPrice;
 protected CartItem(){} public CartItem(Menu menu,int quantity,String optionSummary,int optionPrice){this.menu=menu;this.quantity=quantity;this.optionSummary=optionSummary;this.optionPrice=optionPrice;} public Long getId(){return id;} public Menu getMenu(){return menu;} public int getQuantity(){return quantity;} public String getOptionSummary(){return optionSummary;} public int getOptionPrice(){return optionPrice;} public int getLineTotal(){return (menu.getPrice()+optionPrice)*quantity;} public void update(int quantity,String optionSummary,int optionPrice){this.quantity=quantity;this.optionSummary=optionSummary;this.optionPrice=optionPrice;} }
