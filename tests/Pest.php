<?php

use App\Actions\Organizations\CreateOrganization;
use App\Models\User;
use App\Support\CurrentOrganization;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
*/

function seedPermissions(): void
{
    (new RolesAndPermissionsSeeder)->run();
}

/**
 * @param  array<string, mixed>  $userAttributes
 * @param  array<string, mixed>  $organizationAttributes
 */
function createUserWithOrganization(
    array $userAttributes = [],
    array $organizationAttributes = [],
): User {
    seedPermissions();

    $user = User::factory()->create($userAttributes);

    $organization = app(CreateOrganization::class)->execute(
        $user,
        [
            'name' => $organizationAttributes['name'] ?? 'Test Organization',
            ...$organizationAttributes,
        ],
    );

    session(['current_organization_id' => $organization->id]);
    app(CurrentOrganization::class)->set($organization);

    return $user->fresh();
}
