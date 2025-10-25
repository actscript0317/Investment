# ⚠️ .env 파일 설정이 필요합니다!

계좌 페이지를 사용하려면 `.env` 파일을 설정해야 합니다.

## 🚀 빠른 설정

### 1단계: .env 파일 생성
```bash
cd backend
copy .env.example .env
```

### 2단계: .env 파일 수정
`backend/.env` 파일을 열어서 아래 내용을 입력하세요:

```env
# 한국투자증권 API 설정
KIS_APP_KEY=여기에_발급받은_앱_키_입력
KIS_APP_SECRET=여기에_발급받은_시크릿_입력
KIS_BASE_URL=https://openapivts.koreainvestment.com:29443
KIS_ACCOUNT_NUMBER=12345678-01

# 서버 포트
PORT=3000
```

### 3단계: API 키 발급 받기

1. https://apiportal.koreainvestment.com/ 접속
2. 회원가입 후 로그인
3. 앱 등록 → 앱 키(App Key)와 앱 시크릿(App Secret) 받기
4. 모의투자 계좌 신청 → 계좌번호 받기

### 4단계: 서버 재시작
```bash
npm start
```

---

## 💡 토큰 관리 방식

이제 **토큰이 하루에 한 번만 발급**됩니다:
- ✅ 첫 API 호출 시 토큰 발급
- ✅ 토큰을 파일에 저장 (backend/.token-cache.json)
- ✅ 같은 날짜면 저장된 토큰 재사용
- ✅ 다음 날 자동으로 새 토큰 발급

---

## ❌ 문제 해결

### Q: "계좌번호가 설정되지 않았습니다" 에러
→ `backend/.env` 파일에 `KIS_ACCOUNT_NUMBER` 설정

### Q: "토큰 발급 실패" 에러
→ `KIS_APP_KEY`와 `KIS_APP_SECRET` 확인

### Q: "403 에러"
→ API 키가 올바른지 확인, 모의투자 계좌인지 확인
