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
    <main className="h-full w-full rounded bg-white flex items-center justify-center">
      <div className="p-10 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Iniciar Sesión</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Ingresar
          </button>
        </form>
      </div>
    </main>
  );
};

export default Login;
