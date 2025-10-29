// History Page JavaScript
let allTransactions = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 또는 게스트 모드 확인
    if (!isAuthenticated()) {
        showLoginRequired();
        return;
    }

    setupEventListeners();
    setDefaultDates();
    loadTransactions();
});

// 인증 확인 함수
function isAuthenticated() {
    // 게스트 모드 확인
    const guestMode = sessionStorage.getItem('guestMode');
    if (guestMode === 'true') {
        return true;
    }

    // 사용자 로그인 확인 (실제 환경에서는 토큰 검증)
    // 임시로 계좌번호 환경변수 확인
    return true; // KIS API 키가 있으면 인증된 것으로 간주
}

// 로그인 필요 메시지 표시
function showLoginRequired() {
    const container = document.querySelector('.max-w-7xl');
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-12 text-center">
            <svg class="w-20 h-20 mx-auto mb-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <p class="text-gray-600 mb-8">거래내역을 확인하려면 로그인하거나 게스트 코드를 입력해주세요.</p>
            <div class="flex justify-center space-x-4">
                <a href="/mode-select.html" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    모드 선택
                </a>
                <a href="/login.html" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                    로그인
                </a>
            </div>
        </div>
    `;
}

// Setup Event Listeners
function setupEventListeners() {
    const filterBtn = document.getElementById('filterBtn');
    filterBtn.addEventListener('click', loadTransactions);

    // Toggle history visibility
    const toggleBtn = document.getElementById('toggleHistory');
    const timelineContainer = document.getElementById('timelineContainer');
    const toggleIcon = document.getElementById('toggleIcon');
    const toggleText = document.getElementById('toggleText');

    let isExpanded = true;

    toggleBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;

        if (isExpanded) {
            timelineContainer.classList.remove('hidden');
            toggleIcon.textContent = '▼';
            toggleText.textContent = '거래내역 접기';
        } else {
            timelineContainer.classList.add('hidden');
            toggleIcon.textContent = '▶';
            toggleText.textContent = '거래내역 펼치기';
        }
    });
}

// Set Default Dates
function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3개월 전

    document.getElementById('endDate').valueAsDate = endDate;
    document.getElementById('startDate').valueAsDate = startDate;
}

// Load Transactions
async function loadTransactions() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const transactionsList = document.getElementById('transactionsList');

    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    transactionsList.innerHTML = '';

    try {
        const startDate = document.getElementById('startDate').value.replace(/-/g, '');
        const endDate = document.getElementById('endDate').value.replace(/-/g, '');

        // 게스트 모드 확인
        const guestMode = sessionStorage.getItem('guestMode');
        const guestAccountNumber = sessionStorage.getItem('guestAccountNumber');

        let url = `/api/account/transactions?startDate=${startDate}&endDate=${endDate}`;

        // 게스트 모드인 경우 게스트 계좌번호 추가
        if (guestMode === 'true' && guestAccountNumber) {
            url += `&accountNumber=${guestAccountNumber}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();

        loadingState.classList.add('hidden');

        // 데이터 구조 확인을 위한 로그
        console.log('API Response:', data);
        console.log('Output1:', data.output1);

        // Process transactions
        if (data.output1 && data.output1.length > 0) {
            allTransactions = processTransactions(data.output1);
            console.log('Processed Transactions:', allTransactions);
            displayTransactions(allTransactions);
            updateSummary(allTransactions);
        } else {
            emptyState.classList.remove('hidden');
            updateSummary([]);
        }
    } catch (error) {
        console.error('Transaction loading error:', error);
        loadingState.classList.add('hidden');
        transactionsList.innerHTML = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">❌</div>
                <p class="text-xl text-red-600">거래내역을 불러오는데 실패했습니다</p>
                <p class="text-gray-600 mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Process Transactions
function processTransactions(rawTransactions) {
    console.log('Raw transaction sample:', rawTransactions[0]); // 첫 번째 거래 샘플 확인

    return rawTransactions.map(tx => {
        // 실제 API 응답 필드명
        const buyAmount = parseFloat(tx.buy_amt || 0); // 매수금액 (진입금액)
        const sellAmount = parseFloat(tx.sll_amt || 0); // 매도금액
        const profitLoss = parseFloat(tx.rlzt_pfls || 0); // 실현손익 (순수익)
        const profitLossRate = parseFloat(tx.pfls_rt || 0); // 손익률

        // 날짜 필드
        const date = tx.trad_dt;

        // 가격 필드
        const buyPrice = parseFloat(tx.pchs_unpr || 0); // 매수평균가
        const sellPrice = parseFloat(tx.sll_pric || 0); // 매도가격

        // 수량 필드
        const buyQty = parseInt(tx.buy_qty || 0); // 매수수량
        const sellQty = parseInt(tx.sll_qty || 0); // 매도수량

        const processed = {
            date: date,
            stockCode: tx.pdno,
            stockName: tx.prdt_name || '종목명 없음',
            buyAmount: buyAmount,
            sellAmount: sellAmount,
            profitLoss: profitLoss,
            profitLossRate: profitLossRate,
            isProfit: profitLoss >= 0,
            quantity: sellQty > 0 ? sellQty : buyQty,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            fee: parseFloat(tx.fee || 0),
            tax: parseFloat(tx.tl_tax || 0)
        };

        console.log('Processed transaction:', processed);
        return processed;
    }).filter(tx => {
        // 매수했거나 매도한 거래 모두 표시
        return (tx.buyAmount > 0 || tx.sellAmount > 0) && tx.date;
    });
}

// Display Transactions
function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.innerHTML = '';

    if (transactions.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }

    // Group by date
    const groupedByDate = groupTransactionsByDate(transactions);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
        const dateTransactions = groupedByDate[date];

        // Add date marker
        const dateMarker = document.createElement('div');
        dateMarker.className = 'date-marker';
        dateMarker.innerHTML = `
            <div class="date-line"></div>
            <div class="date-badge">${formatDate(date)}</div>
        `;
        transactionsList.appendChild(dateMarker);

        // Separate transactions by type
        const buyOnlyTxs = dateTransactions.filter(tx => tx.buyAmount > 0 && tx.sellAmount === 0); // 매수만 한 거래
        const profitTxs = dateTransactions.filter(tx => tx.buyAmount > 0 && tx.sellAmount > 0 && tx.isProfit); // 익절
        const lossTxs = dateTransactions.filter(tx => tx.buyAmount > 0 && tx.sellAmount > 0 && !tx.isProfit); // 손절

        // Combine buy-only with profit transactions (right side)
        const rightSideTxs = [...buyOnlyTxs, ...profitTxs];

        console.log(`Date ${date}:`, {
            total: dateTransactions.length,
            buyOnly: buyOnlyTxs.length,
            profit: profitTxs.length,
            loss: lossTxs.length
        });

        // Display profit/loss transactions in pairs
        const maxLength = Math.max(rightSideTxs.length, lossTxs.length);

        for (let i = 0; i < maxLength; i++) {
            const row = document.createElement('div');
            row.className = 'transaction-row';

            // Loss transaction (left side)
            const lossHtml = lossTxs[i]
                ? createTransactionCard(lossTxs[i], 'loss')
                : '<div class="transaction-card empty-slot"></div>';

            // Right side (buy-only or profit)
            let rightHtml;
            if (rightSideTxs[i]) {
                const type = rightSideTxs[i].sellAmount === 0 ? 'buy' : 'profit';
                rightHtml = createTransactionCard(rightSideTxs[i], type);
            } else {
                rightHtml = '<div class="transaction-card empty-slot"></div>';
            }

            row.innerHTML = `
                <div class="loss-section">
                    ${lossHtml}
                </div>
                <div class="profit-section">
                    ${rightHtml}
                </div>
            `;

            transactionsList.appendChild(row);
        }
    });
}

