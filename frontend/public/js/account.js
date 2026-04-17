const API_BASE_URL = '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 이벤트 리스너 등록
    document.getElementById('refreshBalanceBtn').addEventListener('click', loadAccountBalance);
    document.getElementById('issueTokenBtn').addEventListener('click', issueToken);

    // 토큰 상세 정보 토글
    document.getElementById('toggleTokenDetails').addEventListener('click', toggleTokenDetails);

    // 모바일 메뉴 설정
    setupMobileMenu();

    // 초기 데이터 로드
    await checkTokenStatus();
    await loadAccountBalance();
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

// 계좌 잔고 조회
async function loadAccountBalance() {
    try {
        const response = await fetch(`${API_BASE_URL}/account/balance`);
        const data = await response.json();

        if (!response.ok) {
            // 토큰 에러 메시지 변경 확인
            if (data.needToken) {
                showTokenError();
                return;
            }
            throw new Error(data.message || '잔고 조회에 실패했습니다.');
        }

        // 응답 데이터 구조 확인 (한국투자증권 연동 로그)
        console.log('Balance Fetch Response:', data);

        // 계좌 요약 정보 업데이트
        updateAccountSummary(data);

        // 보유 종목 테이블 업데이트
        updateHoldingsTable(data);

    } catch (error) {
        console.error('계좌 잔고 조회 오류:', error);
        if (error.message.includes('토큰')) {
            showTokenError();
        } else {
            showError('계좌 잔고를 불러오는 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

// 계좌 요약 정보 업데이트
function updateAccountSummary(data) {
    console.log('--- 📊 계좌 잔고 데이터 수신 (한국투자증권 연동) ---');
    console.log('Balance Data:', data);

    // KIS 응답 구조에서 데이터 추출
    // output2[0]에 요약 정보가 있음
    const summary = (data.output2 && data.output2.length > 0) ? data.output2[0] : (data.output || data);

    let totalAssets = 0;
    let totalProfit = 0;
    let totalInvestment = 0;
    let profitRate = 0;

    if (summary) {
        // KIS 실제 필드명 매핑 (tot_evlt_amt, prsm_dpst_aset_amt 등)
        const equity = parseInt(summary.tot_evlt_amt || summary.nass_amt || '0', 10);
        const cash = parseInt(summary.prsm_dpst_aset_amt || '0', 10); // 예수금

        totalAssets = equity + cash;
        totalProfit = parseInt(summary.tot_evlt_pl || summary.evlu_pfls_smtl_amt || '0', 10);
        totalInvestment = parseInt(summary.tot_pur_amt || summary.pchs_amt_smtl_amt || '0', 10);
        profitRate = parseFloat(summary.tot_prft_rt || '0');
    }

    // 만약 계산된 profitRate가 0이고 투자금이 있다면 계산
    if (profitRate === 0 && totalInvestment > 0) {
        profitRate = (totalProfit / totalInvestment) * 100;
    }

    document.getElementById('totalAssets').textContent = formatCurrency(totalAssets);

    const profitElement = document.getElementById('totalProfit');
    profitElement.textContent = formatCurrency(totalProfit);
    profitElement.className = `text-lg font-bold ${totalProfit >= 0 ? 'text-red-600' : 'text-blue-600'}`;

    // 수익률 계산은 이미 상단에서 완료됨

    const profitRateElement = document.getElementById('totalProfitRate');
    const profitSign = profitRate >= 0 ? '+' : '';
    profitRateElement.textContent = profitSign + profitRate.toFixed(2) + '%';
    profitRateElement.className = `text-lg font-bold ${profitRate >= 0 ? 'text-red-600' : 'text-blue-600'}`;
}

// 보유 종목 세로 카드 형식으로 업데이트
async function updateHoldingsTable(data) {
    const holdingsGrid = document.getElementById('holdingsGrid');

    // 한국투자증권 응답에 맞게 배열 추출
    let holdings = [];
    if (Array.isArray(data.acnt_evlt_remn_indv_tot)) holdings = data.acnt_evlt_remn_indv_tot;
    else if (Array.isArray(data.output1)) holdings = data.output1;
    else if (Array.isArray(data.output)) holdings = data.output;
    else if (data && typeof data === 'object' && Array.isArray(data.detail)) holdings = data.detail;

    // 보유수량이 0보다 큰 종목만 필터링
    const activeHoldings = holdings.filter(stock => {
        const quantity = parseInt(stock.hldg_qty || stock.buy_qty || stock.qty || '0', 10);
        return quantity > 0;
    });

    if (activeHoldings.length === 0) {
        holdingsGrid.innerHTML = `
            <div class="text-center py-8 text-gray-500 bg-dark-card rounded-xl border border-gray-800 border-dashed">
                <p>보유 종목이 없거나 데이터를 불러올 수 없습니다.</p>
                <p class="text-xs text-yellow-600 mt-2">※ 한국투자증권 데이터 구조 문제 시 개발자도구(F12) 콘솔 값을 확인하세요.</p>
            </div>
        `;
        return;
    }

    // 모든 종목의 가격 레벨을 병렬로 로드
    const priceLevelsPromises = activeHoldings.map(stock => {
        const rawCode = stock.stk_cd || stock.pdno || stock.iscd || stock.item_code || '';
        // 종목코드가 'A'로 시작하는 경우 제거 (필요 시)
        const parsedCode = rawCode.startsWith('A') ? rawCode.substring(1) : rawCode;
        return loadPriceLevels(parsedCode);
    });
    const allPriceLevels = await Promise.all(priceLevelsPromises);

    holdingsGrid.innerHTML = activeHoldings.map((stock, index) => {
        const rawCode = stock.stk_cd || stock.pdno || stock.iscd || stock.item_code || '';
        const stockCode = rawCode.startsWith('A') ? rawCode.substring(1) : rawCode;
        const stockName = stock.stk_nm || stock.prdt_name || stock.item_name || stock.name || '알 수 없음';
        const quantity = parseInt(stock.rmnd_qty || stock.hldg_qty || stock.buy_qty || stock.qty || '0', 10);
        const avgPrice = parseInt(stock.pur_pric || stock.pchs_avg_pric || stock.pchs_avg_prc || stock.avg_prc || '0', 10);
        const currentPrice = parseInt(stock.cur_prc || stock.prpr || stock.now_prc || stock.prc || '0', 10);
        const evalAmount = parseInt(stock.evlt_amt || stock.evlu_amt || '0', 10);
        const profit = parseInt(stock.evltv_prft || stock.evlu_pfls_amt || '0', 10);
        const profitRate = parseFloat(stock.prft_rt || stock.evlu_pfls_rt || '0');

        const isProfit = profit >= 0;
        const profitColor = isProfit ? 'text-green-700' : 'text-blue-700';
        const cardBg = isProfit ? 'bg-green-50' : 'bg-blue-50';
        const borderColor = isProfit ? 'border-green-200' : 'border-blue-200';
        const profitSign = isProfit ? '+' : '';

        // 가격 레벨 가져오기
        const priceLevels = allPriceLevels[index];
        let priceLevelsHTML = '';

        if (priceLevels && (priceLevels.stopLoss || priceLevels.takeProfit)) {
            priceLevelsHTML = '<div class="mt-3 pt-3 border-t border-gray-300 space-y-2">';

            if (priceLevels.stopLoss) {
                const stopLoss = priceLevels.stopLoss;
                const stopLossProfit = (stopLoss - avgPrice) * quantity;
                const stopLossPercent = ((stopLoss - avgPrice) / avgPrice * 100).toFixed(2);
                const stopLossColor = stopLossProfit >= 0 ? 'text-red-600' : 'text-blue-600';

                priceLevelsHTML += `
                    <div class="bg-blue-50 p-2 rounded">
                        <div class="flex justify-between items-center">
                            <span class="text-xs text-gray-600">손절가</span>
                            <span class="text-sm font-semibold text-blue-700">${formatCurrency(stopLoss)}</span>
                        </div>
                        <div class="text-xs ${stopLossColor} mt-1">
                            ${stopLossProfit >= 0 ? '+' : ''}${formatCurrency(stopLossProfit)} (${stopLossProfit >= 0 ? '+' : ''}${stopLossPercent}%)
                        </div>
                    </div>
                `;
            }

            if (priceLevels.takeProfit) {
                const takeProfit = priceLevels.takeProfit;
                const takeProfitProfit = (takeProfit - avgPrice) * quantity;
                const takeProfitPercent = ((takeProfit - avgPrice) / avgPrice * 100).toFixed(2);
                const takeProfitColor = takeProfitProfit >= 0 ? 'text-red-600' : 'text-blue-600';

                priceLevelsHTML += `
                    <div class="bg-red-50 p-2 rounded">
                        <div class="flex justify-between items-center">
                            <span class="text-xs text-gray-600">익절가</span>
                            <span class="text-sm font-semibold text-red-700">${formatCurrency(takeProfit)}</span>
                        </div>
                        <div class="text-xs ${takeProfitColor} mt-1">
                            ${takeProfitProfit >= 0 ? '+' : ''}${formatCurrency(takeProfitProfit)} (${takeProfitProfit >= 0 ? '+' : ''}${takeProfitPercent}%)
                        </div>
                    </div>
                `;
            }

            priceLevelsHTML += '</div>';
        }

        return `
            <div class="${cardBg} border-2 ${borderColor} rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 class="text-base sm:text-lg font-bold text-gray-900">${stockName}</h3>
                    <div class="text-left sm:text-right">
                        <p class="text-xs text-gray-600">현재가</p>
                        <p class="text-base sm:text-lg font-bold text-gray-900">${formatCurrency(currentPrice)}</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div class="bg-white bg-opacity-60 p-2 sm:p-3 rounded-lg">
                        <p class="text-xs text-gray-600 mb-1">보유수량</p>
                        <p class="text-xs sm:text-sm font-semibold text-gray-900">${formatNumber(quantity)}주</p>
                    </div>
                    <div class="bg-white bg-opacity-60 p-2 sm:p-3 rounded-lg">
                        <p class="text-xs text-gray-600 mb-1">평균단가</p>
                        <p class="text-xs sm:text-sm font-semibold text-gray-900">${formatCurrency(avgPrice)}</p>
                    </div>
                    <div class="bg-white bg-opacity-60 p-2 sm:p-3 rounded-lg">
                        <p class="text-xs text-gray-600 mb-1">평가금액</p>
                        <p class="text-xs sm:text-sm font-semibold text-gray-900">${formatCurrency(evalAmount)}</p>
                    </div>
                </div>

                <div class="bg-white bg-opacity-80 rounded-lg p-3 sm:p-4 border ${borderColor}">
                    <div class="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <p class="text-xs text-gray-600 mb-1">평가손익</p>
                            <p class="text-base sm:text-lg font-bold ${profitColor}">${profitSign}${formatCurrency(profit)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-600 mb-1">수익률</p>
                            <p class="text-base sm:text-lg font-bold ${profitColor}">${profitSign}${profitRate.toFixed(2)}%</p>
                        </div>
                    </div>
                    ${priceLevelsHTML}
                </div>
            </div>
        `;
    }).join('');
}


// Load Price Levels from API
async function loadPriceLevels(stockCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/price-levels/${stockCode}`);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (!data) {
            return null;
        }

        return {
            stopLoss: data.stop_loss_price,
            takeProfit: data.take_profit_price
        };
    } catch (error) {
        console.error('❌ 가격 레벨 로드 실패:', error);
        return null;
    }
}

// 토큰 상태 확인
async function checkTokenStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/token/status`);
        const data = await response.json();

        updateTokenStatus(data);
    } catch (error) {
        console.error('토큰 상태 확인 오류:', error);
        showTokenStatusError();
    }
}

// 토큰 발급
async function issueToken() {
    const btn = document.getElementById('issueTokenBtn');
    const originalText = btn.innerHTML;

    try {
        // 버튼 비활성화 및 로딩 표시
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>발급 중...</span>
        `;

        const response = await fetch(`${API_BASE_URL}/token/issue`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '토큰 발급에 실패했습니다.');
        }

        // 성공 메시지 표시
        showTokenMessage('success', '✅ 토큰이 성공적으로 발급되었습니다!');

        // 토큰 상태 업데이트
        await checkTokenStatus();

        // 계좌 정보 새로고침
        setTimeout(() => {
            loadAccountBalance();
        }, 1000);

    } catch (error) {
        console.error('토큰 발급 오류:', error);
        showTokenMessage('error', `❌ 토큰 발급 실패: ${error.message}`);
    } finally {
        // 버튼 복원
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 토큰 상태 UI 업데이트
function updateTokenStatus(data) {
    const statusEl = document.getElementById('tokenStatus');
    const statusInlineEl = document.getElementById('tokenStatusInline');
    const issueTimeEl = document.getElementById('tokenIssueTime');
    const expireTimeEl = document.getElementById('tokenExpireTime');

    if (data.hasToken) {
        const statusHTML = `
            <span class="inline-flex items-center">
                <span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <span class="text-green-600 font-medium">정상</span>
            </span>
        `;

        statusEl.innerHTML = statusHTML;
        statusInlineEl.innerHTML = statusHTML;

        if (data.issuedAt) {
            issueTimeEl.textContent = formatDateTime(data.issuedAt);
        }

        if (data.expiresAt) {
            expireTimeEl.textContent = formatDateTime(data.expiresAt);
        }
    } else {
        const statusHTML = `
            <span class="inline-flex items-center">
                <span class="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span class="text-red-600 font-medium">미발급</span>
            </span>
        `;

        statusEl.innerHTML = statusHTML;
        statusInlineEl.innerHTML = statusHTML;
        issueTimeEl.textContent = '-';
        expireTimeEl.textContent = '-';

        showTokenMessage('warning', '⚠️ 토큰이 발급되지 않았습니다. "토큰 발급" 버튼을 클릭하여 토큰을 발급받으세요.');
    }
}

// 토큰 상태 에러 표시
function showTokenStatusError() {
    const statusEl = document.getElementById('tokenStatus');
    statusEl.innerHTML = `
        <span class="inline-flex items-center">
            <span class="w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
            <span class="text-gray-600">확인 실패</span>
        </span>
    `;
}

// 토큰 메시지 표시
function showTokenMessage(type, message) {
    const messageEl = document.getElementById('tokenMessage');

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200'
    };

    const textColors = {
        success: 'text-green-800',
        error: 'text-red-800',
        warning: 'text-yellow-800'
    };

    messageEl.className = `mt-4 p-3 rounded-lg border ${bgColors[type] || 'bg-gray-50 border-gray-200'}`;
    messageEl.innerHTML = `<p class="${textColors[type] || 'text-gray-800'}">${message}</p>`;
    messageEl.classList.remove('hidden');

    // 3초 후 메시지 숨김
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// 숫자 포맷팅 (천 단위 콤마)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 통화 포맷팅
function formatCurrency(amount) {
    return formatNumber(amount) + '원';
}

// 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// 날짜/시간 포맷팅
function formatDateTime(isoString) {
    if (!isoString) return '-';

    try {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
        return '-';
    }
}

// 토큰 에러 메시지 표시
function showTokenError() {
    // 페이지 상단의 토큰 메시지 표시
    showTokenMessage('warning', '⚠️ 계좌 연동 준비 중입니다.');

    // 페이지에 안내 메시지 표시
    document.getElementById('accountSummary').innerHTML = `
        <div class="col-span-3 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-yellow-800 mb-2">⚠️ 계좌 연동 준비 중</h3>
            <p class="text-yellow-700 mb-4">현재 한국투자증권 계좌 연동을 준비 중입니다.</p>
        </div>
    `;
}

// 에러 메시지 표시
function showError(message) {
    alert(message);
}

// 토큰 상세 정보 토글 함수
function toggleTokenDetails() {
    const detailsEl = document.getElementById('tokenDetails');
    const iconEl = document.getElementById('toggleIcon');

    if (detailsEl.classList.contains('hidden')) {
        detailsEl.classList.remove('hidden');
        iconEl.textContent = '▲';
    } else {
        detailsEl.classList.add('hidden');
        iconEl.textContent = '▼';
    }
}

