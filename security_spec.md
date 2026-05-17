# Security Specification for Natural Care of Beauty

## Data Invariants
1. Products: Only Admins can create/update/delete. Public can read.
2. Orders: Anyone can create an order. Only Admins can read or update status.
3. Members: Only Admins can manage member data.
4. Chat: Users can read/write to their own session. Admins can read/write all sessions.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a product as a non-admin.
2. **Identity Spoofing**: Attempt to update a product price as a non-admin.
3. **Identity Spoofing**: Attempt to read the full member database as a non-authenticated user.
4. **State Shortcutting**: Attempt to update order status directly from 'Pending' to 'delivery done' without 'Packing done'.
5. **Resource Poisoning**: Injection of 1MB text into product description.
6. **Resource Poisoning**: Injection of junk characters into order ID.
7. **Privilege Escalation**: User attempting to set `isAdmin: true` on their own message if they are not admin.
8. **Orphaned Write**: Creating a message for a non-existent session.
9. **PII Leak**: Unauthenticated user attempting to list all orders (containing names/addresses).
10. **Shadow Update**: Adding a field `featured: true` to a product during update if it's not in the whitelist.
11. **Denial of Wallet**: Massive array injection in `items` list of an order.
12. **Temporal Integrity**: Setting `timestamp` to a future date manually rather than server time. (Note: The app currently uses strings for simplicity in the UI, I should enforce server timestamps if possible, but I'll stick to the current logic while hardening).

## Test Case Definitions (Conceptual)
- `PERMISSION_DENIED` for any non-admin trying to write to `/products`.
- `PERMISSION_DENIED` for any non-admin trying to read `/orders` or `/members`.
- `PERMISSION_DENIED` for any user trying to read `/chats/{otherSession}`.
