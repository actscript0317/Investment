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
        // 로그인 버튼 비활성화
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // 에러 메시지를 한글로 변환
            let errorMsg = error.message;
            console.error('로그인 에러:', error);

            if (error.message.includes('Invalid login credentials')) {
                errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = '이메일 인증이 필요합니다. 등록하신 이메일을 확인해주세요.';
            } else if (error.message.includes('Invalid email')) {
                errorMsg = '유효하지 않은 이메일 형식입니다.';
            } else if (error.message.includes('Email link is invalid')) {
                errorMsg = '이메일 인증 링크가 유효하지 않습니다.';
            }

            showError(errorMsg);
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
        } else {
            console.log('로그인 성공:', data);
            // 로그인 성공 시 계좌 페이지로 이동
            window.location.href = '/account.html';
        }
    } catch (error) {
        showError('로그인 중 오류가 발생했습니다.');
        console.error('Login error:', error);

        // 버튼 다시 활성화
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = '로그인';
    }
});

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}
