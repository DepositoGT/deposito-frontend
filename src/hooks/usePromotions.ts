/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/**
 * usePromotions Hook
 * Manages promotion codes state for sales
 */

import { useState, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
    validatePromotionCode,
    AppliedPromotion,
    CartItemForPromotion,
    Promotion
} from '@/services/promotionService'

interface UsePromotionsProps {
    cartItems: CartItemForPromotion[]
    cartTotal: number
}

interface UsePromotionsReturn {
    // State
    appliedPromotions: AppliedPromotion[]
    totalDiscount: number
    finalTotal: number
    promotionCodes: string[]
    isValidating: boolean

    // Actions
    applyCode: (code: string) => Promise<boolean>
    removePromotion: (promotionId: string) => void
    clearPromotions: () => void
}

export function usePromotions({ cartItems, cartTotal }: UsePromotionsProps): UsePromotionsReturn {
    const { toast } = useToast()
    const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotion[]>([])
    const [isValidating, setIsValidating] = useState(false)

    // Calculate totals
    const totalDiscount = useMemo(() => {
        return appliedPromotions.reduce((sum, promo) => sum + promo.discountApplied, 0)
    }, [appliedPromotions])

    const finalTotal = useMemo(() => {
        return Math.max(0, cartTotal - totalDiscount)
    }, [cartTotal, totalDiscount])

    const promotionCodes = useMemo(() => {
        return appliedPromotions.map(p => p.code)
    }, [appliedPromotions])

    // Apply a promotion code
    const applyCode = useCallback(async (code: string): Promise<boolean> => {
        if (!code.trim()) {
            toast({
                title: 'Error',
                description: 'Ingresa un código de promoción',
                variant: 'destructive'
            })
            return false
        }

        // Check if already applied
        const normalizedCode = code.toUpperCase().trim()
        if (appliedPromotions.some(p => p.code === normalizedCode)) {
            toast({
                title: 'Código ya aplicado',
                description: 'Esta promoción ya está aplicada a la venta',
                variant: 'destructive'
            })
            return false
        }

        setIsValidating(true)

        try {
            const items = cartItems.map(item => ({
                product_id: item.product_id,
                price: item.price,
                qty: item.qty,
                category_id: item.category_id
            }))

            const result = await validatePromotionCode(normalizedCode, items)

            if (!result.valid) {
                toast({
                    title: 'Código no válido',
                    description: result.message || 'El código de promoción no es válido',
                    variant: 'destructive'
                })
                return false
            }

            if (result.discount === 0) {
                toast({
                    title: 'Sin descuento aplicable',
                    description: 'El código es válido pero no aplica descuento a los productos en el carrito',
                    variant: 'destructive'
                })
                return false
            }

            // Add to applied promotions
            const appliedPromo: AppliedPromotion = {
                ...result.promotion as Promotion,
                discountApplied: result.discount,
                freeGift: result.freeGift ? {
                    product_id: result.freeGift.product_id,
                    qty: result.freeGift.qty || 1
                } : undefined
            }

            setAppliedPromotions(prev => [...prev, appliedPromo])

            toast({
                title: '¡Promoción aplicada!',
                description: `${result.promotion?.name}: -Q${result.discount.toFixed(2)}`
            })

            return true
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al validar código'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive'
            })
            return false
        } finally {
            setIsValidating(false)
        }
    }, [cartItems, appliedPromotions, toast])

    // Remove a promotion
    const removePromotion = useCallback((promotionId: string) => {
        setAppliedPromotions(prev => prev.filter(p => p.id !== promotionId))
        toast({
            title: 'Promoción removida',
            description: 'Se eliminó la promoción de la venta'
        })
    }, [toast])

    // Clear all promotions
    const clearPromotions = useCallback(() => {
        setAppliedPromotions([])
    }, [])

    return {
        appliedPromotions,
        totalDiscount,
        finalTotal,
        promotionCodes,
        isValidating,
        applyCode,
        removePromotion,
        clearPromotions
    }
}
