# 토큰 자동 발급 문제 수정 완료

## 📋 수정 내역 요약

### 변경된 파일
- `backend/src/services/kisApiService.js` - 토큰 관리 로직 수정
- `backend/TOKEN_GUIDE.md` - 토큰 수동 발급 가이드 추가
- `VERIFY_FIX.md` - 문제 해결 확인 가이드 추가

### Git 커밋
- `beb1dc1` - feat: 토큰 자동 발급 제거 - 수동 발급으로 변경
- `d599184` - docs: 토큰 자동 발급 문제 해결 확인 가이드 추가

---

## 🔧 핵심 코드 변경

### Before (자동 발급 O):
```javascript
async function getAccessToken() {
    // 메모리에 토큰이 있고 유효하면 재사용
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    // 파일에서 로드 시도
    if (loadTokenFromCache()) {
        return accessToken;
    }

    // ❌ 자동으로 새 토큰 발급
    return await issueNewToken();  // 👈 문제!
}
```

### After (자동 발급 X):
```javascript
async function getAccessToken() {
    console.log('📞 getAccessToken() 호출됨');

    // 메모리에 토큰이 있고 유효하면 재사용
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log('✅ 캐시된 토큰 재사용...');
        return accessToken;
    }

    console.log('⚠️ 메모리에 토큰 없음, 파일에서 로드 시도...');

    // 파일에서 로드 시도
    if (loadTokenFromCache()) {
        console.log('✅ 파일에서 토큰 로드 성공');
        return accessToken;
    }

    // ✅ 에러 발생 - 자동 발급 안함
    console.log('❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.');
    throw new Error('저장된 토큰이 없습니다. 먼저 토큰을 발급받아야 합니다.');
}
```

---

## ✅ 수정 후 동작 방식

### 1. 토큰이 없을 때
```
사용자가 계좌 페이지 접속
    ↓
getAccessToken() 호출
    ↓
메모리에 토큰 없음
    ↓
파일에서 로드 시도
    ↓
파일에도 토큰 없음
    ↓
❌ 에러 발생 (자동 발급 안함!)
    ↓
계좌 페이지에 안내 메시지 표시
"⚠️ API 토큰이 없습니다!"
```

### 2. 토큰 수동 발급
```
사용자가 터미널에서 명령 실행:
curl -X POST http://localhost:3000/api/token/issue
    ↓
issueNewToken() 호출
    ↓
🔄 새로운 토큰 발급 중...
    ↓
✅ 토큰 발급 성공
    ↓
파일(.token-cache.json)에 저장
```

### 3. 토큰이 있을 때 (정상 동작)
```
사용자가 계좌 페이지 접속
    ↓
getAccessToken() 호출
    ↓
메모리에 토큰 있음?
  └─ Yes → ✅ 캐시된 토큰 재사용 (자동 발급 안함!)
  └─ No → 파일에서 로드 → ✅ 로드 성공 (자동 발급 안함!)
    ↓
계좌 정보 조회 성공
```

---

## 🔍 검증 방법

### 1. 코드 검증
```bash
# 토큰 발급 코드가 딱 1곳에만 있는지 확인
grep -rn "oauth2/tokenP" backend/src/

# 예상 출력 (1개만 있어야 함):
backend/src/services/kisApiService.js:125:        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
```

### 2. 로그 검증

**토큰 없이 계좌 페이지 접속 시:**
```
📞 getAccessToken() 호출됨
⚠️ 메모리에 토큰 없음, 파일에서 로드 시도...
❌ 저장된 토큰이 없습니다. 자동 발급하지 않습니다.
❌ 계좌 잔고 조회 실패: 저장된 토큰이 없습니다.
```
👆 "🔄 새로운 토큰 발급 중..." 메시지가 **절대 안 나타남**!

**토큰 수동 발급:**
```
🔄 토큰 수동 발급 요청...
🔄 새로운 토큰 발급 중...
✅ 한국투자증권 API 토큰 발급 성공
```

**토큰 있을 때 계좌 페이지 접속:**
```
📞 getAccessToken() 호출됨
✅ 캐시된 토큰 재사용 (만료까지 약 23시간 59분 남음)
✅ 계좌 잔고 조회 성공
```

---

## 📂 파일 구조

