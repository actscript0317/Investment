-- 주식 가격 히스토리 테이블
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

-- 종목코드별 인덱스
CREATE INDEX IF NOT EXISTS idx_stock_price_history_code
    ON stock_price_history(stock_code);

-- 날짜별 인덱스
CREATE INDEX IF NOT EXISTS idx_stock_price_history_date
    ON stock_price_history(trade_date DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_price_history_updated_at
    BEFORE UPDATE ON stock_price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
