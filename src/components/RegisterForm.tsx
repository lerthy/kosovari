import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUser } from '../lib/services/authService'
import toast from 'react-hot-toast'

export function RegisterForm() {
  const navigate = useNavigate() // Hook for programmatic navigation
  const [isLoading, setIsLoading] = useState(false) // State to handle loading UI
  const [secretKey, setSecretKey] = useState('') // State for institution secret key
  const [errorMsg, setErrorMsg] = useState('') // State for error messages

  // State to store user input from the form
  const [formData, setFormData] = useState({
    emri: '',
    email: '',
    password: '',
    roli: 'citizen' as 'citizen' | 'institution' // Default role is 'citizen'
  })

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form refresh
    setIsLoading(true) // Start loading state
    setErrorMsg('') // Reset error message

    // Secret key validation for institution
    if (formData.roli === 'institution') {
      if (!secretKey || secretKey !== 'çelsisekretperadmin') {
        setErrorMsg('Çelësi sekret është i pasaktë ose i zbrazët.')
        setIsLoading(false)
        toast.error('Çelësi sekret është i pasaktë ose i zbrazët.')
        return
      }
    }

    try {
      // Call the service to create the user
      await createUser({
        emri: formData.emri,
        email: formData.email,
        password_hash: formData.password, // Backend handles hashing
        roli: formData.roli,
        leveli: 0,
        pike_eksperience: 0
      })
      
      // Show success message and navigate to login page
      toast.success('Regjistrimi u krye me sukses!')
      navigate('/login')
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Gabim gjatë regjistrimit. Ju lutem provoni përsëri.')
    } finally {
      setIsLoading(false) // End loading state
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Regjistrohu</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Name Field */}
        <div>
          <label htmlFor="emri" className="block text-sm font-medium text-gray-700">
            Emri
          </label>
          <input
            type="text"
            id="emri"
            value={formData.emri}
            onChange={(e) => setFormData({ ...formData, emri: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Fjalëkalimi
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Role Selection Dropdown */}
        <div>
          <label htmlFor="roli" className="block text-sm font-medium text-gray-700">
            Roli
          </label>
          <select
            id="roli"
            value={formData.roli}
            onChange={(e) => {
              setFormData({ ...formData, roli: e.target.value as 'citizen' | 'institution' })
              setSecretKey('') // Reset secret key when role changes
              setErrorMsg('') // Reset error message when role changes
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="citizen">Qytetar</option>
            <option value="institution">Institucion</option>
          </select>
        </div>

        {/* Secret Key Field (only for institution) */}
        {formData.roli === 'institution' && (
          <div>
            <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
              Çelësi sekret për institucionin
            </label>
            <input
              type="password"
              id="secretKey"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="text-red-600 text-sm text-center">{errorMsg}</div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Duke u regjistruar...' : 'Regjistrohu'}
        </button>
      </form>
    </div>
  )
}
