<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanExpiredReservedStocks extends Command
{

    

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reserved_stocks:clean';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Xoá các bản ghi reserved_stocks đã hết hạn và trả lại số lượng stock nếu cần';

    /**
     * Execute the console command.
     * @return void
     */

    public function handle()
    {
        $expiredReservedStocks = ReservedStock::where('expires_at', '<', Carbon::now())->get();

        foreach ($expiredReservedStocks as $reservedStock) {
            // Trả lại số lượng stock nếu cần
            $reservedStock->product->increment('stock', $reservedStock->quantity);
            
            // Xoá bản ghi đã hết hạn
            $reservedStock->delete();
        }

        $this->info('Đã xoá các bản ghi reserved_stocks hết hạn.');
    }
}
