// --- Таймфреймы для графика ---
const TIMEFRAMES = [
  { label: '5m', value: '5m' },
  // { label: '10m', value: '10m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
]

// --- LocalStorage helpers ---
function saveDashboardState() {
  localStorage.setItem('mainCoin', mainCoin)
  localStorage.setItem('mainChartType', mainChartType)
  localStorage.setItem('mainTimeframe', mainTimeframe)
}
function loadDashboardState() {
  const coin = localStorage.getItem('mainCoin')
  const type = localStorage.getItem('mainChartType')
  const tf = localStorage.getItem('mainTimeframe')
  if (coin) mainCoin = coin
  if (type) mainChartType = type
  if (tf) mainTimeframe = tf
}

let mainTimeframe = '5m'

function createMainTimeframeSwitch() {
  const switchDiv = document.getElementById('main-timeframe-switch')
  if (!switchDiv) return
  switchDiv.innerHTML = ''
  TIMEFRAMES.forEach(tf => {
    const btn = document.createElement('button')
    btn.textContent = tf.label
    btn.className = mainTimeframe === tf.value ? 'active' : ''
    btn.onclick = () => {
      mainTimeframe = tf.value
      saveDashboardState()
      createMainTimeframeSwitch()
      createMainChart()
      fetchMainChartData()
    }
    switchDiv.appendChild(btn)
  })
}

// --- Единый график с переключателями монеты, типа и таймфрейма ---
let mainChart = null
let mainSeries = null
let mainChartType = 'line'
let mainCoin = 'BTCUSDT'
let mainChartCache = {}

function createMainCoinSwitch() {
  const switchDiv = document.getElementById('main-coin-switch')
  if (!switchDiv) return
  switchDiv.innerHTML = ''
  const btcBtn = document.createElement('button')
  btcBtn.textContent = 'BTC'
  btcBtn.className = mainCoin === 'BTCUSDT' ? 'active' : ''
  const ethBtn = document.createElement('button')
  ethBtn.textContent = 'ETH'
  ethBtn.className = mainCoin === 'ETHUSDT' ? 'active' : ''
  switchDiv.appendChild(btcBtn)
  switchDiv.appendChild(ethBtn)
  btcBtn.onclick = () => {
    mainCoin = 'BTCUSDT'
    saveDashboardState()
    createMainCoinSwitch()
    createMainChart()
    fetchMainChartData()
    createMainTypeSwitch()
    createMainTimeframeSwitch()
  }
  ethBtn.onclick = () => {
    mainCoin = 'ETHUSDT'
    saveDashboardState()
    createMainCoinSwitch()
    createMainChart()
    fetchMainChartData()
    createMainTypeSwitch()
    createMainTimeframeSwitch()
  }
}

function createMainTypeSwitch() {
  const switchDiv = document.getElementById('main-type-switch')
  if (!switchDiv) return
  switchDiv.innerHTML = ''
  const lineBtn = document.createElement('button')
  lineBtn.textContent = 'Линия'
  lineBtn.className = mainChartType === 'line' ? 'active' : ''
  const candleBtn = document.createElement('button')
  candleBtn.textContent = 'Свечи'
  candleBtn.className = mainChartType === 'candles' ? 'active' : ''
  const barBtn = document.createElement('button')
  barBtn.textContent = 'Бары'
  barBtn.className = mainChartType === 'bars' ? 'active' : ''
  switchDiv.appendChild(lineBtn)
  switchDiv.appendChild(candleBtn)
  switchDiv.appendChild(barBtn)
  lineBtn.onclick = () => {
    mainChartType = 'line'
    saveDashboardState()
    createMainTypeSwitch()
    createMainChart()
    fetchMainChartData()
  }
  candleBtn.onclick = () => {
    mainChartType = 'candles'
    saveDashboardState()
    createMainTypeSwitch()
    createMainChart()
    fetchMainChartData()
  }
  barBtn.onclick = () => {
    mainChartType = 'bars'
    saveDashboardState()
    createMainTypeSwitch()
    createMainChart()
    fetchMainChartData()
  }
}