// Group Transactions by Date
function groupTransactionsByDate(transactions) {
    return transactions.reduce((groups, tx) => {
        const date = tx.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
        return groups;
    }, {});
}

// Create Transaction Card
function createTransactionCard(transaction, type) {
    const cardId = `card-${transaction.date}-${transaction.stockCode}-${Math.random().toString(36).substr(2, 9)}`;

    // 매수만 한 경우 (매도금액이 0)
    if (type === 'buy') {
        return `
            <div class="transaction-card profit-card cursor-pointer" style="border-left: 4px solid #3b82f6; padding: 12px;" onclick="toggleCardDetails('${cardId}')">
                <div class="profit-icon transaction-icon" style="background: #3b82f6;">💰</div>
                <div>
                    <div class="flex items-center justify-between">
                        <div class="font-bold text-gray-900">${transaction.stockName}</div>
                        <span class="text-xs text-blue-600 font-semibold">보유중</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">매수금액: ${transaction.buyAmount.toLocaleString()}원</div>

                    <!-- 상세 정보 (접힌 상태) -->
                    <div id="${cardId}" class="hidden mt-3 pt-3 border-t border-gray-200 text-xs space-y-1">
                        <div class="flex justify-between">
                            <span class="text-gray-600">매수수량:</span>
                            <span class="font-medium">${transaction.quantity}주</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">매수평균가:</span>
                            <span class="font-medium">${transaction.buyPrice.toLocaleString()}원</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">종목코드:</span>
                            <span class="font-medium">${transaction.stockCode}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 매도 완료된 경우
    const isLoss = type === 'loss';
    const icon = isLoss ? '▼' : '▲';
    const colorClass = isLoss ? 'text-red-600' : 'text-green-600';
    const cardClass = isLoss ? 'loss-card' : 'profit-card';
    const iconClass = isLoss ? 'loss-icon' : 'profit-icon';

    return `
        <div class="transaction-card ${cardClass} cursor-pointer" style="padding: 12px;" onclick="toggleCardDetails('${cardId}')">
            <div class="${iconClass} transaction-icon">${icon}</div>
            <div>
                <div class="flex items-center justify-between">
                    <div class="font-bold text-gray-900">${transaction.stockName}</div>
                    <span class="text-sm ${colorClass} font-semibold">${transaction.profitLossRate >= 0 ? '+' : ''}${transaction.profitLossRate.toFixed(2)}%</span>
                </div>
                <div class="text-xs text-gray-600 mt-1">
                    ${transaction.buyAmount.toLocaleString()}원 → ${transaction.profitLoss >= 0 ? '+' : ''}${transaction.profitLoss.toLocaleString()}원
                </div>

                <!-- 상세 정보 (접힌 상태) -->
                <div id="${cardId}" class="hidden mt-3 pt-3 border-t border-gray-200 text-xs space-y-1">
                    <div class="flex justify-between">
                        <span class="text-gray-600">매수수량:</span>
                        <span class="font-medium">${transaction.quantity}주</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">매수평균가:</span>
                        <span class="font-medium">${transaction.buyPrice.toLocaleString()}원</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">매도가격:</span>
                        <span class="font-medium">${transaction.sellPrice.toLocaleString()}원</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">매도금액:</span>
                        <span class="font-medium">${transaction.sellAmount.toLocaleString()}원</span>
                    </div>
                    ${transaction.fee > 0 ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">수수료:</span>
                        <span class="font-medium">${transaction.fee.toLocaleString()}원</span>
                    </div>
                    ` : ''}
                    ${transaction.tax > 0 ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">세금:</span>
                        <span class="font-medium">${transaction.tax.toLocaleString()}원</span>
                    </div>
                    ` : ''}
                    <div class="flex justify-between pt-2 border-t border-gray-200">
                        <span class="text-gray-700 font-semibold">실현손익:</span>
                        <span class="font-bold ${colorClass}">${transaction.profitLoss >= 0 ? '+' : ''}${transaction.profitLoss.toLocaleString()}원</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">종목코드:</span>
                        <span class="font-medium">${transaction.stockCode}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle card details
window.toggleCardDetails = function(cardId) {
    const detailsEl = document.getElementById(cardId);
    if (detailsEl) {
        detailsEl.classList.toggle('hidden');
    }
}

// Update Summary
function updateSummary(transactions) {
    // 매도한 거래만 카운트 (매수만 한 거래는 제외)
    const completedTrades = transactions.filter(tx => tx.sellAmount > 0);

    const totalTrades = completedTrades.length;
    const profitTrades = completedTrades.filter(tx => tx.isProfit).length;
    const lossTrades = completedTrades.filter(tx => !tx.isProfit).length;

    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('profitTrades').textContent = profitTrades;
    document.getElementById('lossTrades').textContent = lossTrades;
}

// Format Date
function formatDate(dateString) {
    if (!dateString || dateString.length !== 8) {
        return dateString;
    }

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);

    const date = new Date(year, parseInt(month) - 1, day);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];

    return `${year}년 ${month}월 ${day}일 (${weekday})`;
}
