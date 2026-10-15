<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Customer;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_view_customers_index(): void
    {
        $user = createUserWithOrganization();
        app(CurrentOrganization::class)->set($user->organizations()->firstOrFail());

        Customer::factory()->create([
            'organization_id' => $user->organizations()->firstOrFail()->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'name' => 'Acme Corp',
        ]);

        $this->actingAs($user)
            ->get(route('customers.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('customers/index')
                ->has('customers.data', 1)
            );
    }

    public function test_users_can_create_a_customer(): void
    {
        $user = createUserWithOrganization();

        $response = $this->actingAs($user)->post(route('customers.store'), [
            'type' => 'company',
            'name' => 'Universum Group',
            'company_name' => 'Universum Group',
            'email' => 'hello@universum.test',
            'phone' => '+373 60 111 111',
            'status' => 'active',
            'assigned_to' => $user->id,
        ]);

        $customer = Customer::query()->firstOrFail();

        $response->assertRedirect(route('customers.show', $customer));
        $this->assertDatabaseHas('customers', [
            'name' => 'Universum Group',
            'created_by' => $user->id,
            'organization_id' => $user->organizations()->firstOrFail()->id,
        ]);
    }

    public function test_users_can_add_a_contact_to_a_customer(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(
            route('customers.contacts.store', $customer),
            [
                'first_name' => 'Maria',
                'last_name' => 'Accounting',
                'position' => 'Accountant',
                'email' => 'maria@universum.test',
                'is_primary' => true,
            ],
        );

        $response->assertRedirect(route('customers.show', $customer));
        $this->assertDatabaseHas('contacts', [
            'customer_id' => $customer->id,
            'first_name' => 'Maria',
            'is_primary' => true,
            'organization_id' => $organization->id,
        ]);
    }

    public function test_customers_are_isolated_by_organization(): void
    {
        $alpha = createUserWithOrganization([], ['name' => 'Alpha']);
        $beta = createUserWithOrganization([], ['name' => 'Beta']);

        Customer::factory()->create([
            'organization_id' => $alpha->organizations()->firstOrFail()->id,
            'created_by' => $alpha->id,
            'name' => 'Alpha Customer',
        ]);

        Customer::factory()->create([
            'organization_id' => $beta->organizations()->firstOrFail()->id,
            'created_by' => $beta->id,
            'name' => 'Beta Customer',
        ]);

        $this->actingAs($alpha)
            ->get(route('customers.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('customers.data', 1)
                ->where('customers.data.0.name', 'Alpha Customer')
            );
    }

    public function test_users_without_permission_cannot_create_customers(): void
    {
        $owner = createUserWithOrganization();
        $organization = $owner->organizations()->firstOrFail();

        $employee = \App\Models\User::factory()->create([
            'email' => 'no-create@example.com',
        ]);

        $organization->users()->attach($employee->id, [
            'status' => 'active',
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($organization->id);
        $employee->assignRole('Employee');

        $this->actingAs($employee)
            ->post(route('customers.store'), [
                'type' => 'individual',
                'name' => 'Blocked',
                'status' => 'active',
            ])
            ->assertForbidden();
    }

    public function test_updating_primary_contact_clears_previous_primary(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $primary = Contact::factory()->forCustomer($customer)->primary()->create();
        $secondary = Contact::factory()->forCustomer($customer)->create();

        $this->actingAs($user)->put(
            route('customers.contacts.update', [$customer, $secondary]),
            [
                'first_name' => $secondary->first_name,
                'last_name' => $secondary->last_name,
                'is_primary' => true,
            ],
        )->assertRedirect(route('customers.show', $customer));

        $this->assertFalse($primary->fresh()->is_primary);
        $this->assertTrue($secondary->fresh()->is_primary);
    }
}
