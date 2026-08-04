-- 개발용 DB 생성 (운영 DB babi_order 와 분리)
-- EC2 MySQL 또는 로컬 MySQL에서 root(또는 권한 있는 계정)로 실행하세요.

CREATE DATABASE IF NOT EXISTS babi_order_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 앱 계정(babi)에 개발 DB 권한 부여 (계정명이 다르면 수정)
GRANT ALL PRIVILEGES ON babi_order_dev.* TO 'babi'@'%';
FLUSH PRIVILEGES;
