import { supabase } from './supabase-client.js';

const signupForm = document.getElementById('signupForm');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 메시지 초기화
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 비밀번호 확인
    if (password !== confirmPassword) {
        showError('비밀번호가 일치하지 않습니다.');
        return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
        showError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            showError(error.message);
        } else {
            successMessage.classList.remove('hidden');
            // 2초 후 로그인 페이지로 이동
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    } catch (error) {
        showError('회원가입 중 오류가 발생했습니다.');
        console.error('Signup error:', error);
    }
});

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}
