"use client";

import React, { useState, useEffect } from 'react';
import {
    recommenderSettingApi,
    RecommenderSetting,
    ApiResponse,
} from '@/features/RecommenderSetting/api/RecommenderSettingApi';

// Import đầy đủ các interfaces từ file API hiệu suất
import {
    recommenderPerformanceApi,
    IRecommenderPerformance,
    IPerformanceComparison,
    IGetLatestPerformancesResponse,
} from '@/features/RecommenderPerformance/api/RecommenderPerformanceApi';

// Cập nhật interface PerformanceMetrics để khớp với dữ liệu API thực tế
// Chúng ta sẽ hiển thị bản ghi hiệu suất mới nhất, nên có thể dùng IRecommenderPerformance trực tiếp.
// Hoặc tạo một interface gọn hơn nếu chỉ hiển thị một vài trường.
// Đối với trang này, `performance` state sẽ chứa IRecommenderPerformance.
// Nếu bạn muốn hiển thị so sánh, bạn sẽ cần một state khác cho IPerformanceComparison.
import RecommenderHistoryTable from '@/features/RecommenderPerformance/components/RecommenderHistoryTable'; // Điều chỉnh đường dẫn import cho đúng

interface FormState {
    [key: string]: string | number | boolean;
}

interface RecommenderSettingsPageProps {
    // Không cần props ở đây, vì đây là một trang
}

