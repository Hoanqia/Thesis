<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CartService;

class RemoveExpiredCartItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cart:remove-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Xoá các sản phẩm trong giỏ hàng đã hết hạn';

    /**
     * Execute the console command.
     */
    protected $cartService;

    public function __construct(CartService $cartService)
    {
        parent::__construct();
        $this->cartService = $cartService;
    }

    public function handle()
    {
        $this->cartService->removeExpiredItems();
        $this->info('Đã xoá các sản phẩm hết hạn khỏi giỏ hàng.');
    }
}
