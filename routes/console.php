<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Hourly so each organization gets reminders after 7:00 in its own timezone; repeats are no-ops.
Schedule::command('documents:notify-expiring')->hourly()->withoutOverlapping();
