<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const PERMISSIONS = [
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

        'invoices.view',
        'invoices.create',
        'invoices.update',
        'invoices.delete',
        'invoices.send',

        'payments.view',
        'payments.create',
        'payments.delete',

        'employees.view',
        'employees.invite',
        'employees.update',
        'employees.disable',

        'roles.view',
        'roles.manage',

        'settings.view',
        'settings.update',
    ];

    /**
     * Seed the application's global permissions.
     */
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }
    }
}
