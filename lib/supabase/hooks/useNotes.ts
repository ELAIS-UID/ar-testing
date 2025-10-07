import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'

export interface Note {
  id: string
  title: string
  content: string | null
  created_at: string
  updated_at: string
  user_id?: string | null
}

export interface UseNotesReturn {
  notes: Note[]
  loading: boolean
  addNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<Note>
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  refreshNotes: () => Promise<void>
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addNote = useCallback(async (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single()

    if (error) throw error

    // Don't update local state - caller should use refreshNotes()
    return data
  }, [])

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Don't update local state - caller should use refreshNotes()
    return data
  }, [])

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Don't update local state - caller should use refreshNotes()
  }, [])

  const refreshNotes = fetchNotes

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes
  }
}
