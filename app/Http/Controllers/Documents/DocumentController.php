<?php

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\ArchiveDocument;
use App\Actions\Documents\CreateDocument;
use App\Actions\Documents\StoreDocumentFiles;
use App\Actions\Documents\UpdateDocument;
use App\Enums\DocumentState;
use App\Enums\DocumentSubject;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\AttachDocumentFilesRequest;
use App\Http\Requests\Documents\StoreDocumentRequest;
use App\Http\Requests\Documents\UpdateDocumentRequest;
use App\Models\Branch;
use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Vehicle;
use App\Services\VehicleDocuments;
use App\Support\BranchAccess;
use App\Support\OrganizationTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    private const SORTS = ['expires', '-expires', 'plate', 'type'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Document::class);

        $user = $request->user();
        $today = OrganizationTime::today();
        $state = DocumentState::tryFrom($request->string('state')->toString());
        $sort = in_array($request->query('sort'), self::SORTS, true) ? $request->query('sort') : 'expires';

        $documents = Document::query()
            ->visibleTo($user)
            ->with([
                'type',
                'files:id,document_id',
                'createdBy:id,first_name,last_name',
                'archivedBy:id,first_name,last_name',
                'documentable' => fn ($query) => $query->select('id', 'plate_number', 'make', 'model', 'branch_id', 'status', 'vehicle_type_id'),
                'documentable.branch:id,name',
            ])
            ->when($state !== null, fn ($query) => $query->inState($state, $today), fn ($query) => $query->active())
            ->when($state?->needsAttention(), fn ($query) => $query->forOperationalSubjects())
            ->when($request->filled('type'), fn ($query) => $query->where('document_type_id', $request->integer('type')))
            ->when($request->filled('branch'), fn ($query) => $query->whereHasMorph(
                'documentable',
                [Vehicle::class],
                fn ($query) => $query->where('branch_id', $request->integer('branch')),
            ))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = $request->string('search')->toString();

                $query->where(fn ($query) => $query
                    ->where('number', 'like', "%{$term}%")
                    ->orWhereHasMorph('documentable', [Vehicle::class], fn ($query) => $query->search($term)));
            })
            ->tap(fn ($query) => match ($sort) {
                'plate' => $query->orderBy(
                    Vehicle::query()->select('plate_number')->whereColumn('vehicles.id', 'documents.documentable_id')->limit(1),
                ),
                'type' => $query->orderBy(
                    DocumentType::query()->select('name')->whereColumn('document_types.id', 'documents.document_type_id')->limit(1),
                ),
                default => $query->orderByRaw('expires_on IS NULL')->orderBy('expires_on', $sort === '-expires' ? 'desc' : 'asc'),
            })
            ->orderBy('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Document $document) => [
                ...VehicleDocuments::present($document, $today),
                'files_count' => $document->files->count(),
                'vehicle' => $document->documentable instanceof Vehicle ? [
                    'id' => $document->documentable->id,
                    'plate_number' => $document->documentable->plate_number,
                    'name' => trim($document->documentable->make.' '.$document->documentable->model),
                    'branch' => $document->documentable->branch?->name,
                ] : null,
            ]);

        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($user);

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'state' => $state?->value ?? '',
                'type' => $request->string('type')->toString(),
                'branch' => $request->string('branch')->toString(),
                'sort' => $sort,
            ],
            'counts' => [
                'expired' => Document::query()->visibleTo($user)->forOperationalSubjects()->inState(DocumentState::Expired, $today)->count(),
                'expiring' => Document::query()->visibleTo($user)->forOperationalSubjects()->inState(DocumentState::Expiring, $today)->count(),
            ],
            'types' => DocumentType::query()
                ->where('subject', DocumentSubject::Vehicle->value)
                ->orderBy('name')
                ->get(['id', 'name']),
            'branches' => Branch::query()
                ->when($visibleBranches !== null, fn ($query) => $query->whereIn('id', $visibleBranches))
                ->orderBy('name')
                ->get(['id', 'name']),
            'expiringDays' => Document::EXPIRING_DAYS,
        ]);
    }

    /**
     * Documents tab of the vehicle card, loaded when the tab opens.
     */
    public function forVehicle(Request $request, Vehicle $vehicle, VehicleDocuments $vehicleDocuments): JsonResponse
    {
        Gate::authorize('view', $vehicle);
        Gate::authorize('viewAny', Document::class);

        $today = OrganizationTime::today();

        if ($request->boolean('archived')) {
            return response()->json([
                'items' => $vehicle->documents()
                    ->whereNotNull('archived_at')
                    ->with(['type', 'files', 'createdBy:id,first_name,last_name', 'archivedBy:id,first_name,last_name'])
                    ->orderByDesc('archived_at')
                    ->orderByDesc('id')
                    ->limit(100)
                    ->get()
                    ->map(fn (Document $document) => VehicleDocuments::present($document, $today))
                    ->values(),
            ]);
        }

        $current = $vehicleDocuments->current($vehicle);

        return response()->json([
            'items' => $current->map(fn (Document $document) => VehicleDocuments::present($document, $today))->values(),
            'missing' => $vehicleDocuments->missingMandatory($vehicle, $current)
                ->map(fn (DocumentType $type) => ['id' => $type->id, 'name' => $type->name])
                ->values(),
            'archived_count' => $vehicle->documents()->whereNotNull('archived_at')->count(),
            'types' => DocumentType::query()
                ->forVehicleCategory($vehicle->type->category)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'has_expiry', 'is_mandatory']),
        ]);
    }

    public function store(StoreDocumentRequest $request, Vehicle $vehicle, CreateDocument $createDocument): RedirectResponse
    {
        $replaces = null;

        if ($request->filled('replaces_id')) {
            $replaces = Document::query()->findOrFail($request->integer('replaces_id'));
            Gate::authorize('archive', $replaces);
        }

        $createDocument->execute(
            $request->user(),
            $vehicle->loadMissing('type'),
            $request->safe()->except(['files', 'replaces_id', 'idempotency_key']),
            $request->file('files', []),
            $request->input('idempotency_key'),
            $replaces,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $replaces ? __('Document renewed. The previous one is in the archive.') : __('Document added.'),
        ]);

        return back();
    }

    public function update(UpdateDocumentRequest $request, Document $document, UpdateDocument $updateDocument): RedirectResponse
    {
        $updateDocument->execute($document, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document updated.')]);

        return back();
    }

    public function archive(Request $request, Document $document, ArchiveDocument $archiveDocument): RedirectResponse
    {
        Gate::authorize('archive', $document);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $archiveDocument->execute($document, $request->user(), $validated['reason']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document moved to the archive.')]);

        return back();
    }

    public function attachFiles(AttachDocumentFilesRequest $request, Document $document, StoreDocumentFiles $storeFiles): RedirectResponse
    {
        $storeFiles->execute($document, $request->file('files', []), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Files uploaded.')]);

        return back();
    }

    /**
     * Files are only reachable through this authorized route and are never cached.
     */
    public function file(Request $request, Document $document, DocumentFile $file): StreamedResponse
    {
        Gate::authorize('view', $document);
        abort_unless($file->document_id === $document->id, 404);

        $inline = in_array($file->mime_type, DocumentFile::INLINE_MIME_TYPES, true) && ! $request->boolean('download');
        $headers = [
            'Content-Type' => $file->mime_type,
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ];

        // Browsers' built-in PDF viewers break under a restrictive CSP; images don't need one to render.
        if (str_starts_with($file->mime_type, 'image/')) {
            $headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'";
        }

        $disk = Storage::disk($file->disk);

        return $inline
            ? $disk->response($file->path, $file->original_name, $headers)
            : $disk->download($file->path, $file->original_name, $headers);
    }
}
