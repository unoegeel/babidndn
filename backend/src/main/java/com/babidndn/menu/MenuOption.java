package com.babidndn.menu;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
public class MenuOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JsonIgnore private Menu menu;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private int extraPrice;
    protected MenuOption() {}
    public MenuOption(Menu menu, String name, int extraPrice){this.menu=menu;this.name=name;this.extraPrice=extraPrice;}
    public Long getId(){return id;} public String getName(){return name;} public int getExtraPrice(){return extraPrice;}
}
