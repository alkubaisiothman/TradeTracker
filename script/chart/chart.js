// /script/chart/chart.js
let priceChart = null;

export const chart = {
  // Alusta kaavio
  init: (canvasId = 'priceChart') => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
      console.error('Canvas elementtiä ei löydy');
      return null;
    }

    // Tarkista että Chart.js on ladattu
    if (typeof window.Chart === 'undefined') {
      console.error('Chart.js ei ole ladattu');
      return null;
    }

    priceChart = new window.Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Hinta (USD)',
          data: [],
          borderColor: '#17C3B2',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} USD`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Aika' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            title: { display: true, text: 'Hinta (USD)' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });

    return priceChart;
  },

  // Päivitä kaavion data
  update: (labels, data) => {
    if (!priceChart) {
      console.error('Kaaviota ei ole alustettu');
      return;
    }
    
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = data;
    priceChart.update();
  },

  // Lisää historiallinen data
  addHistoricalData: (historicalData, period) => {
    if (!priceChart) {
      console.error('Kaaviota ei ole alustettu');
      return;
    }

    let timeSeries;
    switch (period) {
      case '1-day': timeSeries = historicalData['Time Series (60min)']; break;
      case '1-week':
      case '1-month': timeSeries = historicalData['Time Series (Daily)']; break;
      case '1-year': timeSeries = historicalData['Monthly Time Series']; break;
      default: return;
    }

    if (!timeSeries) {
      console.error('Virheellinen historiatieto:', historicalData);
      return;
    }

    const labels = Object.keys(timeSeries).reverse();
    const prices = labels.map(date => {
      const closePrice = timeSeries[date]['4. close'];
      return parseFloat(closePrice);
    });

    this.update(labels, prices);
  },

  // Tuhoa kaavio
  destroy: () => {
    if (priceChart) {
      priceChart.destroy();
      priceChart = null;
    }
  }
};

// Automaattinen alustus
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('priceChart') && typeof window.Chart !== 'undefined') {
    chart.init();
  } else {
    console.warn('Chart.js ei ole saatavilla tai canvas-elementtiä ei löydy');
  }
});