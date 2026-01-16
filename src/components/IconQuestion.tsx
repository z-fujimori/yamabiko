
import { useUIStore } from '../store/uiStore'

const IconQuestion = () => {
  const openHelp = useUIStore((s) => s.openHelp)

  return (
    <div>
        <button
            aria-label="Open help"
            onClick={openHelp}
            className="
                fixed top-2 right-3
                w-7 h-7
                rounded-full
                border-2 border-gray-400
                text-sm font-semibold
                text-gray-400
                shadow-sm
                hover:bg-gray-100
                hover:border-gray-100
                hover:text-gray-700
                active:scale-95
                transition
            "
        >?</button>
    </div>
  )
}

export default IconQuestion