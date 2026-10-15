<?php

namespace App\Actions\Organizations;

use App\Models\Organization;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class EnsureOrganizationRoles
{
    /**
     * @var array<string, list<string>|string>
     */
    public const ROLE_PERMISSIONS = [
        'Owner' => '*',
        'Admin' => '*',
        'Sales Manager' => [
            'dashboard.view',
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',
            'contacts.view',
            'contacts.create',
            'contacts.update',
            'contacts.delete',
            'leads.view',
            'leads.create',
            'leads.update',
            'leads.delete',
            'leads.convert',
            'deals.view',
            'deals.create',
            'deals.update',
            'deals.delete',
            'deals.change_stage',
            'tasks.view',
            'tasks.view_all',
            'tasks.create',
            'tasks.update',
            'tasks.delete',
            'tasks.assign',
        ],
        'Sales' => [
            'dashboard.view',
            'customers.view',
            'customers.create',
            'contacts.view',
            'contacts.create',
            'contacts.update',
            'contacts.delete',
            'leads.view',
            'leads.create',
            'leads.update',
            'leads.convert',
            'deals.view',
            'deals.create',
            'deals.update',
            'deals.change_stage',
            'tasks.view',
            'tasks.create',
            'tasks.update',
        ],
        'Accountant' => [
            'dashboard.view',
            'customers.view',
            'invoices.view',
            'invoices.create',
            'invoices.update',
            'invoices.delete',
            'invoices.send',
            'payments.view',
            'payments.create',
            'payments.delete',
        ],
        'Employee' => [
            'dashboard.view',
            'tasks.view',
            'tasks.create',
            'tasks.update',
        ],
    ];

    public function execute(Organization $organization): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($organization->id);

        $allPermissions = Permission::query()
            ->where('guard_name', 'web')
            ->get();

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissionNames) {
            $role = Role::query()->firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
                'organization_id' => $organization->id,
            ]);

            if ($permissionNames === '*') {
                $role->syncPermissions($allPermissions);

                continue;
            }

            $role->syncPermissions(
                $allPermissions->whereIn('name', $permissionNames)->values(),
            );
        }
    }
}
