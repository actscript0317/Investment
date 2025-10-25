import { supabase } from './supabase-client.js';

// 페이지 로드 시 로그인 상태 확인
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
});

// 로그인 상태 확인
async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        const navButtons = document.getElementById('navButtons');
        const heroButton = document.getElementById('heroButton');

        if (session) {
            // 로그인 상태: 네비게이션을 주식 조회, 로그아웃으로 변경
            navButtons.innerHTML = `
                <a href="/stock.html" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">주식 조회</a>
                <button id="logoutBtn" class="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium">로그아웃</button>
            `;

            // 로그아웃 버튼 이벤트 리스너
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });

            // 히어로 버튼을 주식 조회로 변경
            heroButton.href = '/stock.html';
            heroButton.textContent = '주식 조회하기';
        } else {
            // 비로그인 상태: 기본 네비게이션 유지
            navButtons.innerHTML = `
                <a href="/login.html" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">로그인</a>
                <a href="/signup.html" class="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">회원가입</a>
            `;

            // 히어로 버튼을 회원가입으로 유지
            heroButton.href = '/signup.html';
            heroButton.textContent = '시작하기';
        }
    } catch (error) {
        console.error('세션 확인 오류:', error);
    }
}
