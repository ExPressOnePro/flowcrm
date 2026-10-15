<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified', 'organization'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('customers', CustomerController::class);
    Route::post('customers/{customer}/contacts', [ContactController::class, 'store'])
        ->name('customers.contacts.store');
    Route::put('customers/{customer}/contacts/{contact}', [ContactController::class, 'update'])
        ->name('customers.contacts.update');
    Route::delete('customers/{customer}/contacts/{contact}', [ContactController::class, 'destroy'])
        ->name('customers.contacts.destroy');

    Route::resource('leads', LeadController::class);
    Route::post('leads/{lead}/convert', [LeadController::class, 'convert'])
        ->name('leads.convert');

    Route::resource('deals', DealController::class);
    Route::patch('deals/{deal}/stage', [DealController::class, 'updateStage'])
        ->name('deals.stage');

    Route::resource('tasks', TaskController::class);
    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])
        ->name('tasks.complete');

    Route::resource('invoices', InvoiceController::class)->except(['edit', 'update']);
    Route::post('invoices/{invoice}/send', [InvoiceController::class, 'send'])
        ->name('invoices.send');
    Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'storePayment'])
        ->name('invoices.payments.store');

    Route::inertia('employees', 'placeholders/coming-soon')->name('employees.index');
    Route::inertia('settings/organization', 'placeholders/coming-soon')
        ->name('settings.organization');
});

require __DIR__.'/settings.php';
