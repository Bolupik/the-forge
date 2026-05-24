;; CardForge NFT — SIP-009 compliant
;; One contract for the whole collection; each minted card stores its own
;; token URI pointing to OpenSea-style metadata JSON.

(impl-trait 'SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.sip-009-trait.sip-009-trait)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-NOT-TOKEN-OWNER (err u101))
(define-constant ERR-NOT-FOUND (err u102))

(define-non-fungible-token cardforge-nft uint)

(define-data-var last-token-id uint u0)

;; Per-token metadata URI (https or ipfs)
(define-map token-uris uint (string-ascii 256))

;; -------- SIP-009 trait --------

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id)))

(define-read-only (get-token-uri (token-id uint))
  (ok (map-get? token-uris token-id)))

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? cardforge-nft token-id)))

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
    (nft-transfer? cardforge-nft token-id sender recipient)))

;; -------- Mint --------

;; Public, free-to-mint. Recipient must equal tx-sender so users can only
;; mint cards into their own wallet.
(define-public (mint (recipient principal) (token-uri (string-ascii 256)))
  (let ((next-id (+ (var-get last-token-id) u1)))
    (asserts! (is-eq tx-sender recipient) ERR-NOT-TOKEN-OWNER)
    (try! (nft-mint? cardforge-nft next-id recipient))
    (map-set token-uris next-id token-uri)
    (var-set last-token-id next-id)
    (print { event: "mint", id: next-id, recipient: recipient, uri: token-uri })
    (ok next-id)))

;; Admin: overwrite metadata URI (e.g. art freeze, IPFS migration)
(define-public (set-token-uri (token-id uint) (token-uri (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (asserts! (is-some (nft-get-owner? cardforge-nft token-id)) ERR-NOT-FOUND)
    (map-set token-uris token-id token-uri)
    (ok true)))
