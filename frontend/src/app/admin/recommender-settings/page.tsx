// pages/admin/recommender-settings.tsx
"use client"; // Đảm bảo đây là Client Component

import React, { useState, useEffect } from 'react';
// Đã bỏ import GetServerSideProps vì bạn muốn chuyển sang Client-Side Rendering cho việc tải dữ liệu ban đầu
import {
  recommenderSettingApi, // Import đối tượng API đã gom nhóm
  RecommenderSetting,
  ApiResponse,
} from '@/features/RecommenderSetting/api/RecommenderSettingApi'; // Đã điều chỉnh đường dẫn theo yêu cầu

// Định nghĩa kiểu dữ liệu cho trạng thái form
interface FormState {
  [key: string]: string | number | boolean;
}

// Định nghĩa Props cho trang (không còn nhận initialSettings từ getServerSideProps nữa)
interface RecommenderSettingsPageProps {
  // initialSettings và errorMessage sẽ không còn được truyền qua props từ SSR nữa.
  // Chúng ta sẽ quản lý chúng hoàn toàn trên client-side.
}

const RecommenderSettingsPage: React.FC<RecommenderSettingsPageProps> = () => {
  // Khởi tạo trạng thái rỗng ban đầu, sẽ được fetch trên client
  const [settings, setSettings] = useState<RecommenderSetting[]>([]);
  const [formState, setFormState] = useState<FormState>({});
  const [loading, setLoading] = useState<boolean>(true); // Bắt đầu với loading true khi fetch trên client
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Hàm để fetch cài đặt từ API
  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await recommenderSettingApi.getAllSettings();
      if (response.status === 'success' && response.data) {
        setSettings(response.data);
        // Khởi tạo formState từ dữ liệu API
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
        setSettings([]); // Đảm bảo settings rỗng nếu có lỗi
      }
    } catch (error: any) {
      console.error('Lỗi khi tải cấu hình gợi ý:', error);
      setMessage({ type: 'error', text: error.message || 'Lỗi kết nối server hoặc API không phản hồi.' });
      setSettings([]); // Đảm bảo settings rỗng nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng useEffect để gọi fetchSettings khi component được mount
  useEffect(() => {
    fetchSettings();
  }, []); // [] đảm bảo chỉ chạy một lần khi mount

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: type === 'number' ? parseFloat(value) : value, // Xử lý số
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Chuẩn bị dữ liệu để gửi đi
    const settingsToSend: Record<string, any> = {};
    settings.forEach((setting) => {
      // Lấy giá trị từ formState
      let valueToSave: any = formState[setting.key];

      // Đối với boolean, chuyển lại thành '1' hoặc '0' nếu backend mong đợi
      if (setting.data_type === 'boolean') {
        valueToSave = valueToSave ? '1' : '0';
      }
      // Các kiểu khác (số, chuỗi) có thể gửi trực tiếp, Laravel sẽ xử lý ép kiểu
      settingsToSend[setting.key] = valueToSave;
    });

    const response: ApiResponse = await recommenderSettingApi.updateSettings(settingsToSend);

    if (response.status === 'success') {
      setMessage({ type: 'success', text: response.message });
      // Sau khi cập nhật thành công, fetch lại settings để đảm bảo UI đồng bộ với DB
      fetchSettings();
    } else if (response.status === 'warning') {
      setMessage({ type: 'warning', text: response.message + ' ' + (Array.isArray(response.errors) ? response.errors.join(', ') : '') });
      // Vẫn tải lại để hiển thị trạng thái hiện tại
      fetchSettings();
    } else {
      setMessage({ type: 'error', text: response.message + ' ' + (Array.isArray(response.errors) ? response.errors.join(', ') : '') });
    }
    setLoading(false);
  };

  // Hiển thị trạng thái tải ban đầu
  if (loading && settings.length === 0 && !message) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-700">Đang tải cấu hình hệ thống gợi ý...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 w-full max-w-3xl">
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

        {settings.length === 0 && !loading && message?.type === 'error' ? (
          <div className="text-center text-red-600 font-medium">
            <p>Không thể tải cấu hình. Vui lòng kiểm tra kết nối API hoặc thử lại.</p>
            <p className="text-sm text-red-500 mt-2">{message.text}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
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
                      value={formState[setting.key] ? '1' : '0'} // Convert boolean to '1' or '0' for select
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
    </div>
  );
};

// Loại bỏ getServerSideProps vì bạn muốn Client-Side Rendering cho việc tải dữ liệu ban đầu
// export const getServerSideProps: GetServerSideProps<RecommenderSettingsPageProps> = async (context) => {
//   // ... (logic cũ của getServerSideProps) ...
// };

export default RecommenderSettingsPage;
