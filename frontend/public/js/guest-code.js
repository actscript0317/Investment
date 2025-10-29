// Guest Code Input Page JavaScript

async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const guestCodeInput = document.getElementById('guestCode');

    // 입력값 가져오기 및 정규화
    const guestCode = guestCodeInput.value.trim().toUpperCase();

    if (!guestCode) {
        showError('게스트 코드를 입력해주세요.');
        return;
    }

    // 로딩 상태 표시
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    try {
        // 백엔드 API로 게스트 코드 검증
        const response = await fetch('/api/guest/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ guestCode })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            // 게스트 코드가 유효한 경우
            // 세션 스토리지에 게스트 모드 정보 저장
            sessionStorage.setItem('guestMode', 'true');
            sessionStorage.setItem('guestCode', guestCode);
            sessionStorage.setItem('guestAccountNumber', data.accountNumber);

            // 홈 화면으로 이동
            window.location.href = '/home.html';
        } else {
            // 게스트 코드가 유효하지 않은 경우
            showError(data.message || '올바르지 않은 게스트 코드입니다.');
        }
    } catch (error) {
        console.error('게스트 코드 검증 오류:', error);
        showError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
        // 로딩 상태 해제
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    errorText.textContent = message;
    errorMessage.classList.remove('hidden');

    // 3초 후 에러 메시지 숨기기
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// 입력 시 자동 대문자 변환
document.getElementById('guestCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});
