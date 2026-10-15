import driverDocuments from '@/routes/drivers/documents';
import vehicleDocuments from '@/routes/vehicles/documents';

export type DocumentOwner = { kind: 'vehicle' | 'driver'; id: number };

export function ownerDocumentsUrl(owner: DocumentOwner, archived = false) {
    const options = archived ? { query: { archived: 1 } } : undefined;

    return owner.kind === 'driver'
        ? driverDocuments.index.url(owner.id, options)
        : vehicleDocuments.index.url(owner.id, options);
}

export function ownerStoreUrl(owner: DocumentOwner) {
    return owner.kind === 'driver'
        ? driverDocuments.store.url(owner.id)
        : vehicleDocuments.store.url(owner.id);
}
