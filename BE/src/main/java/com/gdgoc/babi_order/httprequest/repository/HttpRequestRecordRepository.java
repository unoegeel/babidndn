package com.gdgoc.babi_order.httprequest.repository;

import com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface HttpRequestRecordRepository extends JpaRepository<HttpRequestRecord, Long>, JpaSpecificationExecutor<HttpRequestRecord> {
}
