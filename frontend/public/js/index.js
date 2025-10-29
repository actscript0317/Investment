import { supabase } from './supabase-client.js';

const API_BASE_URL = 'http://localhost:3000/api';
const GOAL_AMOUNT = 100000000; // 1억원

// 페이지 로드 시 로그인 상태 확인 및 계좌 정보 로드
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    await loadAccountBalance();
    setupMobileMenu();
});

// 모바일 메뉴 설정
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// 로그인 상태 확인
async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        const navButtons = document.getElementById('navButtons');

        if (session) {
            // 로그인 상태: 네비게이션을 계좌, 로그아웃으로 변경
            navButtons.innerHTML = `
                <a href="/" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">모드 선택</a>
                <a href="/home.html" class="text-blue-600 font-semibold px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm">홈</a>
                <a href="/chart.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">차트</a>
                <a href="/history.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">거래내역</a>
                <a href="/account.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">내 계좌</a>
                <button id="logoutBtn" class="text-gray-700 hover:text-red-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">로그아웃</button>
            `;

            // 로그아웃 버튼 이벤트 리스너
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        } else {
            // 비로그인 상태: 기본 네비게이션 유지
            navButtons.innerHTML = `
                <a href="/" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">모드 선택</a>
                <a href="/home.html" class="text-blue-600 font-semibold px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm">홈</a>
                <a href="/chart.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">차트</a>
                <a href="/history.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">거래내역</a>
                <a href="/account.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">내 계좌</a>
                <a href="/login.html" class="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium">로그인</a>
                <a href="/signup.html" class="bg-blue-600 text-white hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium">회원가입</a>
            `;
        }
    } catch (error) {
        console.error('세션 확인 오류:', error);
    }
}

// 계좌 잔고 조회 및 게이지바 업데이트
async function loadAccountBalance() {
    try {
        const response = await fetch(`${API_BASE_URL}/account/balance`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '잔고 조회에 실패했습니다.');
        }

        const output2 = data.output2 || [];

        if (output2.length > 0) {
            const summary = output2[0];
            const currentAsset = parseInt(summary.tot_evlu_amt || 0);

            updateGaugeBar(currentAsset);
        } else {
            showError('계좌 정보를 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('계좌 잔고 조회 오류:', error);
        showError('계좌 정보를 불러오는데 실패했습니다. 로그인 후 토큰을 발급받아주세요.');
    }
}

// 게이지바 업데이트
function updateGaugeBar(currentAsset) {
    const percentage = Math.min((currentAsset / GOAL_AMOUNT) * 100, 100);
    const remaining = Math.max(GOAL_AMOUNT - currentAsset, 0);

    // 현재 자산
    document.getElementById('currentAsset').textContent = formatCurrency(currentAsset);

    // 달성률
    document.getElementById('achievementRate').textContent = percentage.toFixed(2) + '%';

    // 목표까지 남은 금액
    document.getElementById('remainingAmount').textContent = formatCurrency(remaining);

    // 진행률 퍼센티지
    document.getElementById('progressPercentage').textContent = percentage.toFixed(1) + '%';

    // 게이지바 애니메이션
    const progressBar = document.getElementById('progressBar');
    setTimeout(() => {
        progressBar.style.width = percentage + '%';
    }, 100);

    // 게이지바 내부 텍스트
    if (percentage > 15) {
        document.getElementById('progressBarText').textContent = percentage.toFixed(1) + '%';
    }

    // 응원 메시지
    updateEncouragementMessage(percentage, currentAsset);
}

// 응원 메시지 업데이트
function updateEncouragementMessage(percentage, currentAsset) {
    const messageEl = document.getElementById('encouragementMessage');
    let message = '';

    if (percentage >= 100) {
        message = '🎉 축하합니다! 1억 목표를 달성했습니다!';
    } else if (percentage >= 80) {
        message = '🚀 거의 다 왔습니다! 조금만 더 힘내세요!';
    } else if (percentage >= 60) {
        message = '💪 절반을 넘어섰습니다! 훌륭해요!';
    } else if (percentage >= 40) {
        message = '📈 꾸준히 성장하고 있어요! 계속 전진하세요!';
    } else if (percentage >= 20) {
        message = '🌱 좋은 시작입니다! 한 걸음씩 나아가고 있어요!';
    } else if (percentage > 0) {
        message = '🎯 목표를 향한 첫 걸음! 화이팅!';
    } else {
        message = '💡 새로운 시작! 지금부터 1억을 향해 달려봅시다!';
    }

    messageEl.textContent = message;
}

// 에러 메시지 표시
function showError(message) {
    document.getElementById('currentAsset').textContent = '-';
    document.getElementById('achievementRate').textContent = '-%';
    document.getElementById('remainingAmount').textContent = '-';
    document.getElementById('encouragementMessage').textContent = message;
}

// 숫자 포맷팅 (천 단위 콤마)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 통화 포맷팅
function formatCurrency(amount) {
    return formatNumber(amount) + '원';
}
