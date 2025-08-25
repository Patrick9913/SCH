'use client';

import { Application } from "./Application";
import { useAuthContext } from "./context/authContext";
import Login from "./pages/login/page";

export default function Home() {

  const {uid} = useAuthContext();

  return (
    <>
      {
        uid ? (
          <Application />
        )
        : (
          <Login />
        )
      }
    </>
  )
}
