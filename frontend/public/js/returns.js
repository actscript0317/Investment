// Returns Page JavaScript
let currentPeriod = 'daily'; // daily, weekly, monthly
let currentRange = 1; // months
let returnsChart = null;
let allTransactions = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadReturnsData();
});

// Setup Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Period buttons
    document.getElementById('dailyBtn').addEventListener('click', () => {
        switchPeriod('daily');
    });
    document.getElementById('weeklyBtn').addEventListener('click', () => {
        switchPeriod('weekly');
    });
    document.getElementById('monthlyBtn').addEventListener('click', () => {
        switchPeriod('monthly');
    });

    // Range buttons
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = parseInt(e.target.dataset.range);
            switchRange(range);
        });
    });
}

// Switch Period
function switchPeriod(period) {
    currentPeriod = period;

    // Update button styles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    });

    const activeBtn = document.getElementById(`${period}Btn`);
    activeBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');

    // Update titles
    const periodText = period === 'daily' ? '일별' : period === 'weekly' ? '주간별' : '월별';
    document.getElementById('tableTitle').textContent = `${periodText} 상세 내역`;
    document.getElementById('chartTitle').textContent = `${periodText} 자본 추이 그래프`;

    // Update data display
    updateDisplay();
}

// Switch Range
function switchRange(range) {
    currentRange = range;

    // Update button styles
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    });

    event.target.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    event.target.classList.add('active', 'bg-indigo-600', 'text-white');

    // Update data display
    updateDisplay();
}

// Load Returns Data
async function loadReturnsData() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');

    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tableContainer.classList.add('hidden');

    try {
        // Get transaction history for the past 1 year
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        console.log(`📊 수익률 데이터 조회: ${startDateStr} ~ ${endDateStr}`);

        const response = await fetch(`/api/account/transactions?startDate=${startDateStr}&endDate=${endDateStr}`);

        if (!response.ok) {
            throw new Error('Failed to fetch transaction data');
        }

        const data = await response.json();

        loadingState.classList.add('hidden');

        if (data.output1 && data.output1.length > 0) {
            allTransactions = processTransactions(data.output1);
            console.log('Processed transactions:', allTransactions);

            updateDisplay();

            tableContainer.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Returns data loading error:', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');

        // Show error message
        document.getElementById('emptyState').innerHTML = `
            <div class="text-6xl mb-4">❌</div>
            <p class="text-xl text-red-600">데이터를 불러오는데 실패했습니다</p>
            <p class="text-gray-600 mt-2">${error.message}</p>
        `;
    }
}

// Process Transactions
function processTransactions(rawTransactions) {
    // Group transactions by date first
    const groupedByDate = {};

    rawTransactions.forEach(tx => {
        const date = tx.trad_dt;
        const sellAmount = parseFloat(tx.sll_amt || 0);
        const buyAmount = parseFloat(tx.buy_amt || 0);
        const profitLoss = parseFloat(tx.rlzt_pfls || 0);

        if (!groupedByDate[date]) {
            groupedByDate[date] = {
                date: date,
                totalBuyAmount: 0,
                totalSellAmount: 0,
                totalProfit: 0,
                hasSell: false
            };
        }

        // Accumulate data for the date
        groupedByDate[date].totalBuyAmount += buyAmount;
        groupedByDate[date].totalSellAmount += sellAmount;
        groupedByDate[date].totalProfit += profitLoss;

        if (sellAmount > 0) {
            groupedByDate[date].hasSell = true;
        }
    });

    // Convert to array and filter
    const processedTransactions = Object.values(groupedByDate)
        .filter(item => item.hasSell) // Only include dates with actual sells
        .map(item => ({
            date: item.date,
            buyAmount: item.totalBuyAmount,
            sellAmount: item.totalSellAmount,
            profitLoss: item.totalProfit,
            profitLossRate: item.totalBuyAmount > 0 ? (item.totalProfit / item.totalBuyAmount) * 100 : 0,
            isProfit: item.totalProfit >= 0
        }));

    // Sort by date ascending
    return processedTransactions.sort((a, b) => a.date.localeCompare(b.date));
}

// Update Display
function updateDisplay() {
    if (allTransactions.length === 0) return;

    // Filter transactions by range
    const filteredTransactions = filterTransactionsByRange(allTransactions, currentRange);
    console.log(`📊 Filtered ${filteredTransactions.length} transactions for ${currentRange} months`);

    // Group by period
    const periodData = groupDataByPeriod(filteredTransactions, currentPeriod);
    console.log(`📊 Grouped into ${periodData.length} ${currentPeriod} periods`);

    // Calculate cumulative data
    const dataWithCumulative = calculateCumulativeData(periodData);

    // Update table
    updateTable(dataWithCumulative);

    // Update chart
    updateChart(dataWithCumulative);
}

// Filter Transactions by Range
function filterTransactionsByRange(transactions, months) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    return transactions.filter(tx => {
        return tx.date >= startDateStr && tx.date <= endDateStr;
    });
}