function createMainChart() {
  const container = document.getElementById('main-lightchart')
  if (!container) return
  if (mainChart) {
    mainChart.remove()
    mainChart = null
    mainSeries = null
  }
  mainChart = LightweightCharts.createChart(container, {
    width: container.offsetWidth,
    height: 400,
    layout: {
      background: { color: '#161b22' },
      textColor: '#c9d1d9',
    },
    grid: {
      vertLines: { color: '#30363d' },
      horzLines: { color: '#30363d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#30363d',
    },
    timeScale: {
      borderColor: '#30363d',
      timeVisible: true,
      secondsVisible: false,
    },
  })
  if (mainChartType === 'candles') {
    mainSeries = mainChart.addCandlestickSeries({
      upColor: '#2ecc71',
      downColor: '#e74c3c',
      borderVisible: false,
      wickUpColor: '#2ecc71',
      wickDownColor: '#e74c3c',
    })
  } else if (mainChartType === 'bars') {
    mainSeries = mainChart.addBarSeries({
      upColor: '#2ecc71',
      downColor: '#e74c3c',
      thinBars: false,
    })
  } else {
    mainSeries = mainChart.addLineSeries({
      color: mainCoin === 'BTCUSDT' ? '#f7931a' : '#627eea',
      lineWidth: 2,
    })
  }
  // --- Базовая заготовка для рисования ---
  mainChart.subscribeClick(param => handleMainChartDraw(param))
}

// --- Модифицированная функция загрузки данных с таймфреймом ---
function binanceIntervalToLimit(interval) {
  switch (interval) {
    case '1w': return 104; // 2 года (52 недели * 2)
    case '1d': return 365; // 1 год
    case '4h': return 504; // ~3 месяца
    case '2h': return 504; // ~6 недель
    case '1h': return 720; // 30 дней
    case '30m': return 720; // 15 дней
    case '15m': return 480; // 5 дней
    //case '10m': return 432; // 3 дня (432*10m=3d)
    case '5m': return 288; // 1 день
    default: return 288;
  }
}

async function fetchBinanceKlines(symbol = 'BTCUSDT', interval = '5m', limit = 288) {
  // Binance API intervals: 5m, 10m, 15m, 30m, 1h, 2h, 4h, 1d, 1w
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Ошибка загрузки данных с Binance')
  return await response.json()
}

async function fetchMainChartData() {
  try {
    const cacheKey = mainCoin + '_' + mainChartType + '_' + mainTimeframe
    if (mainChartCache[cacheKey]) {
      mainSeries.setData(mainChartCache[cacheKey])
      return
    }
    const klines = await fetchBinanceKlines(mainCoin, mainTimeframe, binanceIntervalToLimit(mainTimeframe))
    let chartData
    if (mainChartType === 'candles' || mainChartType === 'bars') {
      chartData = klines.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4])
      }))
    } else {
      chartData = klines.map(k => ({
        time: Math.floor(k[0] / 1000),
        value: parseFloat(k[4])
      }))
    }
    mainSeries.setData(chartData)
    mainChartCache[cacheKey] = chartData
  } catch (err) {
    const container = document.getElementById('main-lightchart')
    if (container) {
      container.innerHTML = '<div style="color:#e74c3c;text-align:center;padding-top:150px;font-size:1.2rem;">Ошибка загрузки данных с Binance</div>'
    }
    console.error('Error fetching Binance chart:', err)
  }
}

// --- Получение и отображение цен BTC и ETH с Binance ---
async function fetchAndShowPrices() {
  try {
    // BTC
    const btcResp = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const btc = await btcResp.json();
    document.getElementById('btc-price').textContent = '$' + parseFloat(btc.lastPrice).toLocaleString();
    document.getElementById('btc-change').textContent = (parseFloat(btc.priceChangePercent).toFixed(2) + '%');
    document.getElementById('btc-change').style.color = parseFloat(btc.priceChangePercent) >= 0 ? '#2ecc71' : '#e74c3c';
    // ETH
    const ethResp = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
    const eth = await ethResp.json();
    document.getElementById('eth-price').textContent = '$' + parseFloat(eth.lastPrice).toLocaleString();
    document.getElementById('eth-change').textContent = (parseFloat(eth.priceChangePercent).toFixed(2) + '%');
    document.getElementById('eth-change').style.color = parseFloat(eth.priceChangePercent) >= 0 ? '#2ecc71' : '#e74c3c';
  } catch (err) {
    document.getElementById('btc-price').textContent = 'Error';
    document.getElementById('eth-price').textContent = 'Error';
  }
}

// --- Динамические новости через RSS (пример: BitcoinNews) ---
async function fetchCryptoNews() {
  const newsList = document.querySelector('.news ul')
  newsList.innerHTML = '<li>Loading...</li>'
  try {
    const rssUrl = 'https://bitcoinnews.com/feed/'
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    const response = await fetch(apiUrl)
    const data = await response.json()
    if (!data.items || !Array.isArray(data.items)) throw new Error('No news')
    newsList.innerHTML = ''
    for (let i = 0; i < Math.min(5, data.items.length); i++) {
      const item = data.items[i]
      const title = item.title
      const link = item.link
      const li = document.createElement('li')
      li.innerHTML = `<a href="${link}" target="_blank" rel="noopener">${title}</a>`
      newsList.appendChild(li)
    }
  } catch (err) {
    newsList.innerHTML = '<li style="color:#e74c3c">Ошибка загрузки новостей</li>'
    console.error('Error fetching news:', err)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardState()
  createMainCoinSwitch()
  createMainTypeSwitch()
  createMainTimeframeSwitch()
  createMainChart()
  fetchMainChartData()
  fetchCryptoNews()
  fetchAndShowPrices()
  setInterval(fetchAndShowPrices, 60000)
})
