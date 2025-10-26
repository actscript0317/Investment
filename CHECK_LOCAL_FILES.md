# 로컬 파일 확인 가이드

## ⚠️ 현재 상황
사용자가 "로그에는 안 뜨는데 발급은 되고 있다"고 보고.
GitHub 코드에는 자동 발급이 없으므로, **로컬 파일이 다를 가능성**이 높습니다.

---

## 1단계: 로컬 파일 직접 확인

### Windows PowerShell에서 실행:

```powershell
cd "D:\stock trading system\backend\src\services"

# kisApiService.js 파일 내용 확인
Select-String -Path kisApiService.js -Pattern "getAccessToken" -Context 5,15
```

**중요: 93번째 줄 근처에 다음 코드가 있어야 합니다:**
```javascript
async function getAccessToken() {
    console.log('📞 getAccessToken() 호출됨');

    // 메모리에 토큰이 있고 유효하면 재사용
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        // ...
        return accessToken;
    }

    // 파일에서 로드 시도
    if (loadTokenFromCache()) {
        return accessToken;
    }

    // ❌ 이 줄이 있어야 함!
    throw new Error('저장된 토큰이 없습니다. 먼저 토큰을 발급받아야 합니다.');
}
```

**만약 이렇게 되어 있다면 문제:**
```javascript
async function getAccessToken() {
    // ...

    // ❌ 이런 코드가 있으면 안됨!
    return await issueNewToken();
}
```

---

## 2단계: 정확한 발급 확인 방법

### "발급이 되고 있다"는 것을 어떻게 확인하셨나요?

**A. 한국투자증권 홈페이지에서 확인:**
- https://apiportal.koreainvestment.com 로그인
- "내 API" 또는 "토큰 발급 이력" 확인
- 오늘 날짜에 토큰 발급 기록이 여러 개 있는지 확인

**B. 서버 로그에서 확인:**
서버 콘솔에 다음 메시지가 나타나는지 확인:
```
🔄 새로운 토큰 발급 중...
✅ 한국투자증권 API 토큰 발급 성공
```

**C. 파일 확인:**
```powershell
cd "D:\stock trading system\backend"

# .token-cache.json 파일 확인
if (Test-Path .token-cache.json) {
    Get-Content .token-cache.json | ConvertFrom-Json | Format-List

    # 파일 수정 시간 확인
    (Get-Item .token-cache.json).LastWriteTime
}
```

---

## 3단계: 서버 로그 완전 확인

### 서버를 정확히 모니터링하는 방법:

1. **모든 Node.js 프로세스 종료:**
   ```powershell
   taskkill /F /IM node.exe /T
   tasklist | findstr node.exe  # 출력 없어야 함
   ```

2. **서버 새로 시작 (로그 주시):**
   ```powershell
   cd "D:\stock trading system\backend"
   npm start
   ```

3. **계좌 페이지 접속:**
   - 브라우저: http://localhost:3000/account.html
   - 개발자 도구 (F12) → Console 탭 열기
   - Network 탭 열기

4. **확인할 것들:**

   **서버 콘솔 (PowerShell)에서:**
   ```
   📞 getAccessToken() 호출됨          ← 이 메시지가 나타나야 함
   ⚠️ 메모리에 토큰 없음...           ← 이 메시지가 나타나야 함
   ❌ 저장된 토큰이 없습니다...        ← 이 메시지가 나타나야 함
   ```

   **절대 나타나면 안 되는 메시지:**
   ```
   🔄 새로운 토큰 발급 중...           ← 이게 나타나면 문제!
   ✅ 한국투자증권 API 토큰 발급 성공  ← 이게 나타나면 문제!
   ```

   **브라우저 Network 탭에서:**
   - `/api/token/issue` 요청이 있는지 확인
   - 있다면 어디서 호출되었는지 확인 (Initiator 칼럼)

---

## 4단계: 강제 최신 코드 적용

### 만약 로컬 파일이 다르다면:

