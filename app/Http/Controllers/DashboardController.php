<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Vehicle;
use App\Services\FleetDashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FleetDashboardService $dashboard): Response
    {
        $user = $request->user();

        abort_unless($user?->can('dashboard.view'), 403);

        $canViewFleet = Gate::allows('viewAny', Vehicle::class);
        $canViewDocuments = $canViewFleet && Gate::allows('viewAny', Document::class);

        return Inertia::render('dashboard', [
            'fleet' => $canViewFleet ? $dashboard->fleet($user) : null,
            'documents' => $canViewDocuments ? $dashboard->documents($user) : null,
            'attention' => $canViewFleet ? $dashboard->attention($user, $canViewDocuments) : [],
            'expiringDays' => Document::EXPIRING_DAYS,
            'tasks' => $user->can('tasks.view') ? $dashboard->myTasks($user) : [],
            'staleOdometerDays' => Vehicle::STALE_ODOMETER_DAYS,
            'can' => [
                'create_vehicle' => Gate::allows('create', Vehicle::class),
                'view_analytics' => $user->can('analytics.view'),
                'view_tasks' => $user->can('tasks.view'),
            ],
        ]);
    }
}
