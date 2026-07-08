import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './Charts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const FunnelChart = ({ data, title = 'Conversion Funnel' }) => {
  if (!data || !data.stages || data.stages.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <p>No funnel data available</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.stages.map(stage => stage.label),
    datasets: [
      {
        label: 'Count',
        data: data.stages.map(stage => stage.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: '600'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          afterLabel: function(context) {
            const stage = data.stages[context.dataIndex];
            if (stage.conversionRate !== undefined) {
              return `Conversion: ${stage.conversionRate}%`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        ticks: {
          font: {
            size: 12,
            weight: '500'
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
      
      <div className="funnel-stats">
        {data.stages.map((stage, index) => (
          <div key={index} className="funnel-stat-item">
            <span className="funnel-stat-label">{stage.label}</span>
            <div className="funnel-stat-details">
              <span className="funnel-stat-count">{stage.count.toLocaleString()}</span>
              {stage.conversionRate !== undefined && (
                <span className="funnel-stat-rate">{stage.conversionRate}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FunnelChart;
