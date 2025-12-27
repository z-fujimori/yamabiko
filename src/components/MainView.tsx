import { SoundButton } from './MainButton'

const MainView = () => {
  return (
    <main className="container flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-xl font-bold mb-2">Welcome to yamabiko.app</h1>
      <SoundButton />
      <p className="text-sm mt-2">※ハウリング防止のためイヤホン推奨</p>
      
    </main>
  )
}

export default MainView