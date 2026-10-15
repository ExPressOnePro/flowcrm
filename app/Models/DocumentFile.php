<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $document_id
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size
 * @property int|null $uploaded_by
 */
class DocumentFile extends Model
{
    use BelongsToOrganization, LogsActivity;

    public const DISK = 'documents';

    public const MAX_KILOBYTES = 10240;

    public const MAX_FILES = 10;

    /**
     * Checked against the detected content type, not the client-provided name.
     *
     * @var list<string>
     */
    public const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

    /**
     * Shown in the browser; everything else is downloaded as an attachment.
     *
     * @var list<string>
     */
    public const INLINE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'uploaded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('documents')
            ->logOnly(['document_id', 'original_name', 'mime_type', 'size'])
            ->dontLogEmptyChanges();
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
