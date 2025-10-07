import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'

export interface Reminder {
  id: string
  customer_id: string
  amount: number
  reminder_date: string
  notes?: string | null
  status: 'active' | 'completed'
  created_date: string
  completed_date?: string
  user_id?: string | null
  customer?: {
    id: string
    name: string
  }
}

export interface UseRemindersReturn {
  reminders: Reminder[]
  loading: boolean
  addReminder: (reminder: Omit<Reminder, 'id' | 'created_date' | 'completed_date'>) => Promise<Reminder>
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<Reminder>
  deleteReminder: (id: string) => Promise<void>
  refreshReminders: () => Promise<void>
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('reminders')
        .select('*, customer:customers(id, name)')
        .order('reminder_date', { ascending: true })

      if (error) throw error

      setReminders(data || [])
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'created_date' | 'completed_date'>): Promise<Reminder> => {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select()
      .single()

    if (error) throw error

    // Don't update local state - caller should use refreshReminders()
    return data
  }, [])

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>): Promise<Reminder> => {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Don't update local state - caller should use refreshReminders()
    return data
  }, [])

  const deleteReminder = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Don't update local state - caller should use refreshReminders()
  }, [])

  const refreshReminders = fetchReminders

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  return {
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    refreshReminders
  }
}