const RecommenderSettingsPage: React.FC<RecommenderSettingsPageProps> = () => {
    const [settings, setSettings] = useState<RecommenderSetting[]>([]);
    const [formState, setFormState] = useState<FormState>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

    // Sử dụng IRecommenderPerformance cho state hiệu suất
    const [latestPerformance, setLatestPerformance] = useState<IRecommenderPerformance | null>(null);
    const [performanceComparison, setPerformanceComparison] = useState<IPerformanceComparison | null>(null);

    const [performanceHistory, setPerformanceHistory] = useState<IRecommenderPerformance[]>([]);

    const [performanceLoading, setPerformanceLoading] = useState<boolean>(true);
    const [evaluationRunning, setEvaluationRunning] = useState<boolean>(false);

    const fetchSettings = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const response = await recommenderSettingApi.getAllSettings();
            if (response.status === 'success' && response.data) {
                setSettings(response.data);
                const initialFormState: FormState = {};
                response.data.forEach((setting) => {
                    switch (setting.data_type) {
                        case 'integer':
                            initialFormState[setting.key] = parseInt(setting.value);
                            break;
                        case 'float':
                            initialFormState[setting.key] = parseFloat(setting.value);
                            break;
                        case 'boolean':
                            initialFormState[setting.key] = setting.value === '1' || setting.value.toLowerCase() === 'true';
                            break;
                        default:
                            initialFormState[setting.key] = setting.value;
                    }
                });
                setFormState(initialFormState);
            } else {
                setMessage({ type: 'error', text: response.message || 'Không thể tải cài đặt.' });
                setSettings([]);
            }
        } catch (error: any) {
            console.error('Lỗi khi tải cấu hình gợi ý:', error);
            setMessage({ type: 'error', text: error.message || 'Lỗi kết nối server hoặc API không phản hồi.' });
            setSettings([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPerformance = async () => {
        setPerformanceLoading(true);
        try {
            // Gọi API thực tế để lấy dữ liệu hiệu suất
            const response = await recommenderPerformanceApi.getLatestPerformanceData();

            if (response.status === 'success') {
                // Lấy bản ghi mới nhất (phần tử đầu tiên nếu có)
                if (response.latest_10_performances && response.latest_10_performances.length > 0) {
                    setLatestPerformance(response.latest_10_performances[0]);
                    setPerformanceHistory(response.latest_10_performances); // LƯU TOÀN BỘ LỊCH SỬ

                } else {
                    setLatestPerformance(null); // Không có dữ liệu
                    setPerformanceHistory([]); // Đặt rỗng nếu không có dữ liệu

                }
                setPerformanceComparison(response.comparison); // Set dữ liệu so sánh
            } else {
                console.error('Không thể tải hiệu suất:', response.status); // Log status thay vì message
                setLatestPerformance(null);
                setPerformanceComparison(null);
                setMessage({ type: 'error', text: `Không thể tải hiệu suất: ${response.status}` }); // Thông báo cho người dùng
            }
        } catch (error: any) {
            console.error('Lỗi khi tải hiệu suất mô hình:', error);
            setLatestPerformance(null);
            setPerformanceComparison(null);
            setMessage({ type: 'error', text: error.message || 'Lỗi kết nối server hoặc API hiệu suất không phản hồi.' });
        } finally {
            setPerformanceLoading(false);
        }
    };

    const handleRunEvaluation = async () => {
        setEvaluationRunning(true);
        setMessage(null);
        try {
            // Gọi API thực tế để kích hoạt đánh giá
            const response = await recommenderPerformanceApi.runEvaluation();

            if (response.status === 'success') {
                setMessage({ type: 'success', text: response.message });
                // Sau khi kích hoạt, chờ một chút rồi tải lại hiệu suất
                setTimeout(() => {
                    fetchPerformance();
                }, 5000); // Có thể điều chỉnh thời gian chờ tùy thuộc vào thời gian chạy mô hình
            } else {
                setMessage({ type: 'error', text: response.message || 'Không thể kích hoạt đánh giá.' });
            }
        } catch (error: any) {
            console.error('Lỗi khi kích hoạt đánh giá:', error);
            setMessage({ type: 'error', text: error.message || 'Lỗi kết nối để kích hoạt đánh giá.' });
        } finally {
            setEvaluationRunning(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchPerformance();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const settingsToSend: Record<string, any> = {};
        settings.forEach((setting) => {
            let valueToSave: any = formState[setting.key];

            if (setting.data_type === 'boolean') {
                valueToSave = valueToSave ? '1' : '0';
            }
            settingsToSend[setting.key] = valueToSave;
        });

        // Sử dụng recommenderSettingApi để cập nhật cài đặt
        try {
            const response: ApiResponse = await recommenderSettingApi.updateSettings(settingsToSend);

            if (response.status === 'success') {
                setMessage({ type: 'success', text: response.message });
                fetchSettings(); // Tải lại cài đặt sau khi lưu thành công
                fetchPerformance(); // Tải lại hiệu suất (có thể cần nếu thay đổi cài đặt ảnh hưởng trực tiếp)
            } else if (response.status === 'warning') {
                setMessage({ type: 'warning', text: response.message + ' ' + (Array.isArray(response.errors) ? response.errors.join(', ') : '') });
                fetchSettings();
            } else {
                setMessage({ type: 'error', text: response.message + ' ' + (Array.isArray(response.errors) ? response.errors.join(', ') : '') });
            }
        } catch (error: any) {
            console.error('Lỗi khi cập nhật cấu hình:', error);
            setMessage({ type: 'error', text: error.message || 'Lỗi kết nối server khi cập nhật cấu hình.' });
        } finally {
            setLoading(false);
        }
    };

    if (loading && settings.length === 0 && !message) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <p className="text-gray-700">Đang tải cấu hình hệ thống gợi ý...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 w-full max-w-5xl md:max-w-6xl">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                    Quản lý Tham số Hệ thống Gợi ý
                </h1>

                {message && (
                    <div
                        className={`p-4 mb-6 rounded-lg text-sm font-medium ${
                            message.type === 'success'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : message.type === 'warning'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/2">
                        {settings.length === 0 && !loading && message?.type === 'error' ? (
                            <div className="text-center text-red-600 font-medium">
                                <p>Không thể tải cấu hình. Vui lòng kiểm tra kết nối API hoặc thử lại.</p>
                                <p className="text-sm text-red-500 mt-2">{message.text}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-gray-50 rounded-lg shadow">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Cấu hình Tham số</h2>
                                {settings.map((setting) => (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center" key={setting.key}>
                                        <label htmlFor={setting.key} className="block text-gray-700 font-semibold md:col-span-1">
                                            {setting.key}
                                            {setting.description && (
                                                <p className="text-xs text-gray-500 mt-1 font-normal">{setting.description}</p>
                                            )}
                                        </label>
                                        <div className="md:col-span-2">
                                            {setting.data_type === 'integer' || setting.data_type === 'float' ? (
                                                <input
                                                    type="number"
                                                    step={setting.data_type === 'float' ? '0.01' : '1'}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                                                    id={setting.key}
                                                    name={setting.key}
                                                    value={formState[setting.key] as (string | number)}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            ) : setting.data_type === 'boolean' ? (
                                                <select
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                                                    id={setting.key}
                                                    name={setting.key}
                                                    value={formState[setting.key] ? '1' : '0'}
                                                    onChange={handleChange}
                                                    required
                                                >
                                                    <option value="1">True</option>
                                                    <option value="0">False</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                                                    id={setting.key}
                                                    name={setting.key}
                                                    value={formState[setting.key] as string}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            'Lưu Cấu hình'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Cột bên phải: Phần hiển thị hiệu suất */}
                    <div className="w-full md:w-1/2">
                        <section className="p-4 bg-blue-50 rounded-lg shadow">
                            <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center">Hiệu suất Mô hình Gợi ý gần đây</h2>
                            {performanceLoading ? (
                                <p className="text-blue-700 text-center">Đang tải hiệu suất...</p>
                            ) : latestPerformance ? ( // Đổi từ 'performance' sang 'latestPerformance'
                                <div className="grid grid-cols-1 gap-4 text-center">
                                    <div className="p-4 bg-white rounded-md shadow-sm border border-blue-200">
                                        <p className="text-sm text-gray-600">NDCG@{latestPerformance.top_n_recommendations}</p>
                                        <p className="text-3xl font-bold text-blue-600">{latestPerformance.ndcg_at_n.toFixed(4)}</p>
                                        <p className="text-sm text-gray-500 mt-1">Độ chính xác và thứ tự gợi ý</p>
                                        {performanceComparison && performanceComparison.ndcg_change !== null && (
                                            <p className={`text-xs mt-1 ${
                                                performanceComparison.ndcg_change > 0 ? 'text-green-500' :
                                                performanceComparison.ndcg_change < 0 ? 'text-red-500' : 'text-gray-500'
                                            }`}>
                                                Thay đổi: {performanceComparison.ndcg_change > 0 ? '+' : ''}{performanceComparison.ndcg_change.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white rounded-md shadow-sm border border-blue-200">
                                        <p className="text-sm text-gray-600">Precision@{latestPerformance.top_n_recommendations}</p>
                                        <p className="text-3xl font-bold text-green-600">{latestPerformance.precision_at_n.toFixed(4)}</p>
                                        <p className="text-sm text-gray-500 mt-1">Tỷ lệ gợi ý đúng</p>
                                        {performanceComparison && performanceComparison.precision_change !== null && (
                                            <p className={`text-xs mt-1 ${
                                                performanceComparison.precision_change > 0 ? 'text-green-500' :
                                                performanceComparison.precision_change < 0 ? 'text-red-500' : 'text-gray-500'
                                            }`}>
                                                Thay đổi: {performanceComparison.precision_change > 0 ? '+' : ''}{performanceComparison.precision_change.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white rounded-md shadow-sm border border-blue-200">
                                        <p className="text-sm text-gray-600">Recall@{latestPerformance.top_n_recommendations}</p>
                                        <p className="text-3xl font-bold text-purple-600">{latestPerformance.recall_at_n.toFixed(4)}</p>
                                        <p className="text-sm text-gray-500 mt-1">Tỷ lệ sản phẩm liên quan được tìm thấy</p>
                                        {performanceComparison && performanceComparison.recall_change !== null && (
                                            <p className={`text-xs mt-1 ${
                                                performanceComparison.recall_change > 0 ? 'text-green-500' :
                                                performanceComparison.recall_change < 0 ? 'text-red-500' : 'text-gray-500'
                                            }`}>
                                                Thay đổi: {performanceComparison.recall_change > 0 ? '+' : ''}{performanceComparison.recall_change.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white rounded-md shadow-sm border border-blue-200">
                                        <p className="text-sm text-gray-600">MAP</p>
                                        <p className="text-3xl font-bold text-orange-600">{latestPerformance.map.toFixed(4)}</p>
                                        <p className="text-sm text-gray-500 mt-1">Độ chính xác trung bình</p>
                                        {performanceComparison && performanceComparison.map_change !== null && (
                                            <p className={`text-xs mt-1 ${
                                                performanceComparison.map_change > 0 ? 'text-green-500' :
                                                performanceComparison.map_change < 0 ? 'text-red-500' : 'text-gray-500'
                                            }`}>
                                                Thay đổi: {performanceComparison.map_change > 0 ? '+' : ''}{performanceComparison.map_change.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-red-600 text-center">Không có dữ liệu hiệu suất để hiển thị.</p>
                            )}

                            {latestPerformance && ( // Đổi từ 'performance' sang 'latestPerformance'
                                <p className="text-sm text-gray-500 text-center mt-4">
                                    Đánh giá lần cuối: {new Date(latestPerformance.created_at || latestPerformance.updated_at || '').toLocaleString('vi-VN')}
                                </p>
                            )}
                            {performanceComparison && performanceComparison.status !== 'not_enough_data' && performanceComparison.status !== 'no_data' && (
                                <p className="text-sm text-gray-700 text-center mt-2 font-medium">
                                    Trạng thái so sánh: <span className={
                                        performanceComparison.status === 'improved' ? 'text-green-600' :
                                        performanceComparison.status === 'decreased' ? 'text-red-600' : 'text-gray-600'
                                    }>{performanceComparison.status}</span>
                                </p>
                            )}

                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={handleRunEvaluation}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={evaluationRunning}
                                >
                                    {evaluationRunning ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang chạy đánh giá...
                                        </>
                                    ) : (
                                        'Chạy Đánh giá mô hình'
                                    )}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
                <RecommenderHistoryTable performances={performanceHistory} comparison={performanceComparison} loading={performanceLoading} />

            </div>
        </div>
    );
};

export default RecommenderSettingsPage;


