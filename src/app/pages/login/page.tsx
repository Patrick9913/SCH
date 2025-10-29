'use client';

import { useAuthContext } from "@/app/context/authContext";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Swal from "sweetalert2";

const Login: React.FC = () => {

  const { login } = useAuthContext();
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      try {
        await login(email, password);
        Swal.fire({
          icon: "success",
          title: "Inicio de sesión exitoso",
          showConfirmButton: false,
          timer: 1500,
        });
        router.push("/");
      } catch (error) {
        console.error("Error al iniciar sesión: ", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Credenciales incorrectas",
        });
      }
    } else {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, complete todos los campos.",
      });
    }
  };

  return (
    <main className="min-h-screen h-screen w-screen relative overflow-hidden">
      {/* Video de fondo */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/fondo.mp4" type="video/mp4" />
        Tu navegador no soporta videos HTML5.
      </video>
      
      {/* Overlay oscuro para mejorar la legibilidad */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      
      {/* Contenido del formulario */}
      <div className="relative z-20 flex items-center justify-center h-full p-2">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-sm p-10">
          <h1 className="text-2xl text-center font-bold mb-6 text-gray-800">Iniciar Sesión</h1>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm text-gray-700">
                Correo Electrónico
                <span className="text-orange-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border shadow border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-gray-700">
                Contraseña
                <span className="text-orange-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border shadow border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className=" flex flex-col items-center gap-y-2">
              <a className=" text-sm underline underline-offset-2" href="#">¿Olvidaste tu Contraseña?</a>
              <a className=" text-sm underline underline-offset-2" href="#">Registrarse</a>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Login;