```
Investment/
├── backend/
│   ├── .token-cache.json          # 토큰 캐시 파일 (자동 생성)
│   ├── TOKEN_GUIDE.md             # 토큰 발급 가이드 (NEW!)
│   └── src/
│       ├── services/
│       │   ├── kisApiService.js   # 토큰 관리 (수정됨!)
│       │   └── kisApi.js          # API 클라이언트
│       └── server.js              # 토큰 발급 엔드포인트
├── VERIFY_FIX.md                  # 문제 해결 확인 가이드 (NEW!)
└── FIX_SUMMARY.md                 # 이 파일
```

---

## 🎯 사용자 가이드

### 최초 사용 시 (토큰 없음)

1. **서버 시작:**
   ```bash
   cd backend
   npm start
   ```

2. **토큰 발급 (수동):**
   ```bash
   # 새 터미널에서:
   curl -X POST http://localhost:3000/api/token/issue
   ```

3. **계좌 페이지 접속:**
   ```
   http://localhost:3000/account.html
   ```

### 일상적인 사용 (토큰 있음)

1. 서버 시작
2. 계좌 페이지 접속 → **자동으로 캐시된 토큰 사용** (새로 발급 안함!)
3. 다음 날 토큰 만료 후 → 수동으로 다시 발급

---

## ⚠️ 문제가 지속되는 경우

사용자가 여전히 "토큰이 자동으로 발급된다"고 보고할 경우:

### 원인 분석:
1. **최신 코드가 아님** - git pull 실행 안함
2. **서버 재시작 안함** - 이전 코드가 메모리에 남아있음
3. **브라우저 캐시** - 오래된 JavaScript 파일 사용 중
4. **여러 서버 실행 중** - 이전 버전 서버가 백그라운드에서 실행 중

### 해결책:
`VERIFY_FIX.md` 파일의 단계별 가이드를 따라 실행:
1. 최신 코드 pull
2. 서버 완전 종료 (`taskkill /F /IM node.exe /T`)
3. 브라우저 캐시 삭제 (`Ctrl + Shift + R`)
4. 서버 재시작
5. 로그 확인

---

## 📊 변경 사항 통계

- 수정된 파일: 1개 (`kisApiService.js`)
- 추가된 문서: 2개 (`TOKEN_GUIDE.md`, `VERIFY_FIX.md`)
- 삭제된 코드: 자동 발급 로직 (약 5줄)
- 추가된 코드: 에러 처리 + 로깅 (약 10줄)
- 커밋 수: 2개

---

## 🔐 보안 개선

### Before:
- 계좌 페이지 접속 시 무조건 토큰 발급 시도
- 하루 발급 제한 우회 가능성

### After:
- 토큰 발급은 명시적 API 호출로만 가능
- 하루 1회 제한 완벽 준수
- 저장된 토큰 재사용으로 API 호출 최소화

---

## ✨ 최종 체크리스트

- [x] `getAccessToken()` 에서 자동 발급 로직 제거
- [x] `issueNewToken()` 분리 (수동 발급 전용)
- [x] 상세한 로그 메시지 추가
- [x] 토큰 없을 때 명확한 에러 메시지
- [x] 파일 캐싱 유지 (재시작 후에도 토큰 유지)
- [x] 하루 1회 발급 제한 유지
- [x] 프론트엔드 에러 처리 (안내 메시지 표시)
- [x] 사용자 가이드 문서 작성
- [x] 문제 해결 가이드 작성
- [x] GitHub에 푸시 완료

---

## 💬 사용자 피드백 요청 사항

다음 정보를 확인해주세요:

1. **코드 버전 확인:**
   ```bash
   git log --oneline -1
   ```
   출력: `d599184 docs: 토큰 자동 발급 문제 해결 확인 가이드 추가` 또는 이후 버전

2. **서버 로그 확인:**
   - 계좌 페이지 접속 시 "📞 getAccessToken() 호출됨" 메시지 확인
   - "🔄 새로운 토큰 발급 중..." 메시지가 **나타나지 않는지** 확인

3. **동작 확인:**
   - [ ] 토큰 없이 계좌 페이지 접속 시 안내 메시지 표시됨
   - [ ] 토큰 수동 발급 성공
   - [ ] 계좌 페이지 새로고침해도 토큰 재발급 안됨

---

**작성일:** 2025-10-26
**작성자:** Claude Code
**수정 완료 커밋:** beb1dc1, d599184
