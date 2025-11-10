# 테마 감지 및 주식 가격 히스토리 기능

## 개요

이 문서는 주식 거래 시스템에 새로 추가된 **테마 감지** 및 **주식 가격 히스토리** 기능에 대한 설명입니다.

## 주요 기능

### 1. 테마 감지 (Theme Detection)

실시간 주식 시장 데이터를 분석하여 현재 활성화된 투자 테마를 자동으로 감지하고 분석합니다.

#### 감지 가능한 테마 종류

- **반도체/AI**: HBM, AI 칩, 메모리 반도체
- **자동차**: 관세 정책, 수출 관련
- **전력 인프라**: AI 데이터센터 전력 수요
- **AI 냉각/전선**: AI 인프라 확장
- **조선/방산/원전**: 섹터 로테이션

#### 테마 분석 지표

각 테마는 다음 지표로 평가됩니다:

- **강도 (Strength)**: 0-100점 스케일
- **리더 종목**: 가장 강한 움직임을 보이는 대표 종목
- **참여 종목**: 테마에 속한 모든 종목 리스트
- **기간**: 단기(3-7일), 중기(10-20일), 장기(30일+)
- **수익률**: 일간/주간/월간 평균 수익률
- **리스크**: 과열도, 참여 종목 수 등 기반 리스크 평가

### 2. 주식 가격 히스토리

주식의 과거 가격 데이터를 수집하고 저장하여 차트 분석 및 기술적 지표 계산에 활용합니다.

#### 지원 기능

- **일봉/주봉/월봉** 데이터 수집
- **기술적 지표 계산**:
  - SMA (단순 이동평균): 20일, 60일, 120일
  - RSI (상대강도지수): 14일
  - MACD (이동평균 수렴확산): 12/26일
  - EMA (지수 이동평균)

## API 엔드포인트

### 테마 감지 API

#### 1. 테마 감지 실행

```http
GET /api/themes/detect
```

**응답 예시:**
```json
{
  "success": true,
  "market_context": {
    "kospi": 2500.0,
    "kospi_change": 1.5,
    "foreign_net_buy": 500000000000,
    "active_themes_count": 5,
    "rotation_phase": "반도체 주도"
  },
  "themes": [
    {
      "name": "반도체/AI",
      "category": "장기 강세형",
      "strength": 85,
      "duration": {
        "type": "장기",
        "days": "30+일"
      },
      "start_date": "2024-10-01",
      "period_returns": {
        "daily": 3.5,
        "weekly": 12.25,
        "monthly": 52.5
      },
      "leader": {
        "name": "SK하이닉스",
        "code": "000660",
        "price": 130000,
        "change_rate": 5.2,
        "volume_ratio": 200
      },
      "participants": [...],
      "metrics": {
        "participant_count": 10,
        "avg_rise": 6.8,
        "avg_volume_increase": 220,
        "foreign_participation": true
      },
      "trigger": {
        "type": "AI 수요 증가",
        "description": "AI 반도체 수요 증가 및 HBM 공급 확대",
        "news_count": 8
      },
      "risk": {
        "level": "low",
        "warnings": []
      }
    }
  ]
}
```

#### 2. 테마 목록 조회

```http
GET /api/themes?duration=all
```

**쿼리 파라미터:**
- `duration`: `all`, `단기`, `중기`, `장기` (기본값: `all`)

#### 3. 테마 새로고침

```http
POST /api/themes/refresh
```

오늘 날짜의 테마 데이터를 삭제하고 새로 수집합니다.

---

### 주식 가격 히스토리 API

#### 1. 가격 히스토리 조회

```http
GET /api/stock/history/:stockCode?periodType=D&limit=100
```

**쿼리 파라미터:**
- `periodType`: `D` (일봉), `W` (주봉), `M` (월봉) (기본값: `D`)
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)
- `limit`: 최대 조회 개수 (기본값: 100)

**응답 예시:**
```json
{
  "success": true,
  "stockCode": "005930",
  "periodType": "D",
  "count": 50,
  "data": [
    {
      "trade_date": "2024-11-10",
      "open_price": 70000,
      "high_price": 71000,
      "low_price": 69500,
      "close_price": 70500,
      "volume": 15000000
    }
  ]
}
```

#### 2. 가격 히스토리 수집 (단일 종목)

```http
POST /api/stock/history/:stockCode/fetch
```

**요청 본문:**
```json
{
  "periodType": "D",
  "startDate": "20240501",
  "endDate": "20241110"
}
```

#### 3. 가격 히스토리 일괄 수집

```http
POST /api/stock/history/batch-fetch
```

