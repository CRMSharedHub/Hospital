import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FacilityState {
  activeFacilityId: number | null
  setActiveFacilityId: (id: number | null) => void
}

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set) => ({
      activeFacilityId: null,
      setActiveFacilityId: (id) => set({ activeFacilityId: id }),
    }),
    { name: 'facility-storage', version: 1 },
  ),
)
