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
                tooltipFormat: 'dd.MM.yyyy',
                displayFormats: {
                  day: 'dd.MM'
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
      if (!priceChart) throw new Error('Kaaviota ei ole alustettu');
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = data;
      priceChart.update();
    } catch (error) {
      console.error('Kaavion päivitysvirhe:', error);
    }
  },

  addHistoricalData: (historicalData) => {
    try {
      if (!priceChart) throw new Error('Kaaviota ei ole alustettu');

      // Finnhubin oletettu formaatti:
      // { t: [timestamp1, timestamp2, ...], c: [price1, price2, ...] }
      const timestamps = historicalData.t;
      const prices = historicalData.c;

      if (!Array.isArray(timestamps) || !Array.isArray(prices)) {
        throw new Error('Virheellinen historiatiedon muoto');
      }

      const labels = timestamps.map(ts => new Date(ts * 1000));
      chart.update(labels, prices);
    } catch (error) {
      console.error('Historiallisen datan lisäysvirhe:', error);
    }
  },

  destroy: () => {
    if (priceChart) {
      priceChart.destroy();
      priceChart = null;
    }
  },

  getChartInstance: () => priceChart
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('priceChart')) {
    chart.init();
  }
});
