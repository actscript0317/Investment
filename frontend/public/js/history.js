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

// 인증 확인 함수 (공개 접근 허용)
function isAuthenticated() {
    return true; // 누구나 접근 가능
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

        const url = `/api/account/transactions?startDate=${startDate}&endDate=${endDate}`;
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

        // 손실 거래 디버깅
        if (profitLoss < 0) {
            console.log('🔵 손실 거래 발견:', {
                종목명: processed.stockName,
                손익: profitLoss,
                매수금액: buyAmount,
                매도금액: sellAmount
            });
        }

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

    // 종목별 최근 매도 날짜 추적
    const lastSellDateByStock = {};
    transactions.forEach(tx => {
        if (tx.sellAmount > 0) {
            if (!lastSellDateByStock[tx.stockCode] || tx.date > lastSellDateByStock[tx.stockCode]) {
                lastSellDateByStock[tx.stockCode] = tx.date;
            }
        }
    });

    // 종목별 매수 날짜 매핑 (매도 카드에 표시용)
    const buyDateByStock = {};
    transactions.forEach(tx => {
        // 매수만 한 거래
        if (tx.buyAmount > 0 && tx.sellAmount === 0) {
            if (!buyDateByStock[tx.stockCode] || tx.date > buyDateByStock[tx.stockCode]) {
                buyDateByStock[tx.stockCode] = tx.date;
            }
        }
        // 당일 매수+매도 거래 (buyAmount와 sellAmount가 모두 있는 경우)
        // 이 경우 매도 거래 자체에 매수 정보가 포함되어 있으므로 별도 매수 날짜 불필요
    });

    console.log('🔴 종목별 최근 매도 날짜:', lastSellDateByStock);
    console.log('🟢 종목별 매수 날짜:', buyDateByStock);

    // Group by date
    const groupedByDate = groupTransactionsByDate(transactions);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
        const dateTransactions = groupedByDate[date];

        // 이 날짜의 거래를 필터링
        const displayTransactions = dateTransactions.filter(tx => {
            // 매도 거래는 항상 표시
            if (tx.sellAmount > 0) {
                return true;
            }
            // 매수 거래 처리
            if (tx.buyAmount > 0 && tx.sellAmount === 0) {
                const lastSellDate = lastSellDateByStock[tx.stockCode];

                // 이 종목을 한 번도 매도한 적 없으면 표시
                if (!lastSellDate) {
                    console.log(`✅ 매수 카드 표시: ${tx.stockName} (매도 이력 없음)`);
                    return true;
                }

                // 매도 이후의 매수면 표시 (새로운 포지션)
                if (tx.date > lastSellDate) {
                    console.log(`✅ 매수 카드 표시: ${tx.stockName} (매도 이후 새로운 매수)`);
                    return true;
                }

                // 매도 이전의 매수는 숨김
                console.log(`🚫 매수 카드 숨김: ${tx.stockName} (${lastSellDate}에 이미 매도됨)`);
                return false;
            }
            return false;
        });

        // Add date marker
        const dateMarker = document.createElement('div');
        dateMarker.className = 'date-marker';
        dateMarker.innerHTML = `
            <div class="date-line"></div>
            <div class="date-badge">${formatDate(date)}</div>
        `;
        transactionsList.appendChild(dateMarker);

        // Check if mobile view
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile: Display all transactions in order
            displayTransactions.forEach(tx => {
                const row = document.createElement('div');
                row.className = 'transaction-row';

                let type = 'buy';
                if (tx.sellAmount > 0) {
                    type = tx.isProfit ? 'profit' : 'loss';
                }

                // 매도 거래면 매수 날짜 추가
                let buyDate = null;
                if (tx.sellAmount > 0) {
                    // 당일 매수+매도면 같은 날짜 사용
                    if (tx.buyAmount > 0) {
                        buyDate = tx.date;
                    } else {
                        // 다른 날 매수한 경우
                        buyDate = buyDateByStock[tx.stockCode];
                    }
                }
                const cardHtml = createTransactionCard(tx, type, false, buyDate);

                row.innerHTML = `
                    <div class="profit-section">
                        ${cardHtml}
                    </div>
                `;

                transactionsList.appendChild(row);
            });
        } else {
            // Desktop: Display all transactions in order
            console.log(`📊 Date ${date}: ${displayTransactions.length} transactions`);

            displayTransactions.forEach(tx => {
                const row = document.createElement('div');
                row.className = 'transaction-row';

                let leftHtml = '<div class="transaction-card empty-slot"></div>';
                let rightHtml = '<div class="transaction-card empty-slot"></div>';

                // 매도 거래면 매수 날짜 추가
                let buyDate = null;
                if (tx.sellAmount > 0) {
                    // 당일 매수+매도면 같은 날짜 사용
                    if (tx.buyAmount > 0) {
                        buyDate = tx.date;
                    } else {
                        // 다른 날 매수한 경우
                        buyDate = buyDateByStock[tx.stockCode];
                    }
                }

                // 손절은 왼쪽, 나머지는 오른쪽
                if (tx.sellAmount > 0 && !tx.isProfit) {
                    // 손절 - 왼쪽
                    leftHtml = createTransactionCard(tx, 'loss', false, buyDate);
                } else if (tx.sellAmount === 0 && tx.buyAmount > 0) {
                    // 매수(보유중) - 오른쪽
                    rightHtml = createTransactionCard(tx, 'buy', false, null);
                } else if (tx.sellAmount > 0 && tx.isProfit) {
                    // 익절 - 오른쪽
                    rightHtml = createTransactionCard(tx, 'profit', false, buyDate);
                }

                row.innerHTML = `
                    <div class="loss-section">
                        ${leftHtml}
                    </div>
                    <div class="profit-section">
                        ${rightHtml}
                    </div>
                `;

                transactionsList.appendChild(row);
            });
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
function createTransactionCard(transaction, type, isSold = false, buyDate = null) {
    const cardId = `card-${transaction.date}-${transaction.stockCode}-${Math.random().toString(36).substr(2, 9)}`;

    // 매수만 한 경우 (매도금액이 0)
    if (type === 'buy') {
        // 같은 날짜에 매도된 종목이면 보유중 배지 제거
        const holdingBadge = isSold
            ? ''
            : '<span class="text-xs text-green-600 font-semibold">보유중</span>';

        return `
            <div class="transaction-card buy-card cursor-pointer" style="border-left: 4px solid #10b981; padding: 12px;" onclick="toggleCardDetails('${cardId}')">
                <div class="buy-icon transaction-icon" style="background: #10b981;">💰</div>
                <div>
                    <div class="flex items-center justify-between">
                        <div class="font-bold text-gray-900">${transaction.stockName}</div>
                        <div class="flex items-center gap-2">
                            ${holdingBadge}
                            <span class="expand-arrow text-gray-400 transition-transform" id="arrow-${cardId}">▼</span>
                        </div>
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
    const colorClass = isLoss ? 'text-blue-600' : 'text-red-600';
    const cardClass = isLoss ? 'loss-card' : 'profit-card';
    const iconClass = isLoss ? 'loss-icon' : 'profit-icon';

    // 날짜 포맷팅 (YYYYMMDD -> YY.MM.DD)
    const formatShortDate = (dateStr) => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.substring(2, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
    };

    // 매수 날짜와 매도 날짜 표시
    const dateRange = buyDate
        ? `${formatShortDate(buyDate)} → ${formatShortDate(transaction.date)}`
        : formatShortDate(transaction.date);

    return `
        <div class="transaction-card ${cardClass} cursor-pointer" style="padding: 12px;" onclick="toggleCardDetails('${cardId}')">
            <div class="${iconClass} transaction-icon">${icon}</div>
            <div>
                <div class="flex items-center justify-between">
                    <div class="font-bold text-gray-900">${transaction.stockName}</div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm ${colorClass} font-semibold">${transaction.profitLossRate >= 0 ? '+' : ''}${transaction.profitLossRate.toFixed(2)}%</span>
                        <span class="expand-arrow text-gray-400 transition-transform" id="arrow-${cardId}">▼</span>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">${dateRange}</div>
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
    const arrowEl = document.getElementById(`arrow-${cardId}`);

    if (detailsEl) {
        const isHidden = detailsEl.classList.contains('hidden');
        detailsEl.classList.toggle('hidden');

        // Rotate arrow
        if (arrowEl) {
            if (isHidden) {
                arrowEl.style.transform = 'rotate(180deg)';
            } else {
                arrowEl.style.transform = 'rotate(0deg)';
            }
        }
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
