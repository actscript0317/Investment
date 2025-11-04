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
        // 1. 먼저 계좌 잔고를 조회하여 현재 보유 종목 목록 가져오기
        const balanceResponse = await fetch('/api/account/balance');
        if (!balanceResponse.ok) {
            throw new Error('Failed to fetch balance');
        }
        const balanceData = await balanceResponse.json();
        const currentHoldings = balanceData.output1 || [];

        // 디버깅: 전체 계좌 잔고 확인 (신용+현금)
        console.log('📊 전체 계좌 잔고 (신용+현금):', currentHoldings);
        console.log('📊 거래구분별:', currentHoldings.map(s => ({
            name: s.prdt_name,
            code: s.pdno,
            qty: s.hldg_qty,
            type: s.trad_dvsn_name || (s.loan_amt && parseInt(s.loan_amt) > 0 ? '신용' : '현금'),
            loanAmt: s.loan_amt
        })));

        // 현재 보유 중인 종목 코드 목록
        const currentStockCodes = new Set(
            currentHoldings
                .filter(stock => parseInt(stock.hldg_qty || 0) > 0)
                .map(stock => stock.pdno)
        );
        console.log('💎 현재 보유 종목 코드 (계좌 잔고):', Array.from(currentStockCodes));

        // 현재 보유 중인 종목의 현금/신용 구분 Map (종목코드 -> {cash: qty, credit: qty})
        const creditStockMap = new Map();
        currentHoldings
            .filter(stock => parseInt(stock.hldg_qty || 0) > 0)
            .forEach(stock => {
                const stockCode = stock.pdno;
                const qty = parseInt(stock.hldg_qty || 0);
                const isCredit = stock.trad_dvsn_name === '자기융자' ||
                                stock.trad_dvsn_name === '신용' ||
                                (stock.loan_amt && parseInt(stock.loan_amt) > 0);

                if (!creditStockMap.has(stockCode)) {
                    creditStockMap.set(stockCode, { cash: 0, credit: 0 });
                }

                const current = creditStockMap.get(stockCode);
                if (isCredit) {
                    current.credit += qty;
                } else {
                    current.cash += qty;
                }
            });
        console.log('💳 종목별 현금/신용 구분:', Array.from(creditStockMap.entries()).map(([code, split]) => ({
            code,
            cash: split.cash,
            credit: split.credit
        })));

        // 2. 거래내역 조회
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

        // 디버깅: 거래내역의 거래구분 확인
        if (data.output1 && data.output1.length > 0) {
            console.log('📊 거래내역 거래구분별:', data.output1.map(tx => ({
                name: tx.prdt_name,
                date: tx.ord_dt,
                type: tx.trad_dvsn_name,
                buyQty: tx.cblc_qty13,
                sellQty: tx.sll_qty13,
                loanAmt: tx.loan_amt
            })));
        }

        // Process transactions
        if (data.output1 && data.output1.length > 0) {
            allTransactions = processTransactions(data.output1, currentStockCodes);
            console.log('Processed Transactions:', allTransactions);
            displayTransactions(allTransactions, currentStockCodes, creditStockMap);
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
function processTransactions(rawTransactions, currentStockCodes) {
    console.log('Raw transaction sample:', rawTransactions[0]); // 첫 번째 거래 샘플 확인

    const processedTransactions = [];

    rawTransactions.forEach(tx => {
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
        const hldgQty = parseInt(tx.hldg_qty || 0); // 보유수량 (현재 보유 여부 확인용)

        // 같은 날 매수와 매도가 모두 있는 경우 -> 2개의 거래로 분리
        if (buyAmount > 0 && sellAmount > 0) {
            console.log(`🔄 분할 거래: ${tx.prdt_name || '종목명 없음'} (${date}) - 매수: ${buyAmount.toLocaleString()}원, 매도: ${sellAmount.toLocaleString()}원, 현재 보유: ${hldgQty}주`);

            // 1) 매도 거래 (익절/손절)
            processedTransactions.push({
                date: date,
                stockCode: tx.pdno,
                stockName: tx.prdt_name || '종목명 없음',
                buyAmount: 0, // 매도 카드에는 매수금액 0
                sellAmount: sellAmount,
                profitLoss: profitLoss,
                profitLossRate: profitLossRate,
                isProfit: profitLoss >= 0,
                quantity: sellQty,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                fee: parseFloat(tx.fee || 0),
                tax: parseFloat(tx.tl_tax || 0),
                holdingQty: 0, // 매도 거래는 보유수량 0
                tradeDivision: tx.trad_dvsn_name || '', // 거래구분 (현금/신용/자기융자)
                loanDate: tx.loan_dt || '', // 대출일자 (신용거래 여부)
                loanAmount: parseFloat(tx.loan_amt || 0) // 대출금액
            });

            // 2) 매수 거래 (새로운 포지션) - 현재 보유 중인 경우만
            if (hldgQty > 0) {
                console.log(`  ✅ 매수 거래 추가 (현재 ${hldgQty}주 보유 중)`);
                processedTransactions.push({
                    date: date,
                    stockCode: tx.pdno,
                    stockName: tx.prdt_name || '종목명 없음',
                    buyAmount: buyAmount,
                    sellAmount: 0, // 매수 카드에는 매도금액 0
                    profitLoss: 0,
                    profitLossRate: 0,
                    isProfit: true,
                    quantity: buyQty,
                    buyPrice: buyPrice,
                    sellPrice: 0,
                    fee: 0,
                    tax: 0,
                    holdingQty: hldgQty, // 현재 보유수량
                    tradeDivision: tx.trad_dvsn_name || '', // 거래구분 (현금/신용/자기융자)
                    loanDate: tx.loan_dt || '', // 대출일자 (신용거래 여부)
                    loanAmount: parseFloat(tx.loan_amt || 0) // 대출금액
                });
            } else {
                console.log(`  🚫 매수 거래 제외 (현재 미보유)`);
            }
        } else {
            // 매수만 또는 매도만 있는 경우
            processedTransactions.push({
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
                tax: parseFloat(tx.tl_tax || 0),
                holdingQty: hldgQty, // 현재 보유수량
                tradeDivision: tx.trad_dvsn_name || '', // 거래구분 (현금/신용/자기융자)
                loanDate: tx.loan_dt || '', // 대출일자 (신용거래 여부)
                loanAmount: parseFloat(tx.loan_amt || 0) // 대출금액
            });
        }
    });

    return processedTransactions.filter(tx => {
        // 매수했거나 매도한 거래 모두 표시
        return (tx.buyAmount > 0 || tx.sellAmount > 0) && tx.date;
    });
}

// Display Transactions
function displayTransactions(transactions, currentStockCodes, creditStockMap = new Map()) {
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.innerHTML = '';

    if (transactions.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }

    // 종목별로 거래 이력을 분석
    const stockHistory = {};

    transactions.forEach(tx => {
        if (!stockHistory[tx.stockCode]) {
            stockHistory[tx.stockCode] = {
                stockName: tx.stockName,
                buys: [],  // 매수 거래들
                sells: []  // 매도 거래들
            };
        }

        if (tx.buyAmount > 0) {
            stockHistory[tx.stockCode].buys.push({
                date: tx.date,
                amount: tx.buyAmount,
                price: tx.buyPrice,
                quantity: tx.quantity,
                holdingQty: tx.holdingQty
            });
        }

        if (tx.sellAmount > 0) {
            stockHistory[tx.stockCode].sells.push({
                date: tx.date,
                amount: tx.sellAmount,
                price: tx.sellPrice,
                quantity: tx.quantity,
                profitLoss: tx.profitLoss,
                profitLossRate: tx.profitLossRate,
                isProfit: tx.isProfit,
                fee: tx.fee,
                tax: tx.tax,
                buyPrice: tx.buyPrice,
                holdingQty: tx.holdingQty
            });
        }
    });

    // 현재 보유 중인 종목은 계좌 잔고에서 가져온 currentStockCodes 사용
    const currentlyHeldStocks = currentStockCodes;

    // 매도 거래별로 해당하는 매수 날짜 찾기 (각 매도에 대해 그 이전 매수 날짜)
    // 거래를 날짜순으로 정렬
    const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    // 종목별 매수 날짜 스택 (FIFO)
    const buyDatesStack = {};
    const sellToBuyDateMap = {}; // 매도 거래 -> 매수 날짜 매핑

    sortedTransactions.forEach(tx => {
        const key = `${tx.stockCode}-${tx.date}`;

        if (!buyDatesStack[tx.stockCode]) {
            buyDatesStack[tx.stockCode] = [];
        }

        // 매수 거래 (분할된 거래 포함)
        if (tx.buyAmount > 0 && tx.sellAmount === 0) {
            // 매수 날짜를 스택에 추가
            buyDatesStack[tx.stockCode].push(tx.date);
        }

        // 매도 거래
        if (tx.sellAmount > 0) {
            // 같은 날 매수+매도면 그날 매수 사용
            if (tx.buyAmount > 0) {
                sellToBuyDateMap[key] = tx.date;
            } else {
                // 다른 날 매수: 가장 최근 매수 날짜 사용 (스택에서 가장 마지막)
                const buyDates = buyDatesStack[tx.stockCode] || [];
                if (buyDates.length > 0) {
                    // 매도 날짜 이전의 가장 가까운 매수 날짜 찾기
                    const validBuyDates = buyDates.filter(d => d <= tx.date);
                    if (validBuyDates.length > 0) {
                        sellToBuyDateMap[key] = validBuyDates[validBuyDates.length - 1];
                    }
                }
            }
        }
    });

    console.log('📅 매도->매수 날짜 매핑:', sellToBuyDateMap);

    // 현재 보유 중인 종목의 가장 최근 매수 날짜 찾기
    const latestBuyDateForHolding = {};
    transactions.forEach(tx => {
        // 현재 보유 중이고, 매수가 있고, 보유수량이 있는 거래
        if (currentlyHeldStocks.has(tx.stockCode) && tx.buyAmount > 0 && tx.holdingQty > 0) {
            if (!latestBuyDateForHolding[tx.stockCode] || tx.date > latestBuyDateForHolding[tx.stockCode]) {
                latestBuyDateForHolding[tx.stockCode] = tx.date;
            }
        }
    });

    console.log('💎 현재 보유 중인 종목:', Array.from(currentlyHeldStocks));
    console.log('📊 종목별 거래 이력:', stockHistory);
    console.log('🔵 현재 보유 종목의 최근 매수 날짜:', latestBuyDateForHolding);

    // Group by date
    const groupedByDate = groupTransactionsByDate(transactions);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    // 각 날짜별로 거래를 정렬: 보유 중인 매수 카드 최상단, 그 다음 매도 카드들
    sortedDates.forEach(date => {
        groupedByDate[date].sort((a, b) => {
            // 보유 중인 매수 카드인지 확인
            const aIsHeldBuy = (a.buyAmount > 0 && a.sellAmount === 0 && a.holdingQty > 0) ? 0 : 1;
            const bIsHeldBuy = (b.buyAmount > 0 && b.sellAmount === 0 && b.holdingQty > 0) ? 0 : 1;

            // 보유 중인 매수 카드가 다르면 보유 중인 것을 먼저
            if (aIsHeldBuy !== bIsHeldBuy) {
                return aIsHeldBuy - bIsHeldBuy;
            }

            // 둘 다 보유 중인 매수 카드이거나, 둘 다 아닌 경우
            // 매도 카드끼리는 종목명 순
            return 0;
        });
        console.log(`📅 ${formatDate(date)} 거래 순서:`, groupedByDate[date].map(tx =>
            `${tx.stockName} (${tx.sellAmount > 0 ? '매도' : '매수'}${tx.holdingQty > 0 ? `, 보유: ${tx.holdingQty}주` : ''})`
        ));
    });

    sortedDates.forEach(date => {
        const dateTransactions = groupedByDate[date];

        // 이 날짜의 거래를 필터링
        const displayTransactions = dateTransactions.filter(tx => {
            // 매도 거래는 항상 표시 (익절/손절 카드)
            if (tx.sellAmount > 0) {
                console.log(`✅ 매도 카드 표시: ${tx.stockName} (${tx.isProfit ? '익절' : '손절'}) - 날짜: ${tx.date}`);
                return true;
            }

            // 매수만 한 거래 처리 (매도 없음)
            if (tx.buyAmount > 0 && tx.sellAmount === 0) {
                // 현재 보유 중인 종목인지 확인
                const isCurrentlyHeld = currentlyHeldStocks.has(tx.stockCode);

                if (!isCurrentlyHeld) {
                    // 이미 매도됨 → 매수 카드 숨김 (익절/손절 카드로 전환됨)
                    console.log(`🚫 매수 카드 숨김: ${tx.stockName} (매도됨 - 익절/손절 카드로 전환) - 날짜: ${tx.date}`);
                    return false;
                }

                // 현재 보유 중인 종목 - 가장 최근 매수 날짜의 카드만 표시
                const latestBuyDate = latestBuyDateForHolding[tx.stockCode];

                if (latestBuyDate && tx.date === latestBuyDate) {
                    // 가장 최근 매수 → 매수 카드 표시
                    console.log(`✅ 매수 카드 표시: ${tx.stockName} (보유 중, 최근 매수) - 날짜: ${tx.date}`);
                    return true;
                } else {
                    // 과거 매수 → 매수 카드 숨김
                    console.log(`🚫 매수 카드 숨김: ${tx.stockName} (과거 매수, 최근: ${latestBuyDate}) - 날짜: ${tx.date}`);
                    return false;
                }
            }
            return false;
        });

        // 표시할 거래가 없으면 날짜 마커도 추가하지 않음
        if (displayTransactions.length === 0) {
            console.log(`🚫 ${formatDate(date)}: 표시할 거래 없음`);
            return;
        }

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
                    const key = `${tx.stockCode}-${tx.date}`;
                    buyDate = sellToBuyDateMap[key] || null;
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
                    const key = `${tx.stockCode}-${tx.date}`;
                    buyDate = sellToBuyDateMap[key] || null;
                }

                // 손절은 왼쪽, 나머지는 오른쪽
                if (tx.sellAmount > 0 && !tx.isProfit) {
                    // 손절 - 왼쪽
                    leftHtml = createTransactionCard(tx, 'loss', false, buyDate, creditStockMap);
                } else if (tx.sellAmount === 0 && tx.buyAmount > 0) {
                    // 매수(보유중) - 오른쪽
                    rightHtml = createTransactionCard(tx, 'buy', false, null, creditStockMap);
                } else if (tx.sellAmount > 0 && tx.isProfit) {
                    // 익절 - 오른쪽
                    rightHtml = createTransactionCard(tx, 'profit', false, buyDate, creditStockMap);
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
function createTransactionCard(transaction, type, isSold = false, buyDate = null, creditStockMap = new Map()) {
    const cardId = `card-${transaction.date}-${transaction.stockCode}-${Math.random().toString(36).substr(2, 9)}`;

    // 매수만 한 경우 (매도금액이 0)
    if (type === 'buy') {
        // 같은 날짜에 매도된 종목이면 보유중 배지 제거
        const holdingBadge = isSold
            ? ''
            : '<span class="text-xs text-green-600 font-semibold">보유중</span>';

        // 신용매수 여부 확인
        // 1. 거래내역에서 확인 (loan_dt, loan_amt, trad_dvsn_name)
        // 2. 계좌 잔고에서 확인 (creditStockMap - credit 수량이 0보다 큰 경우)
        const stockSplit = creditStockMap.get(transaction.stockCode);
        const isCreditBuy = transaction.loanDate ||
                           (transaction.loanAmount && transaction.loanAmount > 0) ||
                           transaction.tradeDivision === '신용' ||
                           transaction.tradeDivision === '자기융자' ||
                           (stockSplit && stockSplit.credit > 0);
        const creditBadge = isCreditBuy
            ? '<span class="text-xs text-orange-600 font-semibold ml-1">신용매수</span>'
            : '';

        // 날짜 포맷팅 (YYYYMMDD -> YY.MM.DD)
        const formatShortDate = (dateStr) => {
            if (!dateStr || dateStr.length !== 8) return dateStr;
            return `${dateStr.substring(2, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
        };

        return `
            <div class="transaction-card buy-card cursor-pointer" style="border-left: 4px solid #10b981; padding: 12px;" onclick="toggleCardDetails('${cardId}')">
                <div class="buy-icon transaction-icon" style="background: #10b981;">💰</div>
                <div>
                    <div class="flex items-center justify-between">
                        <div class="font-bold text-gray-900">${transaction.stockName}</div>
                        <div class="flex items-center gap-2">
                            ${holdingBadge}${creditBadge}
                            <span class="expand-arrow text-gray-400 transition-transform" id="arrow-${cardId}">▼</span>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">매수 ${formatShortDate(transaction.date)}</div>
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
    const bgColorClass = isLoss ? 'bg-blue-50' : 'bg-red-50';
    const cardClass = isLoss ? 'loss-card' : 'profit-card';
    const iconClass = isLoss ? 'loss-icon' : 'profit-icon';

    // 신용매수 여부 확인 (매도 거래)
    const stockSplit = creditStockMap.get(transaction.stockCode);
    const isCreditSell = transaction.loanDate ||
                        (transaction.loanAmount && transaction.loanAmount > 0) ||
                        transaction.tradeDivision === '신용' ||
                        transaction.tradeDivision === '자기융자';
    const creditBadgeSell = isCreditSell
        ? '<span class="text-xs text-orange-600 font-semibold ml-1">신용매수</span>'
        : '';

    // 날짜 포맷팅 (YYYYMMDD -> YY.MM.DD)
    const formatShortDate = (dateStr) => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.substring(2, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
    };

    // 매수 날짜와 매도 날짜 표시
    // buyDate = 매수 날짜, transaction.date = 매도 날짜
    const dateRange = buyDate
        ? `매수 ${formatShortDate(buyDate)} → 매도 ${formatShortDate(transaction.date)}`
        : `매도 ${formatShortDate(transaction.date)}`;

    return `
        <div class="transaction-card ${cardClass} cursor-pointer" style="padding: 12px;" onclick="toggleCardDetails('${cardId}')">
            <div class="${iconClass} transaction-icon">${icon}</div>
            <div>
                <div class="flex items-center justify-between">
                    <div class="font-bold text-gray-900">${transaction.stockName}${creditBadgeSell}</div>
                    <div class="flex items-center gap-1">
                        <span class="text-sm ${colorClass} font-bold">${transaction.profitLossRate >= 0 ? '+' : ''}${transaction.profitLossRate.toFixed(2)}%</span>
                        <span class="text-sm ${colorClass} font-bold px-2 py-0.5 ${bgColorClass} rounded">${transaction.profitLoss >= 0 ? '+' : ''}${transaction.profitLoss.toLocaleString()}원</span>
                        <span class="expand-arrow text-gray-400 transition-transform" id="arrow-${cardId}">▼</span>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">${dateRange}</div>
                <div class="text-xs text-gray-600 mt-1">
                    매수금액: ${transaction.buyAmount.toLocaleString()}원
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
