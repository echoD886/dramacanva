export function requiresCheckoutConfirmation(listAmount: number, payableAmount: number) {
    return listAmount !== payableAmount;
}

export function promotionFromSearch(search: string) {
    return (new URLSearchParams(search).get("promo") || "").trim().slice(0, 200);
}
