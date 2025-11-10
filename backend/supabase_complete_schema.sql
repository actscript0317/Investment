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

-- 7. 주식 가격 레벨 테이블 (손절가/익절가 저장)
CREATE TABLE IF NOT EXISTS stock_price_levels (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(50),
    stop_loss_price DECIMAL(15,2),
    take_profit_price DECIMAL(15,2),
    entry_reason TEXT,
    theme VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_code)
);

-- ==============================================
-- 인덱스 생성
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_theme_history_date ON theme_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_theme_history_name ON theme_history(theme_name);
CREATE INDEX IF NOT EXISTS idx_theme_stocks_code ON theme_stocks(stock_code);
CREATE INDEX IF NOT EXISTS idx_market_context_date ON market_context(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_price_levels_code ON stock_price_levels(stock_code);

-- ==============================================
-- 트리거 함수 (updated_at 자동 업데이트)
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- stock_price_levels
CREATE TRIGGER update_stock_price_levels_updated_at
    BEFORE UPDATE ON stock_price_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
