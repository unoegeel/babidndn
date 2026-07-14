package com.babidndn.menu;

import com.babidndn.category.Category;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Menu {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private int price;
    @ManyToOne(optional = false) private Category category;
    @Column(length = 1000) private String description;
    private String imageUrl;
    private boolean soldOut;
    @OneToMany(mappedBy = "menu", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MenuOption> options = new ArrayList<>();
    protected Menu() {}
    public Menu(String name, int price, Category category, String description, String imageUrl, boolean soldOut) { this.name=name; this.price=price; this.category=category; this.description=description; this.imageUrl=imageUrl; this.soldOut=soldOut; }
    public Long getId(){return id;} public String getName(){return name;} public int getPrice(){return price;} public Category getCategory(){return category;} public String getDescription(){return description;} public String getImageUrl(){return imageUrl;} public boolean isSoldOut(){return soldOut;} public List<MenuOption> getOptions(){return options;}
    public void update(String name,int price,Category category,String description,String imageUrl,boolean soldOut){this.name=name;this.price=price;this.category=category;this.description=description;this.imageUrl=imageUrl;this.soldOut=soldOut;}
}
