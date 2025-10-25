const axios = require('axios');
require('dotenv').config();

class KISApiClient {
  constructor() {
    this.appKey = process.env.KIS_APP_KEY;
    this.appSecret = process.env.KIS_APP_SECRET;
    this.baseUrl = process.env.KIS_BASE_URL || 'https://openapivts.koreainvestment.com:29443'; // 모의투자 기본값
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Access Token 발급
   */
  async getAccessToken() {
    // 토큰이 유효하면 재사용
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: this.appKey,
        appsecret: this.appSecret
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      this.accessToken = response.data.access_token;
      // 토큰 유효기간 설정 (24시간 - 1시간 여유)
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Access Token 발급 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 웹소켓 접속키 발급
   */
  async getWebSocketApprovalKey() {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth2/Approval`, {
        grant_type: 'client_credentials',
        appkey: this.appKey,
        secretkey: this.appSecret
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      return response.data.approval_key;
    } catch (error) {
      console.error('웹소켓 접속키 발급 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 주식 현재가 시세 조회
   * @param {string} stockCode - 종목코드 (ex: 005930)
   * @param {string} marketCode - 시장구분코드 (J: KRX, NX: NXT, UN: 통합)
   */
  async getStockPrice(stockCode, marketCode = 'J') {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': 'FHKST01010100',
            'custtype': 'P' // P: 개인
          },
          params: {
            FID_COND_MRKT_DIV_CODE: marketCode,
            FID_INPUT_ISCD: stockCode
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('주식 현재가 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 국내주식 기간별 시세 조회 (차트 데이터)
   * @param {string} stockCode - 종목코드 (ex: 005930)
   * @param {string} startDate - 시작일자 (YYYYMMDD)
   * @param {string} endDate - 종료일자 (YYYYMMDD)
   * @param {string} period - 기간분류 (D: 일봉, W: 주봉, M: 월봉, Y: 년봉)
   * @param {string} priceType - 가격유형 (0: 수정주가, 1: 원주가)
   * @param {string} marketCode - 시장구분코드 (J: KRX, NX: NXT, UN: 통합)
   */
  async getStockChart(stockCode, startDate, endDate, period = 'D', priceType = '0', marketCode = 'J') {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': 'FHKST03010100',
            'custtype': 'P' // P: 개인
          },
          params: {
            FID_COND_MRKT_DIV_CODE: marketCode,
            FID_INPUT_ISCD: stockCode,
            FID_INPUT_DATE_1: startDate,
            FID_INPUT_DATE_2: endDate,
            FID_PERIOD_DIV_CODE: period,
            FID_ORG_ADJ_PRC: priceType
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('차트 데이터 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new KISApiClient();
