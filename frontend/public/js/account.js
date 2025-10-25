// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 날짜 입력 초기값 설정 (최근 30일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('endDate').valueAsDate = endDate;
    document.getElementById('startDate').valueAsDate = startDate;

    // 이벤트 리스너 등록
    document.getElementById('refreshBalanceBtn').addEventListener('click', loadAccountBalance);
    document.getElementById('searchTransactionsBtn').addEventListener('click', loadTransactions);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 초기 데이터 로드
    await loadAccountBalance();
    await loadTransactions();
});

// 계좌 잔고 조회
async function loadAccountBalance() {
    try {
        const response = await fetch(`${API_BASE_URL}/account/balance`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '잔고 조회에 실패했습니다.');
        }

        // 응답 데이터 구조 확인
        console.log('Balance Data:', data);

        // 계좌 요약 정보 업데이트
        updateAccountSummary(data);

        // 보유 종목 테이블 업데이트
        updateHoldingsTable(data);

    } catch (error) {
        console.error('계좌 잔고 조회 오류:', error);
        showError('계좌 잔고를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 계좌 요약 정보 업데이트
function updateAccountSummary(data) {
    // 한국투자증권 API 응답 구조에 맞춰 데이터 추출
    const output2 = data.output2 || [];

    if (output2.length > 0) {
        const summary = output2[0];

        // 총 평가금액
        const totalAssets = parseInt(summary.tot_evlu_amt || 0);
        document.getElementById('totalAssets').textContent = formatCurrency(totalAssets);

        // 평가손익
        const totalProfit = parseInt(summary.evlu_pfls_smtl_amt || 0);
        const profitElement = document.getElementById('totalProfit');
        profitElement.textContent = formatCurrency(totalProfit);
        profitElement.className = `text-2xl font-bold ${totalProfit >= 0 ? 'text-red-600' : 'text-blue-600'}`;

        // 수익률
        const profitRate = parseFloat(summary.tot_evlu_pfls_amt || 0);
        const profitRateElement = document.getElementById('totalProfitRate');
        profitRateElement.textContent = profitRate.toFixed(2) + '%';
        profitRateElement.className = `text-2xl font-bold ${profitRate >= 0 ? 'text-red-600' : 'text-blue-600'}`;
    } else {
        // 데이터가 없을 경우
        document.getElementById('totalAssets').textContent = formatCurrency(0);
        document.getElementById('totalProfit').textContent = formatCurrency(0);
        document.getElementById('totalProfitRate').textContent = '0.00%';
    }
}

// 보유 종목 테이블 업데이트
function updateHoldingsTable(data) {
    const tableBody = document.getElementById('holdingsTableBody');
    const holdings = data.output1 || [];

    if (holdings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    보유 종목이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = holdings.map(stock => {
        const stockName = stock.prdt_name || '알 수 없음';
        const quantity = parseInt(stock.hldg_qty || 0);
        const avgPrice = parseInt(stock.pchs_avg_pric || 0);
        const currentPrice = parseInt(stock.prpr || 0);
        const evalAmount = parseInt(stock.evlu_amt || 0);
        const profit = parseInt(stock.evlu_pfls_amt || 0);
        const profitRate = parseFloat(stock.evlu_pfls_rt || 0);

        const profitColor = profit >= 0 ? 'text-red-600' : 'text-blue-600';
        const profitSign = profit >= 0 ? '+' : '';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${stockName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatNumber(quantity)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(avgPrice)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(currentPrice)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(evalAmount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitColor}">
                    ${profitSign}${formatCurrency(profit)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitColor}">
                    ${profitSign}${profitRate.toFixed(2)}%
                </td>
            </tr>
        `;
    }).join('');
}

// 거래내역 조회
async function loadTransactions() {
    try {
        const startDate = document.getElementById('startDate').value.replace(/-/g, '');
        const endDate = document.getElementById('endDate').value.replace(/-/g, '');

        const response = await fetch(
            `${API_BASE_URL}/account/transactions?startDate=${startDate}&endDate=${endDate}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '거래내역 조회에 실패했습니다.');
        }

        console.log('Transaction Data:', data);
        updateTransactionsTable(data);

    } catch (error) {
        console.error('거래내역 조회 오류:', error);
        showError('거래내역을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 거래내역 테이블 업데이트
function updateTransactionsTable(data) {
    const tableBody = document.getElementById('transactionsTableBody');
    const transactions = data.output || [];

    if (transactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    조회된 거래내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = transactions.map(txn => {
        const date = txn.ord_dt || '-';
        const stockName = txn.prdt_name || '알 수 없음';
        const type = txn.sll_buy_dvsn_cd === '01' ? '매도' : '매수';
        const typeColor = txn.sll_buy_dvsn_cd === '01' ? 'text-blue-600' : 'text-red-600';
        const quantity = parseInt(txn.tot_ccld_qty || 0);
        const price = parseInt(txn.avg_prvs || 0);
        const amount = parseInt(txn.tot_ccld_amt || 0);

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${formatDate(date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${stockName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${typeColor}">${type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatNumber(quantity)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(price)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(amount)}</td>
            </tr>
        `;
    }).join('');
}

// 로그아웃 처리
function handleLogout() {
    // 로그아웃 로직 (예: 세션 삭제, 로컬스토리지 클리어 등)
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.clear();
        window.location.href = '/login.html';
    }
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

// 에러 메시지 표시
function showError(message) {
    alert(message);
}