// Group Data by Period
function groupDataByPeriod(transactions, period) {
    const grouped = {};

    transactions.forEach(tx => {
        let key;
        const date = tx.date; // YYYYMMDD

        if (period === 'daily') {
            key = date; // YYYYMMDD
        } else if (period === 'weekly') {
            // Group by week (Monday as start of week)
            const dateObj = parseDate(date);
            const weekStart = getWeekStart(dateObj);
            key = formatDateForAPI(weekStart);
        } else if (period === 'monthly') {
            key = date.substring(0, 6); // YYYYMM
        }

        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                transactions: [],
                totalProfit: 0,
                totalBuyAmount: 0,
                profitTrades: 0,
                totalTrades: 0
            };
        }

        grouped[key].transactions.push(tx);
        grouped[key].totalProfit += tx.profitLoss;
        grouped[key].totalBuyAmount += tx.buyAmount;
        grouped[key].totalTrades++;
        if (tx.isProfit) {
            grouped[key].profitTrades++;
        }
    });

    // Convert to array and calculate return rate
    return Object.values(grouped).map(item => {
        item.returnRate = item.totalBuyAmount > 0 ? (item.totalProfit / item.totalBuyAmount) * 100 : 0;
        item.winRate = item.totalTrades > 0 ? (item.profitTrades / item.totalTrades) * 100 : 0;
        return item;
    }).sort((a, b) => a.period.localeCompare(b.period));
}

// Get Week Start (Monday)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Calculate Cumulative Data
function calculateCumulativeData(periodData) {
    let cumulativeProfit = 0;
    const baseAmount = 4000000; // 400만원 기준

    return periodData.map(item => {
        cumulativeProfit += item.totalProfit;

        // 400만원 기준 누적 수익률
        const cumulativeReturnRate = (cumulativeProfit / baseAmount) * 100;

        // 총 자본 = 기준금액 + 누적손익
        const totalCapital = baseAmount + cumulativeProfit;

        return {
            ...item,
            cumulativeProfit: cumulativeProfit,
            cumulativeReturnRate: cumulativeReturnRate,
            totalCapital: totalCapital
        };
    });
}

// Update Chart
function updateChart(periodData) {
    const ctx = document.getElementById('returnsChart').getContext('2d');

    // Destroy previous chart if exists
    if (returnsChart) {
        returnsChart.destroy();
    }

    // Prepare data
    const labels = periodData.map(item => formatPeriodLabel(item.period, currentPeriod));
    const capitalData = periodData.map(item => item.totalCapital);
    const baseAmount = 4000000;

    // Find min and max for better scaling
    const minCapital = Math.min(...capitalData, baseAmount);
    const maxCapital = Math.max(...capitalData, baseAmount);
    const padding = (maxCapital - minCapital) * 0.1;

    // Create capital growth chart
    returnsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '총 자본 (원)',
                    data: capitalData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: capitalData.map(val => val >= baseAmount ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: '기준 자본 (400만원)',
                    data: new Array(capitalData.length).fill(baseAmount),
                    borderColor: 'rgba(156, 163, 175, 0.5)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString() + '원';

                                // For capital line, also show profit/loss from base
                                if (context.datasetIndex === 0) {
                                    const profit = context.parsed.y - baseAmount;
                                    label += ` (${profit >= 0 ? '+' : ''}${profit.toLocaleString()}원)`;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '총 자본 (원)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: minCapital - padding,
                    max: maxCapital + padding,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        },
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Update Table
function updateTable(periodData) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (periodData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-8 py-12 text-center text-gray-500 text-base">
                    데이터가 없습니다
                </td>
            </tr>
        `;
        return;
    }

    // Sort by period descending (most recent first)
    const sortedData = [...periodData].sort((a, b) => b.period.localeCompare(a.period));

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const returnClass = item.returnRate >= 0 ? 'text-red-600' : 'text-blue-600';
        const profitClass = item.totalProfit >= 0 ? 'text-red-600' : 'text-blue-600';
        const cumulativeProfitClass = item.cumulativeProfit >= 0 ? 'text-red-600' : 'text-blue-600';
        const cumulativeReturnClass = item.cumulativeReturnRate >= 0 ? 'text-red-600' : 'text-blue-600';

        row.innerHTML = `
            <td class="px-8 py-5 whitespace-nowrap text-base font-medium text-gray-900">
                ${formatPeriodLabel(item.period, currentPeriod)}
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-base font-bold ${returnClass} text-right">
                ${item.returnRate >= 0 ? '+' : ''}${item.returnRate.toFixed(2)}%
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-base font-bold ${profitClass} text-right">
                ${item.totalProfit >= 0 ? '+' : ''}${item.totalProfit.toLocaleString()}원
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-base font-bold ${cumulativeProfitClass} text-right">
                ${item.cumulativeProfit >= 0 ? '+' : ''}${item.cumulativeProfit.toLocaleString()}원
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-lg font-extrabold ${cumulativeReturnClass} text-right">
                ${item.cumulativeReturnRate >= 0 ? '+' : ''}${item.cumulativeReturnRate.toFixed(2)}%
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// Format Period Label
function formatPeriodLabel(period, periodType) {
    if (periodType === 'daily') {
        // YYYYMMDD -> YYYY.MM.DD
        return `${period.substring(0, 4)}.${period.substring(4, 6)}.${period.substring(6, 8)}`;
    } else if (periodType === 'weekly') {
        // YYYYMMDD -> YYYY.MM.DD 주
        const endDate = new Date(parseDate(period));
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = formatDateForAPI(endDate);
        return `${period.substring(0, 4)}.${period.substring(4, 6)}.${period.substring(6, 8)} ~ ${endDateStr.substring(4, 6)}.${endDateStr.substring(6, 8)}`;
    } else if (periodType === 'monthly') {
        // YYYYMM -> YYYY년 MM월
        return `${period.substring(0, 4)}년 ${period.substring(4, 6)}월`;
    }
    return period;
}

// Parse Date from YYYYMMDD string
function parseDate(dateStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

// Format Date for API (YYYYMMDD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}
