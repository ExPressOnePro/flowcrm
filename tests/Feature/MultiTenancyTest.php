<?php

namespace Tests\Feature;

use App\Models\Concerns\BelongsToOrganization;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tenant_widgets', function ($table) {
            $table->id();
            $table->foreignId('organization_id')->constrained();
            $table->string('name');
            $table->timestamps();
        });
    }

    public function test_organization_scope_isolates_records_by_current_organization(): void
    {
        $alphaUser = createUserWithOrganization([], ['name' => 'Alpha Org']);
        $alphaOrg = $alphaUser->organizations()->firstOrFail();

        $betaUser = createUserWithOrganization([], ['name' => 'Beta Org']);
        $betaOrg = $betaUser->organizations()->firstOrFail();

        TenantWidget::query()->create([
            'organization_id' => $alphaOrg->id,
            'name' => 'Alpha Widget',
        ]);

        TenantWidget::query()->create([
            'organization_id' => $betaOrg->id,
            'name' => 'Beta Widget',
        ]);

        app(CurrentOrganization::class)->set($alphaOrg);

        $this->assertSame(
            ['Alpha Widget'],
            TenantWidget::query()->pluck('name')->all(),
        );

        app(CurrentOrganization::class)->set($betaOrg);

        $this->assertSame(
            ['Beta Widget'],
            TenantWidget::query()->pluck('name')->all(),
        );
    }

    public function test_demo_owner_has_owner_role_in_organization(): void
    {
        $this->seed();

        $owner = \App\Models\User::query()
            ->where('email', 'vlad@flowcrm.test')
            ->firstOrFail();

        $organization = Organization::query()
            ->where('slug', 'flow-digital-agency')
            ->firstOrFail();

        setPermissionsTeamId($organization->id);

        $this->assertTrue($owner->hasRole('Owner'));
        $this->assertTrue($owner->can('customers.view'));
    }
}

class TenantWidget extends Model
{
    use BelongsToOrganization;

    protected $table = 'tenant_widgets';

    protected $guarded = [];
}
