<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RecommenderPerformanceService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process; // Đảm bảo đã cài đặt symfony/process

class RecommenderPerformanceController extends Controller
{
     protected $performanceService;

    public function __construct(RecommenderPerformanceService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    public function getPerformanceData()
    {   
        try {

        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
        $data = $this->performanceService->getLatest10PerformancesWithComparison(); // Gọi hàm mới

        // Chuyển đổi Collection các đối tượng Eloquent Model thành một mảng các mảng
        // để đảm bảo tất cả thuộc tính được serialize trong JSON.
        $latest10PerformancesArray = $data['latest_10_performances']->map(function ($performance) {
            return $performance->toArray();
        })->all(); // Dùng all() để chuyển Collection thành PHP array

        return response()->json([
            'status' => 'success',
            'latest_10_performances' => $latest10PerformancesArray, // Danh sách 10 bản ghi đầy đủ
            'comparison' => $data['comparison'] // Kết quả so sánh giữa bản mới nhất và bản ngay trước đó
        ]);
    }

    public function storePerformance(Request $request)
    {   

        try {
            $validatedData = $request->validate([
                'precision_at_n' => 'required|numeric',
                'recall_at_n' => 'required|numeric',
                'ndcg_at_n' => 'required|numeric',
                'map' => 'required|numeric',
                'top_n_recommendations' => 'required|integer',
                'top_k' => 'required|integer',
                'cosine_threshold' => 'required|numeric',
                'hybrid_alpha' => 'required|numeric',
                'batch_size' => 'required|integer',
                'product_blacklist' => 'nullable|string',
                'optimal_cold_start_threshold' => 'required|integer',
                'optimal_frequency_decay_factor' => 'required|numeric',
                'optimal_final_hybrid_threshold' => 'required|numeric',
            ]);
            
            if (isset($validatedData['product_blacklist']) && is_string($validatedData['product_blacklist'])) {
                
                        $decodedBlacklist = json_decode($validatedData['product_blacklist'], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $validatedData['product_blacklist'] = $decodedBlacklist;
                        
                }

                $performance = $this->performanceService->recordPerformance($validatedData);

                if ($performance) {
                    return response()->json(['message' => 'Hiệu suất mô hình đã được ghi lại thành công.', 'status' => 'success' ,'data' => $performance->toArray()], 201);
                } else {
                    return response()->json(['message' => 'Không thể ghi hiệu suất mô hình.','status' => 'error'], 500);
                }
            }
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }

     public function runPythonScript(string $scriptName, array $args = []): array
    {
            Log::info('Base Path: ' . base_path());

        // Điều chỉnh đường dẫn: Sử dụng dấu gạch chéo thuận và nối đúng tên script
        // Giả định các script Python của bạn nằm trong thư mục 'backend/scripts'
        $scriptPath = base_path('scripts/' . $scriptName);
        // Kiểm tra xem tệp script có tồn tại không
        if (!file_exists($scriptPath)) {
            Log::error('Tệp Python không tìm thấy: ' . $scriptPath);
            return [
                'success' => false,
                'output' => null,
                'error' => 'Tệp Python không tồn tại tại: ' . $scriptPath,
                'exit_code' => null
            ];
        }
        $pythonExecutable = 'C:\\Users\\PC\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';
        $command = [$pythonExecutable, $scriptPath];
        $command = array_merge($command, $args); // Thêm các đối số

        try {
            $process = new Process($command);
            $process->setTimeout(3600); // Đặt thời gian chờ là 1 giờ (có thể điều chỉnh tùy theo độ phức tạp của script)

            Log::info('Đang chạy script Python: ' . implode(' ', $command));

            $process->run();

            // Kiểm tra xem lệnh đã chạy thành công chưa
            if ($process->isSuccessful()) {
                Log::info('Script Python chạy thành công.', ['output' => $process->getOutput()]);
                return [
                    'success' => true,
                    'output' => $process->getOutput(),
                    'error' => null,
                    'exit_code' => $process->getExitCode()
                ];
            } else {
                Log::error('Script Python chạy thất bại.', [
                    'command' => implode(' ', $command), // Thêm command vào log để debug dễ hơn
                    'output' => $process->getOutput(),
                    'error' => $process->getErrorOutput(),
                    'exit_code' => $process->getExitCode()
                ]);
                return [
                    'success' => false,
                    'output' => $process->getOutput(),
                    'error' => $process->getErrorOutput(),
                    'exit_code' => $process->getExitCode()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Lỗi khi thực thi script Python: ' . $e->getMessage(), ['exception' => $e]);
            return [
                'success' => false,
                'output' => null,
                'error' => 'Ngoại lệ khi thực thi script Python: ' . $e->getMessage(),
                'exit_code' => null
            ];
        }
    }

    // public function runPythonScript(string $scriptName, array $args = []): array
    // {
    //     Log::info('Base Path: ' . base_path());

    //     // Điều chỉnh đường dẫn: Sử dụng dấu gạch chéo thuận và nối đúng tên script
    //     // Giả định các script Python của bạn nằm trong thư mục 'backend/scripts'
    //     $scriptPath = base_path('scripts/' . $scriptName);

    //     // Kiểm tra xem tệp script có tồn tại không
    //     if (!file_exists($scriptPath)) {
    //         Log::error('Tệp Python không tìm thấy: ' . $scriptPath);
    //         return [
    //             'success' => false,
    //             'output' => null,
    //             'error' => 'Tệp Python không tồn tại tại: ' . $scriptPath,
    //             'exit_code' => null
    //         ];
    //     }

    //     // Định nghĩa đường dẫn chính xác đến Python executable
    //     $pythonExecutable = 'C:\\Users\\PC\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';

    //     // Xây dựng chuỗi lệnh hoàn chỉnh
    //     // escapeshellarg() để đảm bảo an toàn và xử lý khoảng trắng trong đường dẫn/đối số
    //     $commandString = escapeshellarg($pythonExecutable) . ' ' . escapeshellarg($scriptPath);
    //     foreach ($args as $arg) {
    //         $commandString .= ' ' . escapeshellarg($arg);
    //     }

    //     try {
    //         $descriptorspec = [
    //             0 => ["pipe", "r"],  // stdin - tiến trình con có thể đọc từ đây
    //             1 => ["pipe", "w"],  // stdout - tiến trình con ghi vào đây
    //             2 => ["pipe", "w"]   // stderr - tiến trình con ghi lỗi vào đây
    //         ];

    //         // Thư mục làm việc hiện tại cho tiến trình con.
    //         // Có thể đặt là null để dùng thư mục hiện tại của PHP,
    //         // hoặc base_path() để chắc chắn nó chạy từ thư mục gốc của dự án Laravel.
    //         $cwd = base_path(); // Đặt thư mục làm việc của Python script là thư mục gốc Laravel

    //         $env = null; // Biến môi trường cho tiến trình con. Đặt null để kế thừa từ tiến trình cha (PHP).
    //                     // Nếu cần truyền biến môi trường cụ thể, bạn có thể truyền mảng ở đây.
    //                     // Ví dụ: ['PYTHONIOENCODING' => 'utf-8']

    //         Log::info('Đang chạy script Python (proc_open): ' . $commandString);

    //         // Khởi tạo tiến trình
    //         $process = proc_open($commandString, $descriptorspec, $pipes, $cwd, $env);

    //         if (is_resource($process)) {
    //             // Đóng stdin ngay lập tức nếu không cần truyền dữ liệu vào Python script
    //             fclose($pipes[0]);

    //             // Đọc đầu ra chuẩn (stdout) và lỗi chuẩn (stderr)
    //             $output = stream_get_contents($pipes[1]);
    //             fclose($pipes[1]);
    //             $errorOutput = stream_get_contents($pipes[2]);
    //             fclose($pipes[2]);

    //             // Đóng tiến trình và lấy mã thoát
    //             $return_code = proc_close($process);

    //             if ($return_code === 0) {
    //                 Log::info('Script Python chạy thành công (proc_open).', ['output' => $output]);
    //                 return [
    //                     'success' => true,
    //                     'output' => $output,
    //                     'error' => null,
    //                     'exit_code' => $return_code
    //                 ];
    //             } else {
    //                 Log::error('Script Python chạy thất bại (proc_open).', [
    //                     'command' => $commandString,
    //                     'output' => $output,
    //                     'error' => $errorOutput,
    //                     'exit_code' => $return_code
    //                 ]);
    //                 return [
    //                     'success' => false,
    //                     'output' => $output,
    //                     'error' => $errorOutput,
    //                     'exit_code' => $return_code
    //                 ];
    //             }
    //         } else {
    //             Log::error('Không thể mở tiến trình Python (proc_open).');
    //             return [
    //                 'success' => false,
    //                 'output' => null,
    //                 'error' => 'Không thể mở tiến trình Python.',
    //                 'exit_code' => null
    //             ];
    //         }
    //     } catch (\Exception $e) {
    //         Log::error('Lỗi khi thực thi script Python (proc_open): ' . $e->getMessage(), ['exception' => $e]);
    //         return [
    //             'success' => false,
    //             'output' => null,
    //             'error' => 'Ngoại lệ khi thực thi script Python: ' . $e->getMessage(),
    //             'exit_code' => null
    //         ];
    //     }
    // }
    public function executePythonScript(Request $request)
    {
        // Lấy tên script từ request, ví dụ: /run-python-script?name=my_script.py
        $scriptName = $request->input('name', 'Hello.py'); // Mặc định là 'Hybrid-Thesis-3.py'
        $args = $request->input('args', []); // Lấy đối số từ request, ví dụ: /run-python-script?name=test.py&args[]=hello&args[]=world

        // Đảm bảo $args là một mảng chuỗi
        if (!is_array($args)) {
            $args = [$args]; // Nếu chỉ có một đối số, chuyển nó thành mảng
        }
        $args = array_map('strval', $args); // Đảm bảo tất cả đối số là chuỗi

        $result = $this->runPythonScript($scriptName, $args);

        if ($result['success']) {
            return response()->json([
                'status' => 'success',
                'message' => 'Script Python đã được thực thi thành công.',
                'output' => $result['output']
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi khi thực thi script Python.',
                'error' => $result['error'],
                'output' => $result['output'], // Bao gồm cả output để debug
                'exit_code' => $result['exit_code']
            ], 500); // Mã lỗi HTTP 500 cho server error
        }
    }

}
