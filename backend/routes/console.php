<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send payment due in-app notifications every Monday at 08:00
Schedule::command('notifications:payment-due')->weekly()->mondays()->at('08:00');
