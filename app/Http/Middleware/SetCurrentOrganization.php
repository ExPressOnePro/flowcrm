<?php

namespace App\Http\Middleware;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentOrganization
{
    public function __construct(
        private CurrentOrganization $currentOrganization,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        $organizationId = $request->session()->get('current_organization_id');

        $organizationQuery = $user->organizations()->orderBy('organizations.name');

        $organization = null;

        if ($organizationId) {
            $organization = (clone $organizationQuery)
                ->where('organizations.id', $organizationId)
                ->first();
        }

        $organization ??= $organizationQuery->first();

        if ($organization === null) {
            abort(403, 'No organization available for this account.');
        }

        $request->session()->put('current_organization_id', $organization->id);

        $this->currentOrganization->set($organization);
        setPermissionsTeamId($organization->id);

        return $next($request);
    }
}
