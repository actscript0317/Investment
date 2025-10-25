# 주식 트레이딩 시스템

Node.js, Tailwind CSS, Supabase, 한국투자증권 API를 사용한 실시간 주식 트레이딩 웹사이트

## 기능

- ✅ 홈화면
- ✅ 회원가입 (Supabase Auth)
- ✅ 로그인
- ✅ 실시간 주식 시세 (한국투자증권 API)
- ✅ 계좌 잔고 조회
- ✅ 거래내역 조회
- ✅ 보유 종목 현황
- 🚧 주식 매매 기능
- 🚧 알림 서비스

## 프로젝트 구조

```
stock-trading-system/
├── frontend/                    # 프론트엔드
│   ├── public/
│   │   ├── css/
│   │   │   ├── input.css       # Tailwind 입력 파일
│   │   │   └── output.css      # Tailwind 출력 파일 (빌드됨)
│   │   ├── js/
│   │   │   ├── supabase-client.js  # Supabase 클라이언트
│   │   │   ├── signup.js           # 회원가입 로직
│   │   │   ├── login.js            # 로그인 로직
│   │   │   ├── stock.js            # 주식 조회 로직
│   │   │   └── account.js          # 계좌 관리 로직
│   │   ├── index.html          # 홈화면
│   │   ├── signup.html         # 회원가입 페이지
│   │   ├── login.html          # 로그인 페이지
│   │   ├── stock.html          # 주식 조회 페이지
│   │   └── account.html        # 계좌 페이지
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                     # 백엔드
│   ├── src/
│   │   ├── server.js           # Express 서버
│   │   └── services/
│   │       ├── kisApi.js       # 한국투자증권 API 클라이언트
│   │       └── kisApiService.js # 한국투자증권 API 서비스
│   ├── package.json
│   └── .env.example            # 환경 변수 예시
│
├── package.json                 # 루트 패키지 설정
├── .gitignore
└── README.md
```

## 설치 및 실행

### 1. 전체 패키지 설치
```bash
npm run install:all
```

또는 개별 설치:
```bash
# 백엔드 패키지 설치
cd backend
npm install

# 프론트엔드 패키지 설치
cd ../frontend
npm install
```

### 2. 환경 변수 설정

#### 한국투자증권 API 설정
1. [한국투자증권 오픈API 포털](https://apiportal.koreainvestment.com)에서 회원가입 및 앱 등록
2. 앱 키(App Key)와 앱 시크릿(App Secret) 발급
3. 모의투자 계좌 번호 확인

#### Supabase 설정 (선택사항)
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Supabase URL과 Service Role Key 확인

#### 환경 변수 설정
1. `backend/.env.example`을 복사하여 `backend/.env` 파일 생성
```bash
cd backend
cp .env.example .env
```

2. `.env` 파일 수정
```env
# 한국투자증권 API 설정
KIS_APP_KEY=발급받은_앱_키
KIS_APP_SECRET=발급받은_앱_시크릿
KIS_BASE_URL=https://openapivts.koreainvestment.com:29443  # 모의투자
KIS_ACCOUNT_NUMBER=12345678-01  # 계좌번호 (앞8자리-뒤2자리)

# Supabase 설정 (선택사항)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key

# 서버 포트
PORT=3000
```

**중요:** 실전투자 사용 시 `KIS_BASE_URL`을 `https://openapi.koreainvestment.com:9443`으로 변경하세요.

### 3. Tailwind CSS 빌드
```bash
npm run build:css
```

또는 watch 모드로 실행 (개발 중):
```bash
npm run watch:css
```

### 4. 서버 실행
```bash
npm start
```

개발 모드 (nodemon 사용):
```bash
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 개발 가이드

### 백엔드 개발
- 위치: `backend/src/`
- 서버 파일: `server.js`
- API 라우트 추가: `server.js`에서 `/api/*` 경로로 추가

### 프론트엔드 개발
- 위치: `frontend/public/`
- HTML 파일: `public/*.html`
- JavaScript: `public/js/*.js`
- CSS: Tailwind CSS 사용 (`public/css/`)

### Tailwind CSS 수정
1. `frontend/public/css/input.css` 파일 수정
2. `npm run build:css` 실행하여 CSS 빌드
3. 개발 중에는 `npm run watch:css` 실행으로 자동 빌드

## API 연동

### 한국투자증권 API
- ✅ 실시간 주식 시세 조회
- ✅ 계좌 잔고 조회
- ✅ 거래내역 조회
- ✅ 매수가능금액 조회
- 🚧 주식 매수/매도 주문
- 🚧 주문 취소

### Supabase
- ✅ 사용자 인증 (회원가입/로그인)
- ✅ 사용자 데이터 저장
- 🚧 포트폴리오 정보 관리

## 주요 페이지

### 1. 홈 (`/`)
- 서비스 소개 및 주요 기능 안내

### 2. 주식 조회 (`/stock.html`)
- 실시간 주식 시세 조회
- 종목 검색
- 차트 표시 (일/주/월/년봉)

### 3. 내 계좌 (`/account.html`)
- 계좌 요약 정보
  - 총 평가금액
  - 평가손익
  - 수익률
- 보유 종목 현황
  - 종목명, 보유수량, 평균단가, 현재가
  - 평가금액, 평가손익, 수익률
- 거래내역 조회
  - 일자, 종목명, 구분(매수/매도)
  - 수량, 체결가, 체결금액

## 다음 단계

1. ✅ 프론트엔드/백엔드 폴더 분리
2. ✅ 한국투자증권 API 연동
3. ✅ 실시간 주식 시세 표시 기능
4. ✅ 계좌 페이지 구현
5. 🚧 주식 매매 기능
6. 🚧 대시보드 페이지 구현
7. 🚧 알림 서비스 구현

## 기술 스택

- **Frontend**: HTML, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Database & Auth**: Supabase
- **API**: 한국투자증권 Open API
