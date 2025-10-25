import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 메시지 초기화
    errorMessage.classList.add('hidden');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showError(error.message);
        } else {
            // 로그인 성공 시 대시보드로 이동
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        showError('로그인 중 오류가 발생했습니다.');
        console.error('Login error:', error);
    }
});

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}
