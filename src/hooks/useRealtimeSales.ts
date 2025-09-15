import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface RealtimeSaleRow {
  id: string;
  customer?: string | null;
  customer_nit?: string | null;
  is_final_consumer?: boolean;
  total?: number | string | null;
  items?: number | null;
  payment_method_id?: number | null;
  status_id?: number | null;
  sold_at?: string;
  date?: string;
}

/**
 * Suscribe a inserciones en la tabla sales (schema public).
 * Requisitos en Supabase:
 *  - La tabla debe estar incluida en la publicación realtime: `alter publication supabase_realtime add table sales;`
 *  - Realtime habilitado en el proyecto.
 *  - Si RLS está activo: política SELECT para anon/role que permita escuchar cambios o desactivar RLS.
 */
let lastIdGlobal: string | null = null; // evita usar hook extra que altere orden al cambiar hot reload

export function useRealtimeSales(
  onNewSale: (sale: RealtimeSaleRow) => void,
  opts: { enabled?: boolean; onUpdate?: (sale: RealtimeSaleRow) => void } = {}
) {
  const { enabled = true, onUpdate } = opts;
  const lastIdRef = useRef<string | null>(null); // mantiene referencia por instancia, fallback si HMR reinicia módulo
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryRef = useRef<number>(0);
  const onNewSaleStable = useCallback(onNewSale, [onNewSale]);

  useEffect(() => {
    if (!supabase || !enabled) return;
    // Evitar múltiples suscripciones
    if (channelRef.current) return;

    const channel = supabase.channel('sales-realtime');
    channelRef.current = channel;

    const handleRow = (payload: { new: unknown; [k: string]: unknown }, kind: 'INSERT' | 'UPDATE') => {
      const errorsField = payload['errors'];
      if (Array.isArray(errorsField)) {
        console.error('[realtime][sales] Errores en payload:', errorsField);
      }
      const row = payload.new as RealtimeSaleRow;
      if (!row || Object.keys(row).length === 0) {
        console.warn('[realtime][sales] Payload sin datos (posible RLS o falta de política SELECT)', payload);
        return;
      }
      if (!row.id) {
        console.warn('[realtime][sales] Fila recibida sin id (verifica replica identity o SELECT policy)', row);
        return;
      }
      if (kind === 'INSERT') {
        if (lastIdRef.current === row.id || lastIdGlobal === row.id) return;
        lastIdRef.current = row.id;
        lastIdGlobal = row.id;
        onNewSaleStable(row);
      } else if (kind === 'UPDATE') {
        if (onUpdate) onUpdate(row);
      }
    };

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => handleRow(payload, 'INSERT'));
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sales' }, (payload) => handleRow(payload, 'UPDATE'));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[realtime][sales] Suscrito correctamente');
        retryRef.current = 0;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[realtime][sales] Error al suscribirse');
      } else if (status === 'CLOSED') {
        console.log('[realtime][sales] Canal cerrado');
        if (enabled) {
          const delay = Math.min(30000, 1000 * Math.pow(2, retryRef.current++));
          setTimeout(() => {
            channelRef.current = null;
            lastIdRef.current = null;
          }, delay);
        }
      } else if (status === 'TIMED_OUT') {
        console.warn('[realtime][sales] Timeout de suscripción');
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, onNewSaleStable, onUpdate]);
}
