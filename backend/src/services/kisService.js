const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
require('dotenv').config();

let mcpClient = null;

// MCP 클라이언트 초기화
async function initializeMCPClient() {
    if (mcpClient) {
        return mcpClient;
    }

    try {
        const KIS_MCP_KEY = process.env.KIS_MCP_KEY || '7f8090b5-2e9b-49a9-b6c7-0154756480db';

        // 한국투자증권 MCP 서버와 연결 (kis-code-assistant-mcp 사용)
        const transport = new StdioClientTransport({
            command: 'npx',
            args: [
                '-y',
                '@smithery/cli@latest',
                'run',
                '@KISOpenAPI/kis-code-assistant-mcp',
                '--key',
                KIS_MCP_KEY
            ],
        });

        mcpClient = new Client({
            name: 'stock-trading-backend',
            version: '1.0.0',
        }, {
            capabilities: {}
        });

        await mcpClient.connect(transport);
        console.log('✅ 한국투자증권 MCP 연결 성공');

        return mcpClient;
    } catch (error) {
        console.error('❌ MCP 클라이언트 초기화 실패:', error);
        throw error;
    }
}

// 주식 현재가 조회
async function getStockQuote(stockCode) {
    try {
        const client = await initializeMCPClient();

        // 먼저 사용 가능한 도구 목록 확인
        const tools = await client.listTools();
        console.log('사용 가능한 MCP 도구:', tools);

        // MCP 도구 호출: 주식 현재가 조회
        // 도구 이름은 kis-code-assistant-mcp 문서에 따라 다를 수 있음
        const result = await client.callTool({
            name: 'get_current_price', // 또는 'inquire_price', 'get_stock_price' 등
            arguments: {
                stock_code: stockCode
            }
        });

        console.log('주식 시세 조회 결과:', JSON.stringify(result, null, 2));

        // MCP 응답 파싱
        if (result.content && result.content.length > 0) {
            const content = result.content[0];
            let data;

            // 응답이 텍스트인 경우 JSON 파싱
            if (content.type === 'text') {
                data = JSON.parse(content.text);
            } else {
                data = content;
            }

            // 응답 구조에 따라 데이터 추출
            const output = data.output || data;

            return {
                code: stockCode,
                name: output.hts_kor_isnm || output.name || '알 수 없는 종목',
                currentPrice: parseInt(output.stck_prpr || output.current_price || 0),
                priceChange: parseInt(output.prdy_vrss || output.price_change || 0),
                changeRate: parseFloat(output.prdy_ctrt || output.change_rate || 0),
                openPrice: parseInt(output.stck_oprc || output.open_price || 0),
                highPrice: parseInt(output.stck_hgpr || output.high_price || 0),
                lowPrice: parseInt(output.stck_lwpr || output.low_price || 0),
                volume: parseInt(output.acml_vol || output.volume || 0)
            };
        }

        throw new Error('MCP 응답 데이터가 올바르지 않습니다');
    } catch (error) {
        console.error('주식 시세 조회 오류:', error);
        throw error;
    }
}

// 주식 일별 차트 데이터 조회
async function getStockChartData(stockCode, period = '1W') {
    try {
        const client = await initializeMCPClient();

        // 기간에 따른 날짜 계산
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '1D':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case '1W':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '1M':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3M':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '1Y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 7);
        }

        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);

        // MCP 도구 호출: 일별 주가 조회
        const result = await client.callTool({
            name: 'get_daily_price', // 또는 'inquire_daily_price', 'get_chart_data' 등
            arguments: {
                stock_code: stockCode,
                start_date: startDateStr,
                end_date: endDateStr
            }
        });

        console.log('차트 데이터 조회 결과:', JSON.stringify(result, null, 2));

        // MCP 응답 파싱
        if (result.content && result.content.length > 0) {
            const content = result.content[0];
            let data;

            // 응답이 텍스트인 경우 JSON 파싱
            if (content.type === 'text') {
                data = JSON.parse(content.text);
            } else {
                data = content;
            }

            // 응답 구조에 따라 데이터 추출
            const chartArray = data.output2 || data.output || data.data || data;

            if (Array.isArray(chartArray)) {
                return chartArray.map(item => ({
                    date: formatDateString(item.stck_bsop_date || item.date),
                    open: parseInt(item.stck_oprc || item.open || 0),
                    high: parseInt(item.stck_hgpr || item.high || 0),
                    low: parseInt(item.stck_lwpr || item.low || 0),
                    close: parseInt(item.stck_clpr || item.close || 0),
                    volume: parseInt(item.acml_vol || item.volume || 0)
                })).reverse(); // 날짜 오름차순 정렬
            }
        }

        throw new Error('차트 데이터를 가져올 수 없습니다');
    } catch (error) {
        console.error('차트 데이터 조회 오류:', error);
        throw error;
    }
}

// 날짜 포맷팅 (YYYYMMDD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 날짜 문자열 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
function formatDateString(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// MCP 클라이언트 종료
async function closeMCPClient() {
    if (mcpClient) {
        await mcpClient.close();
        mcpClient = null;
        console.log('MCP 클라이언트 연결 종료');
    }
}

module.exports = {
    initializeMCPClient,
    getStockQuote,
    getStockChartData,
    closeMCPClient
};
