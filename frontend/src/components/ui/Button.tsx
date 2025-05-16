type ButtonProps = {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}

export const Button = ({ children, onClick, disabled, className }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-2 px-4 rounded-xl text-white font-semibold transition ${
        disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
      } ${className}`}
    >
      {children}
    </button>
  )
}
