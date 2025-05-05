"use client"

import { useState, useEffect, useCallback } from "react"

type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

type Toast = ToastProps & {
  id: string
  visible: boolean
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(
    (props: ToastProps) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: Toast = {
        id,
        visible: true,
        duration: 5000,
        variant: "default",
        ...props,
      }

      setToasts((prev) => [...prev, newToast])

      // Auto-dismiss after duration
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
        )
        
        // Remove from state after animation
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 300)
      }, newToast.duration)

      return id
    },
    []
  )

  return { toast, toasts }
}
