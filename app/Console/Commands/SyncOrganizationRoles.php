<?php

namespace App\Console\Commands;

use App\Actions\Fleet\EnsureDefaultFleetCatalog;
use App\Actions\Organizations\EnsureOrganizationRoles;
use App\Models\Organization;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Spatie\Permission\PermissionRegistrar;

#[Signature('roles:sync')]
#[Description('Create missing permissions, roles and default fleet catalogs for every organization (idempotent).')]
class SyncOrganizationRoles extends Command
{
    public function handle(
        EnsureOrganizationRoles $ensureOrganizationRoles,
        EnsureDefaultFleetCatalog $ensureDefaultFleetCatalog,
    ): int {
        (new RolesAndPermissionsSeeder)->run();

        $registrar = app(PermissionRegistrar::class);

        Organization::query()->orderBy('id')->each(function (Organization $organization) use ($ensureOrganizationRoles, $ensureDefaultFleetCatalog): void {
            $ensureOrganizationRoles->execute($organization);
            $ensureDefaultFleetCatalog->execute($organization);

            $this->components->info("Synced: {$organization->name}");
        });

        $registrar->setPermissionsTeamId(null);
        $registrar->forgetCachedPermissions();

        return self::SUCCESS;
    }
}
