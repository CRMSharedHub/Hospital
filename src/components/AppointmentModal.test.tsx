import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AppointmentModal from './AppointmentModal'
import { I18nProvider } from '../i18n'
import type { Appointment, Doctor, Patient } from '../types'

const patients: Patient[] = [
  {
    id: 101,
    name: 'Ahmed',
    age: 30,
    phone: '0500000000',
    condition: 'Flu',
    lastVisit: '2026-07-01',
    bloodType: 'O+',
    allergies: [],
  },
]

const doctors: Doctor[] = [
  { id: 1, name: 'Dr. Ali', specialty: 'Cardiology', available: true, patients: 10, rating: 4.5 },
]

const existing: Appointment[] = [
  {
    id: 1,
    patientId: 102,
    doctorId: 1,
    patientName: 'Sara',
    doctorName: 'Dr. Ali',
    date: '2026-08-01',
    time: '09:00',
    status: 'confirmed',
  },
]

function renderModal(props: Partial<Parameters<typeof AppointmentModal>[0]> = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <I18nProvider>
      <AppointmentModal
        isOpen
        onClose={onClose}
        doctors={doctors}
        patients={patients}
        existingAppointments={existing}
        onSave={onSave}
        {...props}
      />
    </I18nProvider>,
  )
  return { onSave, onClose }
}

function fillForm(date: string, time: string) {
  fireEvent.change(screen.getByLabelText('اسم المريض'), { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText('اختر الطبيب'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('التاريخ'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText('الوقت'), { target: { value: time } })
}

describe('AppointmentModal', () => {
  it('renders nothing when closed', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('موعد جديد')).toBeNull()
  })

  it('blocks submit and shows errors when fields are empty', () => {
    const { onSave } = renderModal()
    fireEvent.click(screen.getByText('حفظ'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getAllByText('هذا الحقل مطلوب')).toHaveLength(4)
  })

  it('shows a conflict error and does not save on a clashing slot', () => {
    const { onSave, onClose } = renderModal()
    fillForm('2026-08-01', '09:00')
    fireEvent.click(screen.getByText('حفظ'))
    expect(screen.getByRole('alert')).toHaveTextContent('هذا الطبيب لديه موعد آخر في نفس الوقت')
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onSave with the correct appointment shape', () => {
    const { onSave, onClose } = renderModal()
    fillForm('2026-08-02', '10:30')
    fireEvent.click(screen.getByText('حفظ'))
    expect(onSave).toHaveBeenCalledWith({
      patientId: 101,
      doctorId: 1,
      patientName: 'Ahmed',
      doctorName: 'Dr. Ali',
      date: '2026-08-02',
      time: '10:30',
      status: 'pending',
    })
    expect(onClose).toHaveBeenCalled()
  })
})
