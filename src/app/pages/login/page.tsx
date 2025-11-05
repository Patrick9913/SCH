'use client';

import { useAuthContext } from "@/app/context/authContext";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Swal from "sweetalert2";
import { HiMail, HiLockClosed, HiExclamationCircle } from "react-icons/hi";

const Login: React.FC = () => {

  const { login } = useAuthContext();
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      try {
        setErrorMsg("");
        setIsLoading(true);
        await login(email, password);
        Swal.fire({
          icon: "success",
          title: "Inicio de sesión exitoso",
          showConfirmButton: false,
          timer: 1500,
        });
        router.push("/");
      } catch (error: any) {
        console.error("Error al iniciar sesión: ", error);
        if (error?.code === 'ALREADY_ONLINE' || error?.message === 'ALREADY_ONLINE') {
          setErrorMsg("Usted ya ha iniciado sesión en otro dispositivo. Cierre la sesión anterior para continuar.");
        } else {
          setErrorMsg("Credenciales incorrectas o cuenta no disponible.");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrorMsg("Por favor, complete todos los campos.");
    }
  };

  return (
    <main className="min-h-screen h-screen w-screen relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Video de fondo - Solo visible en desktop */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="hidden md:block absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videoFondo.mp4" type="video/mp4" />
        Tu navegador no soporta videos HTML5.
      </video>
      
      {/* Overlay oscuro para mejorar la legibilidad - Solo en desktop */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 z-10"></div>
      
      {/* Contenido del formulario */}
      <div className="relative z-20 flex items-center justify-center h-full md:p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-md p-6 sm:p-8 md:p-10 transform transition-all flex flex-col justify-center">
          
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bienvenido</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
            
            {/* Mensaje de error */}
            {errorMsg && (
              <div className="flex items-start gap-2 md:gap-3 text-red-700 text-xs sm:text-sm bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 animate-fade-in">
                <HiExclamationCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Campo Email */}
            <div className="space-y-1.5 md:space-y-2">
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiMail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5 md:space-y-2">
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiLockClosed className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Botón de Ingresar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>

            {/* Enlaces adicionales */}
            <div className="pt-3 md:pt-4 space-y-2 md:space-y-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <a 
                  href="#" 
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
                <span className="hidden sm:inline text-gray-400">•</span>
                <a 
                  href="#" 
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
                >
                  Registrarse
                </a>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-4 md:mt-6 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500">
              Al iniciar sesión, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
