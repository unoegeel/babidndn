package com.gdgoc.babi_order.store.repository;

import com.gdgoc.babi_order.store.entity.StoreReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreReviewRepository extends JpaRepository<StoreReview, Long> {

    List<StoreReview> findAllByOrderByCreatedAtDescIdDesc();
}
