# 토큰 발급 가이드

## ⚠️ 중요: 토큰은 자동으로 발급되지 않습니다!

계좌 페이지를 사용하려면 **먼저 수동으로 토큰을 발급**받아야 합니다.

---

## 🚀 최초 설정 (한 번만)

### 1단계: 서버 시작
```bash
cd backend
npm start
```

### 2단계: 토큰 발급
새 터미널을 열고 다음 명령어 실행:

```bash
curl -X POST http://localhost:3000/api/token/issue
```

**성공 응답:**
```json
{
  "success": true,
  "message": "토큰 발급 성공",
  "issuedAt": "2025-10-25T...",
  "expiresAt": "2025-10-26T..."
}
```

### 3단계: 계좌 페이지 접속
http://localhost:3000/account.html

---

## 📋 토큰 상태 확인

```bash
curl http://localhost:3000/api/token/status
```

**응답 예시:**
```json
{
  "hasToken": true,
  "isValid": true,
  "remainingHours": 18,
  "expiresAt": "2025-10-26T..."
}
```

---

## ❌ 문제 해결

### Q: 새로고침할 때마다 토큰이 발급됩니다

**A:** 다음 순서로 확인하세요:

1. **최신 코드인지 확인**
   ```bash
   cd "D:\stock trading system"
   git pull origin claude/init-investment-website-011CUTyqhS1kBZk98uTRcqdu
   ```

2. **서버 재시작**
   - 서버를 완전히 종료 (Ctrl+C)
   - 다시 시작: `npm start`

3. **브라우저 캐시 클리어**
   - `Ctrl + Shift + R` (강력 새로고침)
   - 또는 시크릿 모드로 테스트

4. **서버 로그 확인**

   **정상 (토큰 있음):**
   ```
   📞 getAccessToken() 호출됨
   ✅ 캐시된 토큰 재사용 (만료까지 약 18시간 30분 남음)
   ✅ 계좌 잔고 조회 성공
   ```

   **정상 (토큰 없음):**
   ```
   📞 getAccessToken() 호출됨
   ⚠️ 메모리에 토큰 없음, 파일에서 로드 시도...
   ❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.
   ```

   **비정상 (발급됨):**
   ```
   🔄 새로운 토큰 발급 중...
   ✅ 한국투자증권 API 토큰 발급 성공
   ```
   → 이 메시지가 보이면 이전 코드가 실행 중입니다!

---

## 🔄 토큰 갱신 주기

- **유효기간**: 발급 후 23시간 59분
- **갱신 방법**: 다음 날 다시 수동 발급
- **자동 갱신**: ❌ 없음 (수동으로만 발급)

---

## 💡 핵심 원칙

1. ✅ 토큰은 **수동으로만** 발급
2. ✅ 계좌 페이지 접속해도 **자동 발급 안됨**
3. ✅ 토큰 없으면 **안내 메시지만** 표시
4. ✅ 하루 1회 제한 **완벽 준수**

---

## 📞 API 엔드포인트

### GET /api/token/status
토큰 상태 확인

### POST /api/token/issue
토큰 수동 발급 (하루 1회만)

### GET /api/account/balance
계좌 잔고 조회 (토큰 필요)

### GET /api/account/transactions
거래내역 조회 (토큰 필요)
