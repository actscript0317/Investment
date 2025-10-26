# 토큰 자동 발급 문제 해결 확인 가이드

## ⚠️ 현재 상황
계좌 페이지 새로고침 시 토큰이 계속 자동 발급되는 문제가 보고되었습니다.
코드 수정이 완료되었으므로, 아래 단계를 **순서대로** 따라하여 문제가 해결되었는지 확인해주세요.

---

## 1단계: 최신 코드 확인

### Windows PowerShell에서 실행:

```powershell
# 프로젝트 폴더로 이동
cd "D:\stock trading system"

# 최신 코드 가져오기
git fetch origin
git pull origin claude/init-investment-website-011CUTyqhS1kBZk98uTRcqdu

# 현재 커밋 확인 (beb1dc1 이상이어야 함)
git log --oneline -1
```

**예상 출력:**
```
beb1dc1 feat: 토큰 자동 발급 제거 - 수동 발급으로 변경
```

만약 다른 커밋이 보이면, 다시 `git pull` 실행!

---

## 2단계: 코드 수정 확인

### 중요한 파일 확인:

```powershell
# kisApiService.js 파일에서 자동 발급 제거 확인
findstr /C:"자동 발급하지 않습니다" backend\src\services\kisApiService.js
```

**예상 출력:**
```
    console.log('❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.');
```

이 메시지가 안 보이면 최신 코드가 아닙니다!

---

## 3단계: 서버 완전 재시작

### 서버를 완전히 종료한 후 재시작:

```powershell
# 1. 현재 실행 중인 모든 Node.js 프로세스 종료
# Ctrl+C로 서버 종료 후, 혹시 모를 백그라운드 프로세스 종료:
taskkill /F /IM node.exe /T

# 2. backend 폴더로 이동
cd backend

# 3. 서버 재시작
npm start
```

**서버가 시작되면 아래 메시지 확인:**
```
✅ 토큰 관리 시스템 초기화 완료
서버가 http://localhost:3000 에서 실행 중입니다.
```

---

## 4단계: 브라우저 캐시 완전 삭제

### 방법 1: 강력 새로고침
- 브라우저에서 `Ctrl + Shift + R` (Windows)
- 또는 개발자 도구 열고 (F12) → 새로고침 버튼 우클릭 → "캐시 비우기 및 강력 새로고침"

### 방법 2: 시크릿 모드 (권장)
- `Ctrl + Shift + N` (Chrome)
- `Ctrl + Shift + P` (Firefox)
- 새 창에서 http://localhost:3000/account.html 접속

---

## 5단계: 토큰 상태 초기화

### 기존 토큰 삭제 (있다면):

```powershell
# backend 폴더에서 실행
cd backend
del .token-cache.json
```

---

## 6단계: 테스트 실행

### 1) 서버 로그 창을 주시하면서 계좌 페이지 접속:

```
http://localhost:3000/account.html
```

### 2) 서버 콘솔에서 다음 메시지를 확인:

**정상 동작 (수정됨):**
```
📞 getAccessToken() 호출됨
⚠️ 메모리에 토큰 없음, 파일에서 로드 시도...
❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.
❌ 계좌 잔고 조회 실패: 저장된 토큰이 없습니다. 먼저 토큰을 발급받아야 합니다.
```

**비정상 동작 (수정 안됨):**
```
🔄 새로운 토큰 발급 중...
✅ 한국투자증권 API 토큰 발급 성공
```

👆 이 메시지가 보이면 여전히 문제가 있습니다!

---

## 7단계: 토큰 수동 발급

### 새 터미널에서 토큰 발급:

```powershell
curl -X POST http://localhost:3000/api/token/issue
```

**성공 응답:**
```json
{
  "success": true,
  "message": "토큰 발급 성공",
  "issuedAt": "2025-10-26T...",
  "expiresAt": "2025-10-27T..."
}
```

---

## 8단계: 최종 확인

### 토큰 발급 후 계좌 페이지 새로고침:

1. 계좌 페이지를 여러 번 새로고침 (F5)
2. 서버 로그 확인:

**정상 동작:**
```
📞 getAccessToken() 호출됨
✅ 캐시된 토큰 재사용 (만료까지 약 23시간 59분 남음)
✅ 계좌 잔고 조회 성공
```

3. **"새로운 토큰 발급" 메시지가 절대 나타나지 않아야 합니다!**

---

## 문제 해결

### 여전히 자동 발급된다면:

1. **커밋 버전 재확인:**
   ```powershell
   git log --oneline -5
   ```
   `beb1dc1 feat: 토큰 자동 발급 제거` 커밋이 있어야 함

2. **파일 내용 직접 확인:**
   ```powershell
   type backend\src\services\kisApiService.js | findstr /N "getAccessToken"
   ```
   92번째 줄에 "자동 발급 안함" 주석이 있어야 함

3. **서버 프로세스 완전 종료 확인:**
   ```powershell
   tasklist | findstr node.exe
   ```
   출력이 없어야 함 (모든 node.exe 종료됨)

4. **로그 상세 출력:**
   서버 시작 시 `-v` 옵션 추가:
   ```powershell
   NODE_ENV=development npm start
   ```

---

## 추가 진단

### 정확한 문제 위치 파악:

```powershell
# 전체 코드베이스에서 "새로운 토큰 발급" 검색
findstr /S /C:"새로운 토큰 발급" backend\src\*.*
```

**예상 출력 (1개만 있어야 함):**
```
backend\src\services\kisApiService.js:        console.log('🔄 새로운 토큰 발급 중...');
```

2개 이상 나오면 여러 곳에서 발급 중!

---

## 성공 체크리스트

- [ ] 최신 커밋(beb1dc1) 확인됨
- [ ] kisApiService.js에 "자동 발급하지 않습니다" 메시지 있음
- [ ] 서버 완전 재시작됨
- [ ] 브라우저 캐시 삭제됨
- [ ] 계좌 페이지 접속 시 "❌ 저장된 토큰이 없습니다" 로그 확인
- [ ] 토큰 수동 발급 성공
- [ ] 새로고침 시 "✅ 캐시된 토큰 재사용" 로그 확인
- [ ] "🔄 새로운 토큰 발급 중..." 메시지 **절대 안 나타남**

---

## 결과 보고

위 단계를 모두 완료한 후:

1. **여전히 문제가 있다면:**
   - 6단계에서 나온 **정확한 서버 로그** 전체를 복사해서 보내주세요
   - `git log --oneline -5` 출력도 함께 보내주세요

2. **문제가 해결되었다면:**
   - "토큰 자동 발급 문제 해결됨" 메시지만 보내주세요!

---

## 빠른 실행 스크립트

모든 단계를 자동으로 실행하려면:

```powershell
cd "D:\stock trading system"
git pull origin claude/init-investment-website-011CUTyqhS1kBZk98uTRcqdu
taskkill /F /IM node.exe /T 2>$null
cd backend
if (Test-Path .token-cache.json) { Remove-Item .token-cache.json }
npm start
```

위 스크립트 실행 후 새 터미널에서:

```powershell
# 5초 대기 후 토큰 발급
Start-Sleep -Seconds 5
curl -X POST http://localhost:3000/api/token/issue
```
