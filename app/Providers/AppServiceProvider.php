<?php

namespace App\Providers;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Driver;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Lead;
use App\Models\OdometerReading;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Task;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use App\Models\VehicleType;
use App\Models\Waybill;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(CurrentOrganization::class);
        $this->app->scoped(BranchAccess::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Relation::enforceMorphMap(self::MORPH_MAP);
    }

    /**
     * Stored in polymorphic `*_type` columns; renaming an alias requires a data migration.
     *
     * @var array<string, class-string<Model>>
     */
    public const MORPH_MAP = [
        'user' => User::class,
        'organization' => Organization::class,
        'customer' => Customer::class,
        'contact' => Contact::class,
        'lead' => Lead::class,
        'deal' => Deal::class,
        'pipeline' => Pipeline::class,
        'pipeline_stage' => PipelineStage::class,
        'task' => Task::class,
        'invoice' => Invoice::class,
        'invoice_item' => InvoiceItem::class,
        'payment' => Payment::class,
        'branch' => Branch::class,
        'vehicle_type' => VehicleType::class,
        'vehicle' => Vehicle::class,
        'vehicle_coupling' => VehicleCoupling::class,
        'vehicle_status_change' => VehicleStatusChange::class,
        'odometer_reading' => OdometerReading::class,
        'document_type' => DocumentType::class,
        'document' => Document::class,
        'document_file' => DocumentFile::class,
        'driver' => Driver::class,
        'waybill' => Waybill::class,
        'role' => Role::class,
        'permission' => Permission::class,
    ];

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
