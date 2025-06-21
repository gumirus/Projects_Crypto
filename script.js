document.addEventListener('DOMContentLoaded', () => {
  const btcPrice = document.getElementById('btc-price')
  const btcChange = document.getElementById('btc-change')
  const ethPrice = document.getElementById('eth-price')
  const ethChange = document.getElementById('eth-change')
  const ctx = document.getElementById('btc-chart').getContext('2d')
  let chart
  const btnBTC = document.getElementById('btn-btc')
  const btnETH = document.getElementById('btn-eth')
  const btcChartEl = document.getElementById('btc-chart')
  const ethChartEl = document.getElementById('eth-chart')

  btnBTC.addEventListener('click', () => {
    btcChartEl.style.display = 'block'
    ethChartEl.style.display = 'none'
    btnBTC.classList.add('active')
    btnETH.classList.remove('active')
  })

  btnETH.addEventListener('click', () => {
    btcChartEl.style.display = 'none'
    ethChartEl.style.display = 'block'
    btnETH.classList.add('active')
    btnBTC.classList.remove('active')
  })

  async function fetchPrices() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
      )
      const data = await response.json()

      const btc = data.bitcoin
      const eth = data.ethereum

      btcPrice.textContent = `$${btc.usd.toLocaleString()}`
      btcChange.textContent = `${btc.usd_24h_change.toFixed(2)}%`
      btcChange.style.color = btc.usd_24h_change >= 0 ? '#2ecc71' : '#e74c3c'

      ethPrice.textContent = `$${eth.usd.toLocaleString()}`
      ethChange.textContent = `${eth.usd_24h_change.toFixed(2)}%`
      ethChange.style.color = eth.usd_24h_change >= 0 ? '#2ecc71' : '#e74c3c'
    } catch (error) {
      console.error('Error fetching prices:', error)
      btcPrice.textContent = 'Error'
      ethPrice.textContent = 'Error'
    }
  }

  async function fetchBTCChart() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1'
      )
      const data = await response.json()
      const labels = data.prices.map((price) => {
        const date = new Date(price[0])
        return `${date.getHours()}:${String(date.getMinutes()).padStart(
          2,
          '0'
        )}`
      })
      const prices = data.prices.map((price) => price[1])

      if (chart) chart.destroy()

      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'BTC Price (24h)',
              data: prices,
              borderColor: '#f7931a',
              borderWidth: 2,
              fill: false,
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            x: {
              ticks: {
                color: '#c9d1d9',
              },
            },
            y: {
              ticks: {
                color: '#c9d1d9',
              },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: '#c9d1d9',
              },
            },
          },
        },
      })
    } catch (err) {
      console.error('Error fetching chart data:', err)
    }
  }

  fetchPrices()
  fetchBTCChart()
  setInterval(fetchPrices, 30000)
  setInterval(fetchBTCChart, 300000) // обновлять график каждые 5 минут
})

const ethCtx = document.getElementById('eth-chart').getContext('2d')
let ethChart

async function fetchETHChart() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1'
    )
    const data = await response.json()
    const labels = data.prices.map((price) => {
      const date = new Date(price[0])
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    })
    const prices = data.prices.map((price) => price[1])

    if (ethChart) ethChart.destroy()

    ethChart = new Chart(ethCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'ETH Price (24h)',
            data: prices,
            borderColor: '#627eea',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          x: { ticks: { color: '#c9d1d9' } },
          y: { ticks: { color: '#c9d1d9' } },
        },
        plugins: {
          legend: { labels: { color: '#c9d1d9' } },
        },
      },
    })
  } catch (err) {
    console.error('Error fetching ETH chart:', err)
  }
}

fetchETHChart()
setInterval(fetchETHChart, 300000)
