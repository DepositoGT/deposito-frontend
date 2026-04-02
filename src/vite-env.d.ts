/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Opcional: mismo límite que `MAX_PROMOTION_CODES_PER_SALE` en el backend (solo UX en POS). */
    readonly VITE_MAX_PROMOTION_CODES_PER_SALE?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
