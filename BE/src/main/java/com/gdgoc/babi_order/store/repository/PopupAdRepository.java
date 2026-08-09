package com.gdgoc.babi_order.store.repository;

import com.gdgoc.babi_order.store.entity.PopupAd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PopupAdRepository extends JpaRepository<PopupAd, Long> {

    List<PopupAd> findAllByOrderByStartAtDescIdDesc();

    @Query("""
            select p from PopupAd p
            where p.enabled = true
              and p.startAt <= :now
              and p.endAt >= :now
            order by p.startAt desc, p.id desc
            """)
    List<PopupAd> findActiveAt(@Param("now") LocalDateTime now);
}
