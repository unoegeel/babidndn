package com.gdgoc.babi_order.admin.repository;

import com.gdgoc.babi_order.admin.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);
}
