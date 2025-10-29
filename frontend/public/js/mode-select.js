// Mode Selection Page JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

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

        // 서버에 코드 검증 요청
        const response = await fetch(`${API_BASE_URL}/guest/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ guestCode: code })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 게스트 모드 정보 저장
            sessionStorage.setItem('guestMode', 'true');
            sessionStorage.setItem('guestAccountNumber', data.accountNumber);
            sessionStorage.setItem('guestCode', code);

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

// Enter 키로 코드 확인
document.addEventListener('DOMContentLoaded', () => {
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