**요청 본문:**
```json
{
  "stockCodes": ["005930", "000660", "035420"],
  "periodType": "D",
  "startDate": "20240501",
  "endDate": "20241110"
}
```

#### 4. 기술적 지표 계산

```http
GET /api/stock/indicators/:stockCode?periodType=D&limit=120
```

**응답 예시:**
```json
{
  "success": true,
  "stockCode": "005930",
  "dataPoints": 120,
  "indicators": {
    "sma20": 69500,
    "sma60": 68000,
    "sma120": 67000,
    "rsi": 62.5,
    "macd": {
      "macd": 850,
      "ema12": 69800,
      "ema26": 68950
    }
  }
}
```

## 데이터베이스 스키마

### 테이블 구조

#### 1. `stock_price_history`
주식 가격 히스토리 저장

```sql
- id: BIGSERIAL PRIMARY KEY
- stock_code: VARCHAR(10)
- period_type: VARCHAR(1) -- 'D', 'W', 'M'
- trade_date: DATE
- open_price: INTEGER
- high_price: INTEGER
- low_price: INTEGER
- close_price: INTEGER
- volume: BIGINT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `theme_history`
테마 감지 결과 저장

```sql
- id: SERIAL PRIMARY KEY
- date: DATE
- theme_name: VARCHAR(100)
- category: VARCHAR(50)
- strength: INT (0-100)
- duration_type: VARCHAR(20)
- leader_stock_name: VARCHAR(50)
- leader_stock_code: VARCHAR(20)
- participant_count: INT
- ...
```

#### 3. `theme_stocks`
테마별 참여 종목

```sql
- id: SERIAL PRIMARY KEY
- theme_history_id: INT (FK)
- stock_name: VARCHAR(50)
- stock_code: VARCHAR(20)
- price: DECIMAL(15,2)
- change_rate: DECIMAL(10,2)
- is_leader: BOOLEAN
```

#### 4. `market_context`
시장 전반 컨텍스트

```sql
- id: SERIAL PRIMARY KEY
- date: DATE
- kospi: DECIMAL(10,2)
- kospi_change: DECIMAL(10,2)
- foreign_net_buy: DECIMAL(15,2)
- active_themes_count: INT
- rotation_phase: VARCHAR(50)
```

## 설치 및 설정

### 1. Supabase 스키마 적용

```bash
# Supabase 프로젝트에 스키마 적용
psql -h <your-supabase-host> -U postgres -d postgres -f backend/supabase_complete_schema.sql
```

또는 Supabase 대시보드의 SQL Editor에서 [supabase_complete_schema.sql](supabase_complete_schema.sql) 내용을 실행하세요.

### 2. 환경 변수 설정

`.env` 파일에 Supabase 연결 정보 추가:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. 서버 재시작

```bash
cd backend
npm start
```

## 사용 예시

### 테마 감지 실행

```javascript
// Frontend에서 테마 감지 요청
const response = await fetch('http://localhost:3000/api/themes/detect');
const result = await response.json();

console.log('감지된 테마:', result.themes);
```

### 주식 가격 히스토리 수집

```javascript
// 삼성전자 최근 6개월 일봉 데이터 수집
const response = await fetch('http://localhost:3000/api/stock/history/005930/fetch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    periodType: 'D',
    startDate: '20240501',
    endDate: '20241110'
  })
});

const result = await response.json();
console.log('수집 완료:', result);
```

### 기술적 지표 조회

```javascript
// 삼성전자 기술적 지표 계산
const response = await fetch('http://localhost:3000/api/stock/indicators/005930?periodType=D&limit=120');
const result = await response.json();

console.log('SMA20:', result.indicators.sma20);
console.log('RSI:', result.indicators.rsi);
console.log('MACD:', result.indicators.macd);
```

## 주요 파일

- [backend/src/services/themeDetection.js](src/services/themeDetection.js) - 테마 감지 서비스
- [backend/src/services/stockPriceHistory.js](src/services/stockPriceHistory.js) - 주식 가격 히스토리 서비스
- [backend/src/server.js](src/server.js) - API 엔드포인트 (433-636라인)
- [backend/supabase_complete_schema.sql](supabase_complete_schema.sql) - 데이터베이스 스키마

## 향후 개선 사항

- [ ] KIS API 실제 연동 (현재 샘플 데이터 사용)
- [ ] 뉴스 API 연동하여 실제 뉴스 카운트
- [ ] 웹소켓을 통한 실시간 테마 알림
- [ ] 테마 백테스팅 기능
- [ ] 사용자 맞춤 테마 알림 설정
- [ ] 테마 포트폴리오 자동 구성

## 문의 및 버그 리포트

이슈가 있거나 기능 제안이 있으시면 GitHub Issues에 등록해주세요.
