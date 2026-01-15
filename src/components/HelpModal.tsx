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
        bg-white opacity-30
      '
      onClick={closeModal}>
        <img src="img/arrow.png" alt="Help" className='w-17 fixed top-10 right-23 rotate-205' />
        <p className='fixed top-17 right-4 text-black font-bold'>
          ON/OFF切り替え
        </p>

        <img src="img/arrow.png" alt="Help" className='w-15 fixed top-17 right-50 rotate-45' />
        <p className='fixed top-7 right-65 text-black font-bold'>
          音量スライダー
        </p>
        <p className='fixed top-12 right-60 text-black font-bold text-xs'>
          （ONの時だけ操作可能）
        </p>

        <img src="img/arrow.png" alt="Help" className='w-15 fixed top-24 right-60 rotate-45' />
        <p className='fixed top-15 right-80 text-black font-bold'>
          ディレイ
        </p>
        <p className='fixed top-20 right-64 text-black font-bold text-xs'>
          （ONの時だけ操作可能）
        </p>
    </div>
  )
}

export default HelpModal
