<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Resolves which branches a user may see inside the current organization.
 *
 * Users with `fleet.view_all_branches` see every branch. Everyone else is limited
 * to the branch assigned on their organization membership; without one they see
 * nothing (fail closed).
 */
class BranchAccess
{
    /**
     * @var array<string, list<int>|null>
     */
    private array $cache = [];

    public function __construct(
        private CurrentOrganization $currentOrganization,
    ) {}

    /**
     * @return list<int>|null null means "all branches"
     */
    public function visibleBranchIds(User $user): ?array
    {
        $key = $this->currentOrganization->id().':'.$user->id;

        if (array_key_exists($key, $this->cache)) {
            return $this->cache[$key];
        }

        if ($user->can('fleet.view_all_branches')) {
            return $this->cache[$key] = null;
        }

        $branchId = $this->assignedBranchId($user);

        return $this->cache[$key] = $branchId === null ? [] : [$branchId];
    }

    public function canSeeBranch(User $user, ?int $branchId): bool
    {
        $visible = $this->visibleBranchIds($user);

        if ($visible === null) {
            return true;
        }

        return $branchId !== null && in_array($branchId, $visible, true);
    }

    public function assignedBranchId(User $user): ?int
    {
        $organizationId = $this->currentOrganization->id();

        if ($organizationId === null) {
            return null;
        }

        $branchId = DB::table('organization_user')
            ->where('organization_id', $organizationId)
            ->where('user_id', $user->id)
            ->value('branch_id');

        return $branchId === null ? null : (int) $branchId;
    }

    public function flush(): void
    {
        $this->cache = [];
    }
}
