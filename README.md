# 주식 트레이딩 시스템

Node.js, Tailwind CSS, Supabase, 한국투자증권 API를 사용한 실시간 주식 트레이딩 웹사이트

## 기능

- ✅ 홈화면
- ✅ 회원가입 (Supabase Auth)
- ✅ 로그인
- 🚧 실시간 주식 시세 (한국투자증권 API)
- 🚧 포트폴리오 관리
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
│   │   │   └── login.js            # 로그인 로직
│   │   ├── index.html          # 홈화면
│   │   ├── signup.html         # 회원가입 페이지
│   │   └── login.html          # 로그인 페이지
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                     # 백엔드
│   ├── src/
│   │   └── server.js           # Express 서버
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

#### Supabase 설정
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. `backend/.env.example`을 복사하여 `backend/.env` 파일 생성
3. Supabase URL과 Anon Key를 설정
4. `frontend/public/js/supabase-client.js`에서 Supabase URL과 Key 업데이트

#### 환경 변수 예시 (`backend/.env`)
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
```

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

## API 연동 계획

### 한국투자증권 API
- 실시간 주식 시세 조회
- 계좌 정보 조회
- 주문 기능

### Supabase
- 사용자 인증 (회원가입/로그인)
- 사용자 데이터 저장
- 포트폴리오 정보 관리

## 다음 단계

1. ✅ 프론트엔드/백엔드 폴더 분리
2. 한국투자증권 API 연동
3. 실시간 주식 시세 표시 기능
4. 대시보드 페이지 구현
5. 포트폴리오 관리 기능
6. 알림 서비스 구현

## 기술 스택

- **Frontend**: HTML, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Database & Auth**: Supabase
- **API**: 한국투자증권 Open API
