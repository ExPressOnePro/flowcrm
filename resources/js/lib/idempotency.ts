/**
 * Random key sent with a create form so a repeated submit (double tap, retry
 * on a flaky connection) returns the record already saved instead of a duplicate.
 * `crypto.randomUUID` needs a secure context; getRandomValues works everywhere.
 */
export function newIdempotencyKey(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
        '',
    );
}
