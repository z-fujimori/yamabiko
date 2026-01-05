import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const HelpModal = () => {
  const closeModal = useUIStore((s) => s.closeModal)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeModal])

  return (
    <div 
      className='
        fixed inset-0
        bg-white opacity-20
      '
      onClick={closeModal}>

    </div>
  )
}

export default HelpModal