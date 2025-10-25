import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase 설정
// TODO: 아래 값을 실제 Supabase 프로젝트 정보로 교체하세요
// 1. Supabase 대시보드(https://app.supabase.com)에 로그인
// 2. 프로젝트 선택 > Settings > API 메뉴에서 확인 가능
// 3. Project URL -> SUPABASE_URL
// 4. Project API keys -> anon public -> SUPABASE_ANON_KEY

const SUPABASE_URL = 'https://zmnvuwlbphfzwpcgqsdv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbnZ1d2xicGhmendwY2dxc2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExOTQyNzUsImV4cCI6MjA3Njc3MDI3NX0.sKqvaRj7NaIQ9KhjWKccPOO9ZRNV3lZZTfDdJKB-FMM';

// Supabase 클라이언트 생성
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
