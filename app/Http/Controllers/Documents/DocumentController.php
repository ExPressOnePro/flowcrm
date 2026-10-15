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
use App\Models\Contracts\HasDocuments;
use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Services\SubjectDocuments;
use App\Support\BranchAccess;
use App\Support\OrganizationTime;
use Illuminate\Database\Eloquent\Relations\MorphTo;
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
        $subject = DocumentSubject::tryFrom($request->string('subject')->toString());
        $sort = in_array($request->query('sort'), self::SORTS, true) ? $request->query('sort') : 'expires';

        $documents = Document::query()
            ->visibleTo($user)
            ->with([
                'type',
                'files:id,document_id',
                'createdBy:id,first_name,last_name',
                'archivedBy:id,first_name,last_name',
                'documentable' => fn (MorphTo $morphTo) => $morphTo->morphWith([Vehicle::class => ['branch:id,name'], Driver::class => ['branch:id,name']]),
            ])
            ->when($subject !== null, fn ($query) => $query->forSubject($subject))
            ->when($state !== null, fn ($query) => $query->inState($state, $today), fn ($query) => $query->active())
            ->when($state?->needsAttention(), fn ($query) => $query->forOperationalSubjects())
            ->when($request->filled('type'), fn ($query) => $query->where('document_type_id', $request->integer('type')))
            ->when($request->filled('branch'), fn ($query) => $query->whereHasMorph(
                'documentable',
                [Vehicle::class, Driver::class],
                fn ($query) => $query->where('branch_id', $request->integer('branch')),
            ))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = $request->string('search')->toString();

                $query->where(fn ($query) => $query
                    ->where('number', 'like', "%{$term}%")
                    ->orWhereHasMorph('documentable', [Vehicle::class, Driver::class], fn ($query) => $query->search($term)));
            })
            ->tap(fn ($query) => match ($sort) {
                'plate' => $query->orderByRaw('documentable_type desc')->orderBy(
                    Vehicle::query()->withTrashed()->select('plate_number')->whereColumn('vehicles.id', 'documents.documentable_id')->limit(1),
                )->orderBy(
                    Driver::query()->select('last_name')->whereColumn('drivers.id', 'documents.documentable_id')->limit(1),
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
                ...SubjectDocuments::present($document, $today),
                'files_count' => $document->files->count(),
                'vehicle' => $document->documentable instanceof Vehicle ? [
                    'id' => $document->documentable->id,
                    'plate_number' => $document->documentable->plate_number,
                    'name' => trim($document->documentable->make.' '.$document->documentable->model),
                    'branch' => $document->documentable->branch?->name,
                ] : null,
                'driver' => $document->documentable instanceof Driver ? [
                    'id' => $document->documentable->id,
                    'name' => $document->documentable->full_name,
                    'branch' => $document->documentable->branch?->name,
                ] : null,
            ]);

        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($user);
        $counted = fn (DocumentState $state) => Document::query()
            ->visibleTo($user)
            ->forOperationalSubjects()
            ->when($subject !== null, fn ($query) => $query->forSubject($subject))
            ->inState($state, $today)
            ->count();

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'state' => $state?->value ?? '',
                'subject' => $subject?->value ?? '',
                'type' => $request->string('type')->toString(),
                'branch' => $request->string('branch')->toString(),
                'sort' => $sort,
            ],
            'counts' => [
                'expired' => $counted(DocumentState::Expired),
                'expiring' => $counted(DocumentState::Expiring),
            ],
            'types' => DocumentType::query()
                ->when($subject !== null, fn ($query) => $query->where('subject', $subject->value))
                ->orderBy('subject', 'desc')
                ->orderBy('name')
                ->get(['id', 'name', 'subject']),
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
    public function forVehicle(Request $request, Vehicle $vehicle, SubjectDocuments $documents): JsonResponse
    {
        Gate::authorize('view', $vehicle);

        return $this->subjectPayload($request, $vehicle, $documents);
    }

    public function forDriver(Request $request, Driver $driver, SubjectDocuments $documents): JsonResponse
    {
        Gate::authorize('view', $driver);

        return $this->subjectPayload($request, $driver, $documents);
    }

    public function store(StoreDocumentRequest $request, Vehicle $vehicle, CreateDocument $createDocument): RedirectResponse
    {
        return $this->storeFor($request, $vehicle->loadMissing('type'), $createDocument);
    }

    public function storeForDriver(StoreDocumentRequest $request, Driver $driver, CreateDocument $createDocument): RedirectResponse
    {
        return $this->storeFor($request, $driver, $createDocument);
    }

    private function subjectPayload(Request $request, HasDocuments $subject, SubjectDocuments $documents): JsonResponse
    {
        Gate::authorize('viewAny', Document::class);

        $today = OrganizationTime::today();

        if ($request->boolean('archived')) {
            return response()->json([
                'items' => $subject->documents()
                    ->whereNotNull('archived_at')
                    ->with(['type', 'files', 'createdBy:id,first_name,last_name', 'archivedBy:id,first_name,last_name'])
                    ->orderByDesc('archived_at')
                    ->orderByDesc('id')
                    ->limit(100)
                    ->get()
                    ->map(fn (Document $document) => SubjectDocuments::present($document, $today))
                    ->values(),
            ]);
        }

        $current = $documents->current($subject);

        return response()->json([
            'items' => $current->map(fn (Document $document) => SubjectDocuments::present($document, $today))->values(),
            'missing' => $documents->missingMandatory($subject, $current)
                ->map(fn (DocumentType $type) => ['id' => $type->id, 'name' => $type->name])
                ->values(),
            'archived_count' => $subject->documents()->whereNotNull('archived_at')->count(),
            'types' => $subject->applicableDocumentTypes()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'has_expiry', 'is_mandatory']),
        ]);
    }

    private function storeFor(StoreDocumentRequest $request, HasDocuments $subject, CreateDocument $createDocument): RedirectResponse
    {
        $replaces = null;

        if ($request->filled('replaces_id')) {
            $replaces = Document::query()->findOrFail($request->integer('replaces_id'));
            Gate::authorize('archive', $replaces);
        }

        $createDocument->execute(
            $request->user(),
            $subject,
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
