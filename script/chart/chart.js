let priceChart = null;

export const chart = {
  init: (canvasId = 'priceChart') => {
    try {
      const ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.warn(`Canvas-elementtiä ID:llä '${canvasId}' ei löytynyt`);
        return null;
      }

      if (typeof window.Chart === 'undefined') {
        console.error('Chart.js kirjasto ei ole ladattu');
        return null;
      }

      if (priceChart) {
        priceChart.destroy();
      }

      priceChart = new window.Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Hinta (USD)',
            data: [],
            borderColor: '#17C3B2',
            backgroundColor: 'rgba(23, 195, 178, 0.1)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
            pointRadius: 0,
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 200,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: ${context.parsed.y?.toFixed(2) || '0.00'} USD`;
                }
              }
            },
            zoom: {
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'xy'
              },
              pan: {
                enabled: true,
                mode: 'xy'
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                tooltipFormat: 'dd.MM.yyyy', // ← korjattu muoto
                displayFormats: {
                  day: 'dd.MM' // ← korjattu muoto
                }
              },
              title: { 
                display: true, 
                text: 'Aika',
                color: '#666'
              },
              grid: { 
                display: false
              },
              ticks: {
                color: '#999'
              }
            },
            y: {
              title: { 
                display: true, 
                text: 'Hinta (USD)',
                color: '#666'
              },
              grid: { 
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#999',
                callback: (value) => `${value} $`
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'nearest'
          }
        }
      });

      return priceChart;
    } catch (error) {
      console.error('Kaavion alustusvirhe:', error);
      return null;
    }
  },

  update: (labels, data) => {
    try {
      if (!priceChart) {
        throw new Error('Kaaviota ei ole alustettu');
      }
      
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = data;
      priceChart.update();
    } catch (error) {
      console.error('Kaavion päivitysvirhe:', error);
    }
  },

  addHistoricalData: (historicalData, period) => {
    try {
      if (!priceChart) {
        throw new Error('Kaaviota ei ole alustettu');
      }

      let timeSeries;
      switch (period) {
        case '1-day': 
          timeSeries = historicalData['Time Series (60min)']; 
          break;
        case '1-week':
        case '1-month': 
          timeSeries = historicalData['Time Series (Daily)']; 
          break;
        case '1-year': 
          timeSeries = historicalData['Monthly Time Series']; 
          break;
        default: 
          throw new Error(`Virheellinen ajanjakso: ${period}`);
      }

      if (!timeSeries) {
        throw new Error('Virheellinen historiatieto: timeSeries puuttuu');
      }

      const labels = Object.keys(timeSeries).reverse();
      const prices = labels.map(date => {
        const priceData = timeSeries[date];
        if (!priceData) {
          console.warn(`Hintatieto puuttuu päivälle ${date}`);
          return null;
        }
        return parseFloat(priceData['4. close']);
      }).filter(price => price !== null);

      if (prices.length === 0) {
        throw new Error('Ei kelvollisia hintatietoja');
      }

      chart.update(labels, prices);
    } catch (error) {
      console.error('Historiallisen datan lisäysvirhe:', error);
      throw error;
    }
  },

  destroy: () => {
    if (priceChart) {
      priceChart.destroy();
      priceChart = null;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('priceChart')) {
    chart.init();
  }
});
