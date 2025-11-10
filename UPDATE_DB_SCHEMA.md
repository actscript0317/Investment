# 데이터베이스 스키마 업데이트

## 진입근거/테마 필드 추가

기존 `stock_price_levels` 테이블에 진입근거와 테마 필드를 추가합니다.

### Supabase SQL Editor에서 실행

1. https://supabase.com 접속
2. 프로젝트: `zmnvuwlbphfzwpcgqsdv` 선택
3. **SQL Editor** 메뉴 클릭
4. 아래 SQL 실행:

```sql
-- 진입근거 필드 추가
ALTER TABLE stock_price_levels
ADD COLUMN IF NOT EXISTS entry_reason TEXT;

-- 테마 필드 추가
ALTER TABLE stock_price_levels
ADD COLUMN IF NOT EXISTS theme VARCHAR(100);
```

### 확인

**Table Editor**에서 `stock_price_levels` 테이블을 확인하여 다음 필드가 추가되었는지 확인:
- `entry_reason` (TEXT)
- `theme` (VARCHAR 100)

## 완료!

이제 손절가/익절가 카드에서 진입근거와 테마를 입력하고 저장할 수 있습니다.
