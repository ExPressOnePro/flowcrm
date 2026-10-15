<?php

namespace Tests\Feature;

use App\Enums\DealStatus;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DealTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_gets_default_pipeline_with_stages(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->where('is_default', true)
            ->first();

        $this->assertNotNull($pipeline);
        $this->assertSame(6, $pipeline->stages()->count());
    }

    public function test_users_can_view_deal_board(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();
        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->firstOrFail();
        $stage = $pipeline->stages()->orderBy('position')->firstOrFail();

        Deal::factory()->create([
            'organization_id' => $organization->id,
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $stage->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'title' => 'Website Redesign',
        ]);

        $this->actingAs($user)
            ->get(route('deals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('deals/index')
                ->has('columns', 6)
            );
    }

    public function test_users_can_create_a_deal(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();
        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->firstOrFail();
        $stage = $pipeline->stages()->orderBy('position')->firstOrFail();

        $response = $this->actingAs($user)->post(route('deals.store'), [
            'title' => 'ERP Integration',
            'value' => 12000,
            'currency' => 'EUR',
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $stage->id,
            'assigned_to' => $user->id,
        ]);

        $deal = Deal::query()->firstOrFail();

        $response->assertRedirect(route('deals.show', $deal));
        $this->assertDatabaseHas('deals', [
            'title' => 'ERP Integration',
            'pipeline_stage_id' => $stage->id,
            'status' => DealStatus::Open->value,
        ]);
    }

    public function test_users_can_move_deal_between_stages(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();
        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $newStage = $pipeline->stages()->where('name', 'New')->firstOrFail();
        $proposal = $pipeline->stages()->where('name', 'Proposal')->firstOrFail();
        $won = $pipeline->stages()->where('name', 'Won')->firstOrFail();

        $deal = Deal::factory()->create([
            'organization_id' => $organization->id,
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $newStage->id,
            'created_by' => $user->id,
            'status' => DealStatus::Open,
        ]);

        $this->actingAs($user)
            ->patch(route('deals.stage', $deal), [
                'pipeline_stage_id' => $proposal->id,
            ])
            ->assertRedirect();

        $this->assertSame($proposal->id, $deal->fresh()->pipeline_stage_id);
        $this->assertSame(50, $deal->fresh()->probability);
        $this->assertSame(DealStatus::Open, $deal->fresh()->status);

        $this->actingAs($user)
            ->patch(route('deals.stage', $deal), [
                'pipeline_stage_id' => $won->id,
            ])
            ->assertRedirect();

        $this->assertSame(DealStatus::Won, $deal->fresh()->status);
        $this->assertNotNull($deal->fresh()->closed_at);
    }

    public function test_deals_are_isolated_by_organization(): void
    {
        $alpha = createUserWithOrganization([], ['name' => 'Alpha']);
        $beta = createUserWithOrganization([], ['name' => 'Beta']);

        $alphaOrgId = $alpha->organizations()->firstOrFail()->id;
        $betaOrgId = $beta->organizations()->firstOrFail()->id;

        $alphaPipeline = Pipeline::withoutGlobalScopes()
            ->where('organization_id', $alphaOrgId)
            ->firstOrFail();
        $betaPipeline = Pipeline::withoutGlobalScopes()
            ->where('organization_id', $betaOrgId)
            ->firstOrFail();

        Deal::factory()->create([
            'organization_id' => $alphaPipeline->organization_id,
            'pipeline_id' => $alphaPipeline->id,
            'pipeline_stage_id' => $alphaPipeline->stages()->withoutGlobalScopes()->firstOrFail()->id,
            'created_by' => $alpha->id,
            'title' => 'Alpha Deal',
        ]);

        Deal::factory()->create([
            'organization_id' => $betaPipeline->organization_id,
            'pipeline_id' => $betaPipeline->id,
            'pipeline_stage_id' => $betaPipeline->stages()->withoutGlobalScopes()->firstOrFail()->id,
            'created_by' => $beta->id,
            'title' => 'Beta Deal',
        ]);

        $this->actingAs($alpha)
            ->get(route('deals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('columns.0.deals.0.title', 'Alpha Deal')
            );
    }
}
