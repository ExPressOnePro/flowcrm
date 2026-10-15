<?php

namespace App\Http\Controllers\Documents;

use App\Enums\DocumentSubject;
use App\Enums\VehicleCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\DocumentTypeRequest;
use App\Models\DocumentType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DocumentTypeController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', DocumentType::class);

        return Inertia::render('documents/types/index', [
            'types' => DocumentType::query()
                ->withCount(['documents' => fn ($query) => $query->active()])
                ->orderBy('subject')
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (DocumentType $type) => [
                    'id' => $type->id,
                    'subject' => $type->subject->value,
                    'name' => $type->name,
                    'has_expiry' => $type->has_expiry,
                    'is_mandatory' => $type->is_mandatory,
                    'vehicle_categories' => $type->vehicle_categories ?? [],
                    'is_active' => $type->is_active,
                    'documents_count' => $type->documents_count,
                ]),
            'subjects' => collect(DocumentSubject::cases())->map->value,
            'categories' => collect(VehicleCategory::cases())->map->value,
        ]);
    }

    public function store(DocumentTypeRequest $request): RedirectResponse
    {
        DocumentType::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document type created.')]);

        return back();
    }

    public function update(DocumentTypeRequest $request, DocumentType $documentType): RedirectResponse
    {
        $data = $request->validated();

        if ((bool) $data['has_expiry'] !== $documentType->has_expiry && $documentType->documents()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('The expiry setting cannot be changed while documents use this type.')]);

            return back();
        }

        $documentType->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document type updated.')]);

        return back();
    }
}
