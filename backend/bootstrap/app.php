<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Console\Commands\CleanExpiredReservedStocks;
use App\Console\Commands\RemoveExpiredCartItems;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'jwt.auth'    => \Tymon\JWTAuth\Http\Middleware\Authenticate::class,

        ]);    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->withCommands([
        CleanExpiredReservedStocks::class,
    ])
    ->withSchedule(function (Schedule $schedule){
        $schedule->command(CleanExpiredReservedStocks::class)->everyFiveMinutes(); 
        $schedule->command(RemoveExpiredCartItems::class)->everyFiveMinutes();
        
    })
    ->create();
