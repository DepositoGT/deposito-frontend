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
 * Vista para crear un nuevo proveedor. Mismo estilo que detalle/editar.
 * Conserva todos los atributos del formulario de proveedores.
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building, ChevronsUpDown, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCreateSupplier } from '@/hooks/useCreateSupplier'
import { useCategories } from '@/hooks/useCategories'
import { usePaymentTerms } from '@/hooks/usePaymentTerms'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export default function SupplierCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createSupplierMutation = useCreateSupplier()
  const { data: categoriesData } = useCategories()
  const { data: paymentTermsData } = usePaymentTerms()

  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newCategoryIds, setNewCategoryIds] = useState<string[]>([])
  const [newPaymentTermId, setNewPaymentTermId] = useState<string | undefined>(undefined)
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false)
  const [paymentTermPopoverOpen, setPaymentTermPopoverOpen] = useState(false)

  const categories = useMemo(() => {
    if (!categoriesData) return [] as Array<{ id: number | string; name: string }>
    if (Array.isArray(categoriesData)) return categoriesData as Array<{ id: number | string; name: string }>
    return (categoriesData as { items?: Array<{ id: number | string; name: string }> }).items ?? []
  }, [categoriesData])

  const paymentTerms = useMemo(() => {
    if (Array.isArray(paymentTermsData)) return paymentTermsData
    return paymentTermsData?.items ?? []
  }, [paymentTermsData])

  const paymentTermLabel = useMemo(() => {
    if (!newPaymentTermId) return ''
    const t = paymentTerms.find((x: { id: number | string }) => String(x.id) === String(newPaymentTermId))
    return t ? (t as { name: string }).name : newPaymentTermId
  }, [newPaymentTermId, paymentTerms])

  const handleSubmit = async () => {
    if (!newName?.trim()) {
      toast({ title: 'Campo requerido', description: 'El nombre de la empresa es obligatorio', variant: 'destructive' })
      return
    }
    if (!newContact?.trim()) {
      toast({ title: 'Campo requerido', description: 'La persona de contacto es obligatoria', variant: 'destructive' })
      return
    }
    if (!newPhone?.trim()) {
      toast({ title: 'Campo requerido', description: 'El teléfono es obligatorio', variant: 'destructive' })
      return
    }
    if (!newEmail?.trim()) {
      toast({ title: 'Campo requerido', description: 'El email es obligatorio', variant: 'destructive' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast({ title: 'Email inválido', description: 'Por favor ingrese un email válido', variant: 'destructive' })
      return
    }
    if (!newAddress?.trim()) {
      toast({ title: 'Campo requerido', description: 'La dirección es obligatoria', variant: 'destructive' })
      return
    }
    if (!newCategoryIds.length) {
      toast({ title: 'Campo requerido', description: 'Debes seleccionar al menos una categoría', variant: 'destructive' })
      return
    }

    try {
      const supplier = await createSupplierMutation.mutateAsync({
        name: newName.trim(),
        contact: newContact.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        address: newAddress.trim(),
        category_ids: newCategoryIds.map((id) => Number(id)),
        payment_terms_id: newPaymentTermId ? Number(newPaymentTermId) : undefined,
      })
      toast({ title: 'Proveedor agregado', description: 'Proveedor creado correctamente' })
      const id = (supplier as { id?: string })?.id
      if (id) navigate(`/proveedores/${id}`)
      else navigate('/proveedores')
    } catch (err: unknown) {
      const message = (err && typeof err === 'object' && 'message' in err)
        ? String((err as { message?: unknown }).message) || 'No se pudo crear el proveedor'
        : 'No se pudo crear el proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const isLoading = createSupplierMutation.isPending

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedores')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nuevo Proveedor</h1>
            <p className="text-sm text-muted-foreground">Agregar un nuevo proveedor</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Diageo Guatemala"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact">Persona de Contacto *</Label>
                <Input
                  id="contact"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="Nombre completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+502 2345-6789"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Categorías *</Label>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                      <span className="truncate text-left">
                        {newCategoryIds.length === 0
                          ? 'Seleccionar categorías'
                          : `${newCategoryIds.length} categoría(s) seleccionada(s)`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar categoría..." />
                      <CommandList>
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="max-h-64">
                            {categories.map((c) => {
                              const id = String(c.id)
                              const selected = newCategoryIds.includes(id)
                              return (
                                <CommandItem
                                  key={id}
                                  value={c.name}
                                  onSelect={() => {
                                    setNewCategoryIds((prev) =>
                                      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
                                    )
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                  {c.name}
                                </CommandItem>
                              )
                            })}
                            {categories.length === 0 && (
                              <div className="px-2 py-3 text-xs text-muted-foreground">
                                Configura categorías en catálogos primero.
                              </div>
                            )}
                          </ScrollArea>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {newCategoryIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {categories
                      .filter((c) => newCategoryIds.includes(String(c.id)))
                      .map((c) => (
                        <Badge key={String(c.id)} variant="secondary" className="text-xs">
                          {c.name}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Términos de Pago</Label>
                <Popover open={paymentTermPopoverOpen} onOpenChange={setPaymentTermPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between mt-1" id="terms">
                      {paymentTermLabel || 'Seleccionar términos'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar términos de pago..." />
                      <CommandEmpty>No se encontraron términos.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          <ScrollArea className="h-48">
                            {paymentTerms.length > 0 ? (
                              paymentTerms.map((t: { id: number | string; name: string }) => (
                                <CommandItem
                                  key={String(t.id)}
                                  value={t.name}
                                  onSelect={() => {
                                    setNewPaymentTermId(String(t.id))
                                    setPaymentTermPopoverOpen(false)
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', String(t.id) === newPaymentTermId ? 'opacity-100' : 'opacity-0')} />
                                  {t.name}
                                </CommandItem>
                              ))
                            ) : (
                              <>
                                {[
                                  { id: '1', name: '7 días' },
                                  { id: '2', name: '15 días' },
                                  { id: '3', name: '30 días' },
                                  { id: '4', name: '45 días' },
                                ].map((t) => (
                                  <CommandItem
                                    key={t.id}
                                    value={t.name}
                                    onSelect={() => {
                                      setNewPaymentTermId(t.id)
                                      setPaymentTermPopoverOpen(false)
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', t.id === newPaymentTermId ? 'opacity-100' : 'opacity-0')} />
                                    {t.name}
                                  </CommandItem>
                                ))}
                              </>
                            )}
                          </ScrollArea>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="address">Dirección *</Label>
                <Textarea
                  id="address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Dirección completa"
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/proveedores')} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <Building className="w-4 h-4 mr-2" />
                  Agregar Proveedor
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
