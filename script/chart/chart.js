let priceChart = null;
const defaultBackgroundColor = '#17C3B2';
const highlightColor = '#FFA500';

export const chart = {
  init: (canvasId = 'priceChart') => {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;

    if (priceChart) priceChart.destroy();

    priceChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Osakehinta (USD)',
          data: [],
          backgroundColor: [],
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // jotta highlight näkyy nopeasti
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const symbol = priceChart.data.labels[index];
            if (symbol) {
              window.dispatchEvent(new CustomEvent('stockSelected', { detail: symbol }));
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Hinta: ${ctx.raw.toFixed(2)} USD`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Osake', color: '#666' },
            ticks: { color: '#999' }
          },
          y: {
            title: { display: true, text: 'Hinta (USD)', color: '#666' },
            ticks: {
              color: '#999',
              callback: value => `${value} $`
            }
          }
        }
      }
    });

    return priceChart;
  },

  updateBarChart: (symbols, prices, onClickCallback = null) => {
    if (!priceChart || !Array.isArray(symbols) || !Array.isArray(prices)) return;

    priceChart.data.labels = symbols;
    priceChart.data.datasets[0].data = prices;
    priceChart.data.datasets[0].backgroundColor = symbols.map(() => defaultBackgroundColor);

    if (onClickCallback) {
      priceChart.options.onClick = (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const symbol = priceChart.data.labels[index];
          if (symbol) {
            onClickCallback(symbol);
          }
        }
      };
    }

    priceChart.update();
  },

  highlightBar: (symbol) => {
    if (!priceChart || !symbol) return;

    const index = priceChart.data.labels.findIndex(s => s === symbol);
    const colors = priceChart.data.labels.map(() => defaultBackgroundColor);

    if (index !== -1) {
      colors[index] = highlightColor;
    }

    priceChart.data.datasets[0].backgroundColor = colors;
    priceChart.update();
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
