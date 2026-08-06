import { supabase, isSupabaseConfigured } from './supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

type RealtimeTable =
  | 'patients' | 'doctors' | 'appointments' | 'visits'
  | 'medications' | 'notes' | 'medical_files' | 'invoices'
  | 'medicines' | 'pharmacy_orders' | 'lab_tests' | 'audit_log'

const tableToQueryKey: Record<RealtimeTable, string[]> = {
  patients: ['patients'],
  doctors: ['doctors'],
  appointments: ['appointments'],
  visits: ['visits'],
  medications: ['medications'],
  notes: ['notes'],
  medical_files: ['files'],
  invoices: ['invoices'],
  medicines: ['medicines'],
  pharmacy_orders: ['pharmacyOrders'],
  lab_tests: ['labTests'],
  audit_log: ['auditLog'],
}

export function useRealtimeSync(tables: RealtimeTable[]) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel('realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const table = payload.table as RealtimeTable
          const queryKey = tableToQueryKey[table]
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey })
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [queryClient, tables])
}

export function useRealtimeAll() {
  useRealtimeSync([
    'patients', 'doctors', 'appointments', 'visits',
    'medications', 'notes', 'medical_files', 'invoices',
    'medicines', 'pharmacy_orders', 'lab_tests', 'audit_log',
  ])
}
