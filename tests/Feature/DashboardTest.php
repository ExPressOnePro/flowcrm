<?php

namespace Tests\Feature;

use App\Enums\DealStatus;
use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Payment;
use App\Models\Pipeline;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = createUserWithOrganization();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_includes_analytics_props()
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $stage = $pipeline->stages()->orderBy('position')->firstOrFail();

        Deal::factory()->create([
            'organization_id' => $organization->id,
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $stage->id,
            'customer_id' => $customer->id,
            'created_by' => $user->id,
            'status' => DealStatus::Open,
            'title' => 'Website Redesign',
            'value' => 8500,
        ]);

        Payment::factory()->create([
            'organization_id' => $organization->id,
            'customer_id' => $customer->id,
            'invoice_id' => \App\Models\Invoice::factory()->create([
                'organization_id' => $organization->id,
                'customer_id' => $customer->id,
                'created_by' => $user->id,
            ])->id,
            'created_by' => $user->id,
            'amount' => 1200,
            'paid_at' => now(),
        ]);

        Task::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'title' => 'Call ACME',
            'status' => TaskStatus::Open,
            'due_at' => now()->setTime(10, 0),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard')
                ->where('stats.customers', 1)
                ->where('stats.activeDeals', 1)
                ->where('stats.pipelineValue', 8500)
                ->where('stats.revenue', 1200)
                ->has('revenueChart', 12)
                ->has('pipeline')
                ->has('recentDeals', 1)
                ->where('recentDeals.0.title', 'Website Redesign')
                ->has('tasks', 1)
                ->where('tasks.0.title', 'Call ACME')
            );
    }
}
