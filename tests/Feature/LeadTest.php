<?php

namespace Tests\Feature;

use App\Enums\LeadStatus;
use App\Models\Customer;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_view_leads_index(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        Lead::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
        ]);

        $this->actingAs($user)
            ->get(route('leads.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('leads/index')
                ->has('leads.data', 1)
                ->where('leads.data.0.name', 'Jane Doe')
            );
    }

    public function test_users_can_create_a_lead(): void
    {
        $user = createUserWithOrganization();

        $response = $this->actingAs($user)->post(route('leads.store'), [
            'first_name' => 'Alex',
            'last_name' => 'Buyer',
            'company_name' => 'Nova Systems',
            'email' => 'alex@nova.test',
            'status' => 'new',
            'estimated_value' => 12000,
            'currency' => 'EUR',
            'assigned_to' => $user->id,
        ]);

        $lead = Lead::query()->firstOrFail();

        $response->assertRedirect(route('leads.show', $lead));
        $this->assertDatabaseHas('leads', [
            'first_name' => 'Alex',
            'company_name' => 'Nova Systems',
            'organization_id' => $user->organizations()->firstOrFail()->id,
        ]);
    }

    public function test_users_can_convert_a_lead_to_a_customer(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $lead = Lead::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'first_name' => 'Vlad',
            'last_name' => 'IT',
            'company_name' => 'Universum Group',
            'email' => 'vlad@universum.test',
            'phone' => '+373 60 222 222',
            'status' => LeadStatus::Qualified,
        ]);

        $response = $this->actingAs($user)
            ->post(route('leads.convert', $lead));

        $customer = Customer::query()->firstOrFail();

        $response->assertRedirect(route('customers.show', $customer));

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'Universum Group',
            'company_name' => 'Universum Group',
            'email' => 'vlad@universum.test',
        ]);

        $this->assertDatabaseHas('contacts', [
            'customer_id' => $customer->id,
            'first_name' => 'Vlad',
            'last_name' => 'IT',
            'is_primary' => true,
        ]);

        $this->assertTrue($lead->fresh()->isConverted());
        $this->assertSame($customer->id, $lead->fresh()->converted_customer_id);
        $this->assertNotNull($lead->fresh()->converted_deal_id);
        $this->assertDatabaseHas('deals', [
            'id' => $lead->fresh()->converted_deal_id,
            'customer_id' => $customer->id,
            'title' => 'Universum Group',
        ]);
    }

    public function test_converted_leads_cannot_be_converted_again(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $lead = Lead::factory()->converted()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'converted_customer_id' => $customer->id,
        ]);

        $this->actingAs($user)
            ->post(route('leads.convert', $lead))
            ->assertForbidden();
    }

    public function test_leads_are_isolated_by_organization(): void
    {
        $alpha = createUserWithOrganization([], ['name' => 'Alpha']);
        $beta = createUserWithOrganization([], ['name' => 'Beta']);

        Lead::factory()->create([
            'organization_id' => $alpha->organizations()->firstOrFail()->id,
            'created_by' => $alpha->id,
            'first_name' => 'Alpha',
            'last_name' => 'Lead',
        ]);

        Lead::factory()->create([
            'organization_id' => $beta->organizations()->firstOrFail()->id,
            'created_by' => $beta->id,
            'first_name' => 'Beta',
            'last_name' => 'Lead',
        ]);

        $this->actingAs($alpha)
            ->get(route('leads.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('leads.data', 1)
                ->where('leads.data.0.name', 'Alpha Lead')
            );
    }
}
