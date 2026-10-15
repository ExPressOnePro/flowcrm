<?php

namespace App\Http\Controllers\Fleet;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\BranchRequest;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Branch::class);

        return Inertia::render('fleet/branches/index', [
            'branches' => Branch::query()
                ->withCount('vehicles')
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (Branch $branch) => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'city' => $branch->city,
                    'address' => $branch->address,
                    'is_active' => $branch->is_active,
                    'vehicles_count' => $branch->vehicles_count,
                ]),
        ]);
    }

    public function store(BranchRequest $request): RedirectResponse
    {
        Branch::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Branch created.')]);

        return back();
    }

    public function update(BranchRequest $request, Branch $branch): RedirectResponse
    {
        $branch->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Branch updated.')]);

        return back();
    }
}
