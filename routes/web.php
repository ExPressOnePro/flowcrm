<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\Fleet\BranchController;
use App\Http\Controllers\Fleet\OdometerReadingController;
use App\Http\Controllers\Fleet\VehicleController;
use App\Http\Controllers\Fleet\VehicleCouplingController;
use App\Http\Controllers\Fleet\VehicleStatusController;
use App\Http\Controllers\Fleet\VehicleTypeController;
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

    Route::resource('vehicles', VehicleController::class)->withTrashed(['show']);
    Route::post('vehicles/{vehicle}/restore', [VehicleController::class, 'restore'])
        ->withTrashed()
        ->name('vehicles.restore');
    Route::post('vehicles/{vehicle}/status', VehicleStatusController::class)
        ->name('vehicles.status');
    Route::post('vehicles/{vehicle}/couplings', [VehicleCouplingController::class, 'store'])
        ->name('vehicles.couplings.store');
    Route::post('vehicles/{vehicle}/couplings/{coupling}/uncouple', [VehicleCouplingController::class, 'destroy'])
        ->name('vehicles.couplings.uncouple');
    Route::post('vehicles/{vehicle}/odometer', [OdometerReadingController::class, 'store'])
        ->name('vehicles.odometer.store');

    Route::get('fleet/branches', [BranchController::class, 'index'])->name('branches.index');
    Route::post('fleet/branches', [BranchController::class, 'store'])->name('branches.store');
    Route::put('fleet/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');

    Route::get('fleet/vehicle-types', [VehicleTypeController::class, 'index'])->name('vehicle-types.index');
    Route::post('fleet/vehicle-types', [VehicleTypeController::class, 'store'])->name('vehicle-types.store');
    Route::put('fleet/vehicle-types/{vehicle_type}', [VehicleTypeController::class, 'update'])->name('vehicle-types.update');

    Route::inertia('employees', 'placeholders/coming-soon')->name('employees.index');
    Route::inertia('settings/organization', 'placeholders/coming-soon')
        ->name('settings.organization');
});

require __DIR__.'/settings.php';
