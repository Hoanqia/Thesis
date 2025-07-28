"use client";

import React from 'react';
import { IRecommenderPerformance, IPerformanceComparison } from '@/features/RecommenderPerformance/api/RecommenderPerformanceApi';

interface RecommenderHistoryTableProps {
    performances: IRecommenderPerformance[]; 
    comparison?: IPerformanceComparison | null; 
    loading: boolean;
}

// Định nghĩa một interface cho các trường hiển thị, giúp TypeScript hiểu rõ hơn
interface DisplayField {
    key: keyof IRecommenderPerformance; // Key phải là một thuộc tính của IRecommenderPerformance
    label: string;
    // Format function được định nghĩa tổng quát hơn để nhận bất kỳ giá trị nào từ IRecommenderPerformance
    // và trả về string.
    format: (val: IRecommenderPerformance[keyof IRecommenderPerformance]) => string;
}

const RecommenderHistoryTable: React.FC<RecommenderHistoryTableProps> = ({ performances, comparison, loading }) => {
    if (loading) {
        return (
            <div className="p-4 bg-white rounded-lg shadow-md text-center text-gray-700">
                Đang tải lịch sử hiệu suất...
            </div>
        );
    }

    if (!performances || performances.length === 0) {
        return (
            <div className="p-4 bg-white rounded-lg shadow-md text-center text-gray-700">
                Không có dữ liệu lịch sử hiệu suất nào để hiển thị.
            </div>
        );
    }

    // Các trường cần hiển thị trong bảng
    const displayFields: DisplayField[] = [
        { key: 'id', label: 'ID', format: (val) => (val === undefined ? '' : (val as number).toString()) }, 
        { key: 'created_at', label: 'Thời gian tạo', format: (val) => new Date(val as string).toLocaleString('vi-VN') },
        { key: 'precision_at_n', label: 'Precision@N', format: (val) => (val as number).toFixed(4) },
        { key: 'recall_at_n', label: 'Recall@N', format: (val) => (val as number).toFixed(4) },
        { key: 'ndcg_at_n', label: 'NDCG@N', format: (val) => (val as number).toFixed(4) },
        { key: 'map', label: 'MAP', format: (val) => (val as number).toFixed(4) },
        { key: 'top_n_recommendations', label: 'Top N Rec.', format: (val) => (val as number).toString() },
        { key: 'top_k', label: 'Top K', format: (val) => (val as number).toString() },
        { key: 'cosine_threshold', label: 'Ngưỡng Cosine', format: (val) => (val as number).toFixed(4) },
        { key: 'hybrid_alpha', label: 'Alpha Hybrid', format: (val) => (val as number).toFixed(4) },
        { key: 'batch_size', label: 'Kích thước Batch', format: (val) => (val as number).toString() },
        { 
            key: 'product_blacklist', 
            label: 'Danh sách đen SP', 
            format: (val) => (val && Array.isArray(val) && val.length > 0) ? (val as number[]).join(', ') : 'Không có' 
        },
        { key: 'optimal_cold_start_threshold', label: 'Ngưỡng Cold Start', format: (val) => (val as number).toString() },
        { key: 'optimal_frequency_decay_factor', label: 'Hệ số phân rã tần suất', format: (val) => (val as number).toFixed(4) },
        { key: 'optimal_final_hybrid_threshold', label: 'Ngưỡng Hybrid cuối cùng', format: (val) => (val as number).toFixed(4) },
    ];

    return (
        <section className="mt-8 p-4 bg-white rounded-lg shadow-xl w-full">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 text-center">Lịch sử Hiệu suất Mô hình</h2> {/* Đã sửa đổi */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {displayFields.map(field => (
                                <th
                                    key={field.key.toString()}
                                    scope="col"
                                    className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider" // Đã sửa đổi
                                >
                                    {field.label}
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th> {/* Đã sửa đổi */}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {performances.map((perf, index) => (
                            <tr key={perf.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                {displayFields.map(field => {
                                    const value = perf[field.key];
                                    return (
                                        <td key={`${perf.id}-${field.key.toString()}`} className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900"> {/* Đã sửa đổi */}
                                            {field.format(value)}
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 whitespace-nowrap text-base font-semibold"> {/* Đã sửa đổi */}
                                    {/* Hiển thị trạng thái so sánh cho bản ghi mới nhất */}
                                    {index === 0 && comparison && comparison.status && comparison.status !== 'no_data' && comparison.status !== 'not_enough_data' && (
                                        <span className={`px-2 inline-flex text-sm leading-5 font-bold rounded-full ${ // Đã sửa đổi
                                            comparison.status === 'improved' ? 'bg-green-100 text-green-800' :
                                            comparison.status === 'decreased' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {comparison.status}
                                        </span>
                                    )}
                                    {index === 0 && (comparison?.status === 'only_one_record_in_top10' || comparison?.status === 'no_data') && (
                                        <span className="px-2 inline-flex text-sm leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800"> {/* Đã sửa đổi */}
                                            {comparison.status}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default RecommenderHistoryTable;