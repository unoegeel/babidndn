-- 기본 토핑: '스팸' → '햄구이' 명칭 변경 + 표시 순서 재배치
-- 과거 주문/나만의 메뉴 snapshot(option_name_snapshot 등)은 변경하지 않습니다.
-- 운영 DB에 한 번 실행합니다. 이미 '햄구이'가 있는 메뉴의 '스팸'은 건너뜁니다.
-- menu_id + display_order unique 제약은 없습니다. 충돌을 피하기 위해 임시 offset 후 확정합니다.

SET NAMES utf8mb4;

-- 1) 라이브 메뉴 옵션 이름 변경 (같은 메뉴에 햄구이가 없을 때만)
UPDATE menu_options mo
SET name = '햄구이', updated_at = NOW(6)
WHERE mo.group_type = 'TOPPING_ADD'
  AND mo.name = '스팸'
  AND mo.menu_id NOT IN (
      SELECT menu_id FROM (
          SELECT menu_id
          FROM menu_options
          WHERE group_type = 'TOPPING_ADD' AND name = '햄구이'
      ) existing_ham
  );

-- 2) 대상 토핑 display_order를 임시 구간으로 이동
UPDATE menu_options
SET display_order = display_order + 100, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD'
  AND name IN (
      '계란후라이',
      '햄구이',
      '밥 추가',
      '삼겹소금 추가',
      '삼겹양념 추가',
      '참치마요 추가',
      '모짜렐라치즈',
      '체다치즈'
  );

-- 3) 최종 순서
UPDATE menu_options SET display_order = 1, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '계란후라이';

UPDATE menu_options SET display_order = 2, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '햄구이';

UPDATE menu_options SET display_order = 3, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '밥 추가';

UPDATE menu_options SET display_order = 4, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '삼겹소금 추가';

UPDATE menu_options SET display_order = 5, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '삼겹양념 추가';

UPDATE menu_options SET display_order = 6, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '참치마요 추가';

UPDATE menu_options SET display_order = 7, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '모짜렐라치즈';

UPDATE menu_options SET display_order = 8, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '체다치즈';
