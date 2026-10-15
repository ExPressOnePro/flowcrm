<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealController;
use App\Http\Controllers\Documents\DocumentController;
use App\Http\Controllers\Documents\DocumentTypeController;
use App\Http\Controllers\Fleet\BranchController;
use App\Http\Controllers\Fleet\DriverController;
use App\Http\Controllers\Fleet\OdometerReadingController;
use App\Http\Controllers\Fleet\VehicleController;
use App\Http\Controllers\Fleet\VehicleCouplingController;
use App\Http\Controllers\Fleet\VehicleStatusController;
use App\Http\Controllers\Fleet\VehicleTypeController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\Waybills\WaybillController;
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
    Route::get('vehicles/{vehicle}/timeline', [VehicleController::class, 'timeline'])
        ->withTrashed()
        ->name('vehicles.timeline');
    Route::get('vehicles/{vehicle}/activity', [VehicleController::class, 'activity'])
        ->withTrashed()
        ->name('vehicles.activity');
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

    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::get('vehicles/{vehicle}/documents', [DocumentController::class, 'forVehicle'])
        ->withTrashed()
        ->name('vehicles.documents.index');
    Route::post('vehicles/{vehicle}/documents', [DocumentController::class, 'store'])
        ->name('vehicles.documents.store');
    Route::put('documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::post('documents/{document}/archive', [DocumentController::class, 'archive'])->name('documents.archive');
    Route::post('documents/{document}/files', [DocumentController::class, 'attachFiles'])->name('documents.files.store');
    Route::get('documents/{document}/files/{file}', [DocumentController::class, 'file'])->name('documents.files.show');

    Route::get('fleet/document-types', [DocumentTypeController::class, 'index'])->name('document-types.index');
    Route::post('fleet/document-types', [DocumentTypeController::class, 'store'])->name('document-types.store');
    Route::put('fleet/document-types/{document_type}', [DocumentTypeController::class, 'update'])->name('document-types.update');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('notifications/{notification}/open', [NotificationController::class, 'open'])->name('notifications.open');

    Route::get('drivers', [DriverController::class, 'index'])->name('drivers.index');
    Route::post('drivers', [DriverController::class, 'store'])->name('drivers.store');
    Route::get('drivers/{driver}', [DriverController::class, 'show'])->name('drivers.show');
    Route::put('drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
    Route::get('drivers/{driver}/documents', [DocumentController::class, 'forDriver'])->name('drivers.documents.index');
    Route::post('drivers/{driver}/documents', [DocumentController::class, 'storeForDriver'])->name('drivers.documents.store');
    Route::get('drivers/{driver}/waybills', [WaybillController::class, 'forDriver'])->name('drivers.waybills.index');

    Route::get('waybills', [WaybillController::class, 'index'])->name('waybills.index');
    Route::get('waybills/create', [WaybillController::class, 'create'])->name('waybills.create');
    Route::post('waybills', [WaybillController::class, 'store'])->name('waybills.store');
    Route::get('waybills/{waybill}', [WaybillController::class, 'show'])->name('waybills.show');
    Route::get('waybills/{waybill}/edit', [WaybillController::class, 'edit'])->name('waybills.edit');
    Route::put('waybills/{waybill}', [WaybillController::class, 'update'])->name('waybills.update');
    Route::post('waybills/{waybill}/issue', [WaybillController::class, 'issue'])->name('waybills.issue');
    Route::post('waybills/{waybill}/close', [WaybillController::class, 'close'])->name('waybills.close');
    Route::post('waybills/{waybill}/cancel', [WaybillController::class, 'cancel'])->name('waybills.cancel');
    Route::get('vehicles/{vehicle}/waybills', [WaybillController::class, 'forVehicle'])
        ->withTrashed()
        ->name('vehicles.waybills.index');

    Route::get('analytics', AnalyticsController::class)->name('analytics');

    // Fleet modules scheduled for later stages; routes exist so navigation is stable.
    Route::middleware('can:vehicles.view')->group(function () {
        Route::inertia('operations', 'placeholders/module', ['module' => 'Operations history', 'stage' => 6])
            ->name('operations.index');
        Route::inertia('maintenance', 'placeholders/module', ['module' => 'Maintenance', 'stage' => 7])
            ->name('maintenance.index');
    });

    Route::inertia('employees', 'placeholders/coming-soon')->name('employees.index');
    Route::inertia('settings/organization', 'placeholders/coming-soon')
        ->name('settings.organization');
});

require __DIR__.'/settings.php';
