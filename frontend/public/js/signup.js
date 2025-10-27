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
        // 회원가입 버튼 비활성화
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '처리 중...';

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: `${window.location.origin}/account.html`,
                data: {
                    email: email
                },
                // 이메일 인증 없이 바로 가입 (Supabase 설정에서 이메일 인증을 끈 경우)
            }
        });

        console.log('회원가입 응답:', data, error);

        if (error) {
            // 에러 메시지를 한글로 변환
            let errorMsg = error.message;
            if (error.message.includes('User already registered')) {
                errorMsg = '이미 가입된 이메일입니다.';
            } else if (error.message.includes('Password should be')) {
                errorMsg = '비밀번호는 최소 6자 이상이어야 합니다.';
            } else if (error.message.includes('Unable to validate email')) {
                errorMsg = '유효하지 않은 이메일 주소입니다.';
            }
            showError(errorMsg);
            submitBtn.disabled = false;
            submitBtn.textContent = '회원가입';
        } else {
            // Supabase 설정에 따라 이메일 인증이 필요할 수 있음
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                // 이미 가입된 이메일
                showError('이미 가입된 이메일입니다.');
                submitBtn.disabled = false;
                submitBtn.textContent = '회원가입';
            } else {
                // 회원가입 성공
                console.log('회원가입 성공:', data);

                // 성공 메시지 표시
                successMessage.classList.remove('hidden');

                // 이메일 인증이 필요한지 확인
                if (data.user && !data.user.confirmed_at && !data.session) {
                    // 이메일 인증 필요
                    document.querySelector('#successMessage span').textContent =
                        '회원가입이 완료되었습니다! 이메일을 확인하여 인증을 완료해주세요.';

                    // 5초 후 로그인 페이지로 이동
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 5000);
                } else {
                    // 이메일 인증 없이 바로 가입 완료
                    document.querySelector('#successMessage span').textContent =
                        '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.';

                    // 2초 후 로그인 페이지로 이동
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                }
            }
        }
    } catch (error) {
        showError('회원가입 중 오류가 발생했습니다.');
        console.error('Signup error:', error);

        // 버튼 다시 활성화
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = '회원가입';
    }
});

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}
