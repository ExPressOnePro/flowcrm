<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function __invoke(Request $request, DashboardService $dashboard): Response
    {
        abort_unless($request->user()?->can('analytics.view'), 403);

        return Inertia::render('analytics/index', [
            'stats' => $dashboard->statistics(),
            'pipeline' => $dashboard->pipeline(),
            'revenueChart' => $dashboard->revenue(),
            'recentDeals' => $dashboard->recentDeals(),
            'tasks' => $dashboard->todayTasks(),
        ]);
    }
}
