# Supabase 데이터베이스 설정 가이드

## 1단계: Supabase 프로젝트 접속

1. https://supabase.com 에 로그인
2. 프로젝트 선택: **zmnvuwlbphfzwpcgqsdv**

## 2단계: SQL Editor 열기

1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New Query** 버튼 클릭

## 3단계: 테이블 생성 SQL 실행

아래 SQL을 복사해서 SQL Editor에 붙여넣고 **Run** 버튼을 클릭하세요:

```sql
-- ==============================================
-- 주식 가격 레벨 테이블 (손절가/익절가)
-- ==============================================

CREATE TABLE IF NOT EXISTS stock_price_levels (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(50),
    stop_loss_price DECIMAL(15,2),
    take_profit_price DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_code)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_stock_price_levels_code ON stock_price_levels(stock_code);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_stock_price_levels_updated_at
    BEFORE UPDATE ON stock_price_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 4단계: 테이블 확인

1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. `stock_price_levels` 테이블이 생성되었는지 확인

## 5단계: 서버 재시작

터미널에서 서버를 재시작하세요:

```bash
cd backend
npm start
```

## 6단계: 테스트

1. 브라우저에서 http://localhost:3002/chart.html 접속
2. 종목 검색 (예: 삼성전자)
3. 손절가/익절가 설정
4. 페이지 새로고침 후 설정이 유지되는지 확인
5. 페이지 하단에 카드가 표시되는지 확인

## 추가 기능 (선택사항)

테마 감지 및 주식 가격 히스토리 기능도 사용하려면, 아래 SQL도 실행하세요:

```sql
-- ==============================================
-- 완전한 Supabase 데이터베이스 스키마
-- ==============================================

-- 1. 주식 가격 히스토리 테이블
CREATE TABLE IF NOT EXISTS stock_price_history (
    id BIGSERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,
    period_type VARCHAR(1) NOT NULL, -- D:일봉, W:주봉, M:월봉
    trade_date DATE NOT NULL,
    open_price INTEGER NOT NULL,
    high_price INTEGER NOT NULL,
    low_price INTEGER NOT NULL,
    close_price INTEGER NOT NULL,
    volume BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 복합 유니크 제약조건 (중복 방지)
    CONSTRAINT unique_stock_price UNIQUE (stock_code, period_type, trade_date)
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_stock_price_history_code_period_date
    ON stock_price_history(stock_code, period_type, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_history_code
    ON stock_price_history(stock_code);

CREATE INDEX IF NOT EXISTS idx_stock_price_history_date
    ON stock_price_history(trade_date DESC);

-- 2. 테마 이력 테이블
CREATE TABLE IF NOT EXISTS theme_history (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    theme_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    strength INT CHECK (strength >= 0 AND strength <= 100),
    duration_type VARCHAR(20),
    duration_days VARCHAR(20),
    duration_actual INT,
    start_date DATE,
    leader_stock_name VARCHAR(50),
    leader_stock_code VARCHAR(20),
    leader_price DECIMAL(15,2),
    leader_change_rate DECIMAL(10,2),
    leader_volume_ratio DECIMAL(10,2),
    daily_return DECIMAL(10,2),
    weekly_return DECIMAL(10,2),
    monthly_return DECIMAL(10,2),
    avg_return DECIMAL(10,2),
    max_return DECIMAL(10,2),
    participant_count INT,
    trigger_type VARCHAR(50),
    trigger_description TEXT,
    risk_level VARCHAR(20),
    risk_warnings TEXT[],
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, theme_name)
);

-- 3. 테마 참여 종목 테이블
CREATE TABLE IF NOT EXISTS theme_stocks (
    id SERIAL PRIMARY KEY,
    theme_history_id INT REFERENCES theme_history(id) ON DELETE CASCADE,
    stock_name VARCHAR(50) NOT NULL,
    stock_code VARCHAR(20) NOT NULL,
    price DECIMAL(15,2),
    change_rate DECIMAL(10,2),
    volume_ratio DECIMAL(10,2),
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 시장 컨텍스트 테이블 (일별 시장 개요)
CREATE TABLE IF NOT EXISTS market_context (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    kospi DECIMAL(10,2),
    kospi_change DECIMAL(10,2),
    foreign_net_buy DECIMAL(15,2),
    individual_net_buy DECIMAL(15,2),
    active_themes_count INT,
    rotation_phase VARCHAR(50),
    dominant_sector VARCHAR(50),
    risk_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 뉴스 키워드 테이블
CREATE TABLE IF NOT EXISTS theme_news (
    id SERIAL PRIMARY KEY,
    theme_history_id INT REFERENCES theme_history(id) ON DELETE CASCADE,
    keyword VARCHAR(100),
    news_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 테마 감지 설정 테이블 (테마 감지 조건 저장)
CREATE TABLE IF NOT EXISTS theme_detection_config (
    id SERIAL PRIMARY KEY,
    theme_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    detection_rules JSONB,
    sub_themes JSONB,
    value_chain JSONB,
    keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 인덱스 생성
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_theme_history_date ON theme_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_theme_history_name ON theme_history(theme_name);
CREATE INDEX IF NOT EXISTS idx_theme_stocks_code ON theme_stocks(stock_code);
CREATE INDEX IF NOT EXISTS idx_market_context_date ON market_context(date DESC);

-- ==============================================
-- 트리거 적용
-- ==============================================

-- stock_price_history
CREATE TRIGGER update_stock_price_history_updated_at
    BEFORE UPDATE ON stock_price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- theme_history
CREATE TRIGGER update_theme_history_updated_at
    BEFORE UPDATE ON theme_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- market_context
CREATE TRIGGER update_market_context_updated_at
    BEFORE UPDATE ON market_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- theme_detection_config
CREATE TRIGGER update_theme_detection_config_updated_at
    BEFORE UPDATE ON theme_detection_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 문제 해결

### 에러: "relation already exists"
- 이미 테이블이 존재합니다. 무시하고 계속 진행하세요.

### 에러: "permission denied"
- Service Role Key를 사용하고 있는지 확인하세요.
- `.env` 파일의 `SUPABASE_SERVICE_ROLE_KEY`가 정확한지 확인하세요.

### 503 Service Unavailable
- `.env` 파일에 `SUPABASE_KEY`가 설정되어 있는지 확인
- 서버를 재시작했는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

## 완료!

모든 설정이 완료되었습니다. 이제 손절가/익절가를 설정하면 데이터베이스에 저장되고, 페이지를 새로고침해도 유지됩니다.
