// Mode Selection Page JavaScript

// 페이지 로드 확인
console.log('Mode selection page loaded');

function selectUserMode() {
    console.log('User mode selected');
    // 사용자 모드 선택 - 홈 화면으로 이동
    window.location.href = '/home.html';
}

function selectGuestMode() {
    console.log('Guest mode selected');
    // 게스트 모드 선택 - 코드 입력 페이지로 이동
    window.location.href = '/guest-code.html';
}

// 페이지가 유지되는지 확인
window.addEventListener('beforeunload', (e) => {
    console.log('Page is being unloaded');
});
