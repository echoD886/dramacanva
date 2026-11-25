export function clearCheckoutReturn(search: string): string {
    const params = new URLSearchParams(search);
    for (const key of ["payment", "attempt_id", "return_token", "product_kind"]) params.delete(key);
    return params.toString();
}
