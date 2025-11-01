// Mode Selection Page JavaScript
// API Base URL - 상대 경로 사용 (모바일/배포 환경 대응)
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3002/api'
    : '/api';

// 페이지 로드 확인
console.log('Mode selection page loaded');

function selectUserMode() {
    console.log('User mode selected');
    // 게스트 모드 해제
    sessionStorage.removeItem('guestMode');
    sessionStorage.removeItem('guestAccountNumber');
    sessionStorage.removeItem('guestCode');
    // 사용자 모드 선택 - 홈 화면으로 이동
    window.location.href = '/home.html';
}

function selectGuestMode() {
    console.log('Guest mode selected');
    // 게스트 코드 입력 모달 표시
    document.getElementById('guestCodeModal').classList.remove('hidden');
}

// 게스트 코드 모달 닫기
function closeGuestCodeModal() {
    document.getElementById('guestCodeModal').classList.add('hidden');
    document.getElementById('guestCodeInput').value = '';
    document.getElementById('guestCodeError').classList.add('hidden');
}

// 게스트 코드 검증 및 진입
async function verifyGuestCode() {
    const codeInput = document.getElementById('guestCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    const errorDiv = document.getElementById('guestCodeError');
    const verifyBtn = document.getElementById('verifyGuestCodeBtn');

    // 입력 검증
    if (!code) {
        showGuestCodeError('게스트 코드를 입력해주세요.');
        return;
    }

    // 코드 형식 검증 (XXX-XXX-XXX)
    const codePattern = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
    if (!codePattern.test(code)) {
        showGuestCodeError('올바른 형식의 코드를 입력해주세요. (예: ABC-123-XYZ)');
        return;
    }

    try {
        verifyBtn.disabled = true;
        verifyBtn.textContent = '확인 중...';
        errorDiv.classList.add('hidden');

        console.log('게스트 코드 검증 시도:', code);

        // 서버에 코드 검증 요청
        const response = await fetch(`${API_BASE_URL}/guest/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ guestCode: code })
        });

        console.log('서버 응답 상태:', response.status, response.ok);

        const data = await response.json();
        console.log('서버 응답 데이터:', data);

        if (data.success) {
            // 게스트 모드 정보 저장
            sessionStorage.setItem('guestMode', 'true');
            sessionStorage.setItem('guestAccountNumber', data.accountNumber);
            sessionStorage.setItem('guestCode', code);

            console.log('게스트 모드 진입 성공, 홈으로 이동');

            // 홈 페이지로 이동
            window.location.href = '/home.html';
        } else {
            throw new Error(data.message || '유효하지 않은 게스트 코드입니다.');
        }
    } catch (error) {
        console.error('게스트 코드 검증 오류:', error);
        showGuestCodeError(error.message);
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = '확인';
    }
}

// 게스트 코드 에러 표시
function showGuestCodeError(message) {
    const errorDiv = document.getElementById('guestCodeError');
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
}

// 현재 모드 확인 및 UI 업데이트
function checkCurrentMode() {
    const guestMode = sessionStorage.getItem('guestMode');
    const guestCode = sessionStorage.getItem('guestCode');

    const currentModeDisplay = document.getElementById('currentModeDisplay');
    const currentModeText = document.getElementById('currentModeText');
    const modeChangeSection = document.getElementById('modeChangeSection');
    const switchToUserModeBtn = document.getElementById('switchToUserModeBtn');
    const switchToGuestModeBtn = document.getElementById('switchToGuestModeBtn');

    if (guestMode === 'true' && guestCode) {
        // 게스트 모드
        currentModeDisplay.classList.remove('hidden');
        currentModeText.textContent = '게스트 모드';
        currentModeText.classList.remove('text-blue-600');
        currentModeText.classList.add('text-purple-600');

        modeChangeSection.classList.remove('hidden');
        switchToUserModeBtn.classList.remove('hidden');
        switchToGuestModeBtn.classList.add('hidden');
    } else {
        // 사용자 모드 (또는 모드 선택 안됨)
        // 모드가 선택되어 있는지 확인 (다른 페이지에서 왔는지)
        const referrer = document.referrer;
        if (referrer && (referrer.includes('home.html') || referrer.includes('chart.html') ||
                         referrer.includes('history.html') || referrer.includes('account.html'))) {
            currentModeDisplay.classList.remove('hidden');
            currentModeText.textContent = '사용자 모드';
            currentModeText.classList.remove('text-purple-600');
            currentModeText.classList.add('text-blue-600');

            modeChangeSection.classList.remove('hidden');
            switchToUserModeBtn.classList.add('hidden');
            switchToGuestModeBtn.classList.remove('hidden');
        }
    }
}

// 모드 전환 함수
function switchMode(mode) {
    if (mode === 'user') {
        // 사용자 모드로 전환
        sessionStorage.removeItem('guestMode');
        sessionStorage.removeItem('guestAccountNumber');
        sessionStorage.removeItem('guestCode');
        window.location.href = '/home.html';
    } else if (mode === 'guest') {
        // 게스트 모드로 전환 (코드 입력 모달 표시)
        selectGuestMode();
    }
}

// Enter 키로 코드 확인
document.addEventListener('DOMContentLoaded', () => {
    // 현재 모드 확인
    checkCurrentMode();

    // 모드 전환 버튼 이벤트 리스너
    document.getElementById('switchToUserModeBtn')?.addEventListener('click', () => switchMode('user'));
    document.getElementById('switchToGuestModeBtn')?.addEventListener('click', () => switchMode('guest'));

    const codeInput = document.getElementById('guestCodeInput');
    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyGuestCode();
            }
        });

        // 입력 시 자동으로 대시 추가
        codeInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 3 && value.length <= 6) {
                value = value.slice(0, 3) + '-' + value.slice(3);
            } else if (value.length > 6) {
                value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 9);
            }
            e.target.value = value;
        });
    }
});

// 페이지가 유지되는지 확인
window.addEventListener('beforeunload', (e) => {
    console.log('Page is being unloaded');
});