```powershell
cd "D:\stock trading system"

# 1. 현재 변경사항 백업 (혹시 모르니)
git stash

# 2. 최신 코드 강제 적용
git fetch origin
git reset --hard origin/claude/init-investment-website-011CUTyqhS1kBZk98uTRcqdu

# 3. 파일 내용 재확인
Select-String -Path backend\src\services\kisApiService.js -Pattern "자동 발급하지 않습니다"
```

**예상 출력:**
```
backend\src\services\kisApiService.js:112:    console.log('❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.');
```

---

## 5단계: 숨겨진 토큰 발급 찾기

### 혹시 모를 숨겨진 API 호출 찾기:

```powershell
cd "D:\stock trading system"

# backend에서 모든 토큰 발급 코드 검색
Select-String -Path backend\src\*.* -Pattern "oauth2/tokenP" -Recurse

# frontend에서 토큰 발급 API 호출 검색
Select-String -Path frontend\public\*.* -Pattern "token/issue" -Recurse
```

**정상 출력 (1개만 있어야 함):**
```
backend\src\services\kisApiService.js:125:        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
```

**2개 이상 나오면 어디선가 중복 발급 중!**

---

## 6단계: 브라우저 디버깅

### 브라우저에서 직접 확인:

1. http://localhost:3000/account.html 접속
2. F12 → Console 탭
3. 다음 명령 입력:

```javascript
// 1. 현재 페이지의 모든 fetch 요청 모니터링
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🌐 Fetch 호출:', args[0]);
    return originalFetch.apply(this, args);
};

// 2. 페이지 새로고침 (Ctrl+R)

// 3. Console에서 어떤 API가 호출되는지 확인
// /api/token/issue 호출이 있는지 확인!
```

---

## 결과 보고

위 단계를 실행한 후 다음 정보를 알려주세요:

### A. 로컬 파일 확인 결과:
- [ ] kisApiService.js에 "자동 발급하지 않습니다" 메시지 있음
- [ ] kisApiService.js에 "throw new Error" 코드 있음
- [ ] 또는: 파일 내용이 다름 (어떻게 다른지 설명)

### B. 발급 확인 방법:
- [ ] 한국투자증권 홈페이지에서 발급 이력 확인
- [ ] 서버 로그에서 "🔄 새로운 토큰 발급 중..." 메시지 확인
- [ ] .token-cache.json 파일 수정 시간 확인
- [ ] 기타: ___________

### C. 서버 로그 결과:
```
(여기에 서버 로그 붙여넣기)
```

### D. 브라우저 Network 탭 결과:
- [ ] /api/token/issue 요청 있음 (문제!)
- [ ] /api/token/issue 요청 없음 (정상)
- [ ] 스크린샷: ___________

---

## 빠른 진단 스크립트

모든 것을 한번에 확인:

```powershell
Write-Host "=== 1. Git 커밋 확인 ===" -ForegroundColor Yellow
git log --oneline -1

Write-Host "`n=== 2. kisApiService.js 자동 발급 코드 확인 ===" -ForegroundColor Yellow
Select-String -Path backend\src\services\kisApiService.js -Pattern "자동 발급하지 않습니다"

Write-Host "`n=== 3. 토큰 발급 API 호출 검색 ===" -ForegroundColor Yellow
Select-String -Path backend\src\*.* -Pattern "oauth2/tokenP" -Recurse | Select-Object -First 5

Write-Host "`n=== 4. .token-cache.json 파일 확인 ===" -ForegroundColor Yellow
if (Test-Path backend\.token-cache.json) {
    $cacheFile = Get-Item backend\.token-cache.json
    Write-Host "파일 존재, 마지막 수정: $($cacheFile.LastWriteTime)"
} else {
    Write-Host "파일 없음" -ForegroundColor Green
}

Write-Host "`n=== 5. Node.js 프로세스 확인 ===" -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "실행 중인 Node.js 프로세스: $($nodeProcesses.Count)개" -ForegroundColor Red
} else {
    Write-Host "실행 중인 Node.js 프로세스 없음" -ForegroundColor Green
}
```

저장 후 실행:
```powershell
cd "D:\stock trading system"
.\CHECK_LOCAL_FILES.ps1
```
