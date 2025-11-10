-- 테마 이력 테이블
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

-- 테마 참여 종목 테이블
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

-- 시장 컨텍스트 테이블 (일별 시장 개요)
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

-- 뉴스 키워드 테이블
CREATE TABLE IF NOT EXISTS theme_news (
    id SERIAL PRIMARY KEY,
    theme_history_id INT REFERENCES theme_history(id) ON DELETE CASCADE,
    keyword VARCHAR(100),
    news_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 테마 감지 설정 테이블 (테마 감지 조건 저장)
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_theme_history_date ON theme_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_theme_history_name ON theme_history(theme_name);
CREATE INDEX IF NOT EXISTS idx_theme_stocks_code ON theme_stocks(stock_code);
CREATE INDEX IF NOT EXISTS idx_market_context_date ON market_context(date DESC);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_theme_history_updated_at BEFORE UPDATE ON theme_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_context_updated_at BEFORE UPDATE ON market_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_detection_config_updated_at BEFORE UPDATE ON theme_detection_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 주식 가격 레벨 테이블 (손절가/익절가 저장)
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

-- 업데이트 트리거
CREATE TRIGGER update_stock_price_levels_updated_at BEFORE UPDATE ON stock_price_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
