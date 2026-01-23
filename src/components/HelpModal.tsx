import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { CrayonBgDemo } from './CrayonBgDemo'

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
        bg-black/50
      '
      onClick={closeModal}>
        <CrayonBgDemo text={["⚠️ハウリングの可能性があるのでイヤホン推奨"]} />
    </div>
  )
}

export default HelpModal
