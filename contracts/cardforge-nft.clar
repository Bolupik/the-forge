;; CardForge NFT — deploy-safe across devnet, testnet, and mainnet.
;;
;; Important: this contract intentionally avoids top-level trait declarations
;; and trait imports because Hiro/Xverse can misclassify them during contract
;; deployment, which caused false "Asset Transfers Detected" warnings and
;; 400/"undefined was not deployed" publish failures.

(define-constant ERR-NOT-TOKEN-OWNER (err u101))

(define-non-fungible-token cardforge-nft uint)

(define-data-var last-token-id uint u0)

;; Per-token metadata URI (https or ipfs)
(define-map token-uris uint (string-ascii 256))

;; -------- SIP-009 --------

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

(define-public (mint (recipient principal) (token-uri (string-ascii 256)))
  (let ((next-id (+ (var-get last-token-id) u1)))
    (asserts! (is-eq tx-sender recipient) ERR-NOT-TOKEN-OWNER)
    (try! (nft-mint? cardforge-nft next-id recipient))
    (map-set token-uris next-id token-uri)
    (var-set last-token-id next-id)
    (print { event: "mint", id: next-id, recipient: recipient, uri: token-uri })
    (ok next-id)))

