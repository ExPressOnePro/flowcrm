<?php

namespace App\Actions\Documents;

use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class StoreDocumentFiles
{
    /**
     * Files get random names; the extension comes from the detected content type,
     * never from the name the client sent.
     *
     * @param  list<UploadedFile>  $files
     * @return list<DocumentFile>
     */
    public function execute(Document $document, array $files, ?User $actor): array
    {
        $disk = Storage::disk(DocumentFile::DISK);
        $stored = [];
        $records = [];

        try {
            foreach ($files as $file) {
                $extension = $file->extension() ?: 'bin';
                $path = $file->storeAs(
                    "{$document->organization_id}/{$document->id}",
                    Str::uuid()->toString().'.'.$extension,
                    DocumentFile::DISK,
                );
                $stored[] = $path;

                $records[] = $document->files()->create([
                    'disk' => DocumentFile::DISK,
                    'path' => $path,
                    'original_name' => Str::limit($file->getClientOriginalName(), 250, ''),
                    'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                    'size' => $file->getSize(),
                    'uploaded_by' => $actor?->id,
                ]);
            }
        } catch (Throwable $exception) {
            $disk->delete($stored);

            throw $exception;
        }

        return $records;
    }
}
