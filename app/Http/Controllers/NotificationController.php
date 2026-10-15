<?php

namespace App\Http\Controllers;

use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('notifications/index', [
            'notifications' => $this->query($request)
                ->latest()
                ->paginate(30)
                ->through(fn (DatabaseNotification $notification) => [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'data' => $notification->data,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at?->toIso8601String(),
                ]),
        ]);
    }

    public function open(Request $request, string $notification): RedirectResponse
    {
        $model = $this->query($request)->findOrFail($notification);
        $model->markAsRead();

        $url = $model->data['url'] ?? null;

        // Only same-site paths stored by the app are followed.
        return is_string($url) && str_starts_with($url, '/') && ! str_starts_with($url, '//')
            ? redirect($url)
            : to_route('notifications.index');
    }

    public function readAll(Request $request): RedirectResponse
    {
        $this->query($request)->whereNull('read_at')->update(['read_at' => now()]);

        return back();
    }

    /**
     * @return Builder<DatabaseNotification>
     */
    private function query(Request $request): Builder
    {
        return $request->user()
            ->notifications()
            ->where('organization_id', app(CurrentOrganization::class)->id())
            ->getQuery();
    }
}
