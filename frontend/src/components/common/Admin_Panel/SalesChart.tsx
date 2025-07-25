
'use client'; // Client Component for interactivity

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import React from 'react';
import { SalesTrendData as ChartDataInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// Đăng ký các thành phần cần thiết của Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Bỏ dòng định nghĩa interface SalesChartData riêng, thay vào đó dùng trực tiếp ChartDataInterface
// export interface SalesChartData extends ChartDataInterface {}

interface SalesChartProps {
  data: ChartDataInterface; // Sử dụng trực tiếp ChartDataInterface (tức SalesTrendData)
}

export default function SalesChart({ data }: SalesChartProps) {
  const chartData = {
    labels: data.labels, // e.g., ['Mon', 'Tue', 'Wed', ...]
    datasets: [
      {
        label: 'Doanh Thu (VNĐ)',
        data: data.salesValues, // Sử dụng salesValues
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
        fill: false,
        yAxisID: 'y', // Gán cho trục Y chính
      },
      {
        label: 'Lợi Nhuận (VNĐ)', // Dataset mới cho lợi nhuận
        data: data.profitValues, // Sử dụng profitValues
        borderColor: 'rgb(255, 99, 132)', // Màu khác cho lợi nhuận
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
        fill: false,
        yAxisID: 'y', // Gán cho cùng trục Y nếu muốn so sánh trực tiếp
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Doanh Thu & Lợi Nhuận Hàng Ngày', // Cập nhật tiêu đề
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Giá Trị (VNĐ)', // Cập nhật tiêu đề trục Y
        },
      },
      x: {
        title: {
          display: true,
          text: 'Ngày',
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
      <h2 className="text-xl font-semibold mb-4">Doanh Thu & Lợi Nhuận</h2>
      {data.labels.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <p className="text-gray-500">Không có dữ liệu doanh thu và lợi nhuận cho giai đoạn này.</p>
      )}
    </div>
  );
}
