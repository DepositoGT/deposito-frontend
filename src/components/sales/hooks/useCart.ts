/**
 * useCart - Custom hook for managing the shopping cart
 */
import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getApiBaseUrl } from '@/services/api'
import type { Product } from '@/types/product'
import type { CartProduct, AvailabilityDialogState, AdminAuthDialogState } from '../types'

interface UseCartOptions {
    availableProducts: Product[]
}

interface UseCartReturn {
    cartItems: CartProduct[]
    cartTotal: number
    adminAuthorizedProducts: Set<string>
    availabilityDialog: AvailabilityDialogState
    adminAuthDialog: AdminAuthDialogState
    additionalQty: string
    adminUsername: string
    adminPassword: string
    isAuthenticating: boolean
    // Actions
    addToCart: (product: Product) => void
    removeFromCart: (productId: string) => void
    updateQuantity: (productId: string, newQty: number) => void
    clearCart: () => void
    setAdditionalQty: (qty: string) => void
    setAdminUsername: (username: string) => void
    setAdminPassword: (password: string) => void
    // Dialog handlers
    handleConfirmAdditionalQty: () => void
    handleCancelAvailability: () => void
    handleAdminAuth: () => Promise<void>
    closeAdminAuthDialog: () => void
}

export const useCart = ({ availableProducts }: UseCartOptions): UseCartReturn => {
    const { toast } = useToast()

    // Cart state
    const [cartItems, setCartItems] = useState<CartProduct[]>([])
    const [adminAuthorizedProducts, setAdminAuthorizedProducts] = useState<Set<string>>(new Set())

    // Availability dialog state
    const [availabilityDialog, setAvailabilityDialog] = useState<AvailabilityDialogState>({
        open: false,
        product: null,
        requestedQty: 0,
        availableStock: 0
    })
    const [additionalQty, setAdditionalQty] = useState('')

    // Admin auth dialog state
    const [adminAuthDialog, setAdminAuthDialog] = useState<AdminAuthDialogState>({
        open: false,
        product: null,
        requestedQty: 0
    })
    const [adminUsername, setAdminUsername] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [isAuthenticating, setIsAuthenticating] = useState(false)

    // Computed
    const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)

    // Actions
    const addToCart = useCallback((product: Product) => {
        const available = Number(product.stock ?? 0)
        const existing = cartItems.find(i => i.id === product.id)
        const currentQty = existing?.qty ?? 0
        const requestedQty = currentQty + 1

        if (requestedQty <= available) {
            setCartItems(prev => {
                if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
                return [...prev, { ...product, qty: 1 }]
            })
            return
        }

        // Insufficient stock: ask for additional quantity
        setAvailabilityDialog({ open: true, product, requestedQty, availableStock: available })
        setAdditionalQty('')
    }, [cartItems])

    const removeFromCart = useCallback((productId: string) => {
        setCartItems(prev => prev.filter(i => i.id !== productId))
        setAdminAuthorizedProducts(prev => {
            const newSet = new Set(prev)
            newSet.delete(productId)
            return newSet
        })
    }, [])

    const updateQuantity = useCallback((productId: string, newQty: number) => {
        if (newQty <= 0) return removeFromCart(productId)

        const prod = availableProducts.find(p => p.id === productId)
        if (!prod) return

        const available = Number(prod.stock ?? 0)

        if (newQty <= available) {
            setCartItems(prev => prev.map(i => i.id === productId ? { ...i, qty: newQty } : i))
            return
        }

        // Insufficient stock
        setAvailabilityDialog({ open: true, product: prod, requestedQty: newQty, availableStock: available })
        setAdditionalQty('')
    }, [availableProducts, removeFromCart])

    const clearCart = useCallback(() => {
        setCartItems([])
        setAdminAuthorizedProducts(new Set())
    }, [])

    // Dialog handlers
    const handleConfirmAdditionalQty = useCallback(() => {
        const additional = parseInt(additionalQty)

        if (!additional || additional <= 0 || isNaN(additional)) {
            toast({
                title: 'Cantidad inválida',
                description: 'Ingresa una cantidad válida mayor a 0.',
                variant: 'destructive'
            })
            return
        }

        const { product, availableStock } = availabilityDialog
        const totalQty = availableStock + additional

        setAvailabilityDialog({ open: false, product: null, requestedQty: 0, availableStock: 0 })
        setAdminAuthDialog({ open: true, product, requestedQty: totalQty })
    }, [additionalQty, availabilityDialog, toast])

    const handleCancelAvailability = useCallback(() => {
        setAvailabilityDialog({ open: false, product: null, requestedQty: 0, availableStock: 0 })
        setAdditionalQty('')
        toast({
            title: 'Cancelado',
            description: 'No se agregó el producto.',
            variant: 'default'
        })
    }, [toast])

    const handleAdminAuth = useCallback(async () => {
        if (!adminUsername.trim() || !adminPassword.trim()) {
            toast({
                title: 'Credenciales requeridas',
                description: 'Ingresa usuario y contraseña de administrador.',
                variant: 'destructive'
            })
            return
        }

        setIsAuthenticating(true)

        try {
            const response = await fetch(`${getApiBaseUrl()}/auth/validate-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: adminUsername, password: adminPassword })
            })

            const data = await response.json()

            if (!response.ok || !data.valid) {
                toast({
                    title: 'Credenciales inválidas',
                    description: 'Usuario o contraseña incorrectos.',
                    variant: 'destructive'
                })
                setIsAuthenticating(false)
                return
            }

            const { product, requestedQty } = adminAuthDialog

            if (product) {
                const existing = cartItems.find(i => i.id === product.id)

                if (existing) {
                    setCartItems(prev => prev.map(i =>
                        i.id === product.id ? { ...i, qty: requestedQty } : i
                    ))
                } else {
                    setCartItems(prev => [...prev, { ...product, qty: requestedQty }])
                }

                setAdminAuthorizedProducts(prev => new Set(prev).add(product.id))

                toast({
                    title: 'Producto agregado',
                    description: `Se agregó "${product.name}" con autorización de administrador.`,
                    variant: 'default'
                })
            }

            setAdminUsername('')
            setAdminPassword('')
            setAdminAuthDialog({ open: false, product: null, requestedQty: 0 })

        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo validar las credenciales. Intenta nuevamente.',
                variant: 'destructive'
            })
        } finally {
            setIsAuthenticating(false)
        }
    }, [adminUsername, adminPassword, adminAuthDialog, cartItems, toast])

    const closeAdminAuthDialog = useCallback(() => {
        setAdminAuthDialog({ open: false, product: null, requestedQty: 0 })
        setAdminUsername('')
        setAdminPassword('')
    }, [])

    return {
        cartItems,
        cartTotal,
        adminAuthorizedProducts,
        availabilityDialog,
        adminAuthDialog,
        additionalQty,
        adminUsername,
        adminPassword,
        isAuthenticating,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setAdditionalQty,
        setAdminUsername,
        setAdminPassword,
        handleConfirmAdditionalQty,
        handleCancelAvailability,
        handleAdminAuth,
        closeAdminAuthDialog,
    }
}
